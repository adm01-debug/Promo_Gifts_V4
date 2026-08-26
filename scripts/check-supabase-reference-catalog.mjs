#!/usr/bin/env node
/**
 * check-supabase-reference-catalog.mjs
 *
 * Contract gate for literal Supabase relation/RPC references used by runtime
 * code. It deliberately complements — it does not replace —
 * `lint-untyped-from.sh`:
 *
 * - AST parsing prevents comments, examples and `Array.from()` from becoming
 *   database references;
 * - `supabase.storage.from()` is classified as Storage, not a PostgREST
 *   relation;
 * - known external clients (CRM / Promobrind) are classified separately;
 * - wrappers (`untypedFrom`, `goldFrom`, `dbInvoke`, `untypedRpc`, `callRpc`)
 *   are inspected at their literal call sites;
 * - existing unresolved calls and dynamic dispatch are frozen explicitly in
 *   the temporary catalog, so a new occurrence cannot pass silently.
 *
 * The catalog is a data-free `pg_catalog` snapshot. It is intentionally
 * temporary until stage 067 promotes the same contract to the canonical
 * schema snapshot process. This script never connects to Supabase.
 *
 * Usage:
 *   node scripts/check-supabase-reference-catalog.mjs
 *   node scripts/check-supabase-reference-catalog.mjs --json
 *   node scripts/check-supabase-reference-catalog.mjs --catalog path/to.json
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const ROOT = process.cwd();
const DEFAULT_CATALOG_PATH = join(ROOT, 'audit', 'supabase-reference-catalog.temporary.json');
const SOURCE_ROOTS = ['src', 'supabase/functions'];
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const IGNORED_PATH_PARTS = new Set(['node_modules', 'dist', 'build', 'coverage', '.git']);
const NON_DATABASE_FROM_RECEIVERS = new Set([
  'Array',
  'Buffer',
  'Object',
  'Set',
  'Map',
  'WeakMap',
  'WeakSet',
  'Uint8Array',
  'Uint16Array',
  'Uint32Array',
  'Int8Array',
  'Int16Array',
  'Int32Array',
]);
const PLACEHOLDER_RE = /^(?:\.\.\.|fn|fn_my_rpc|my_table|table_name)$/i;
const WRAPPER_KINDS = new Map([
  ['untypedFrom', 'relation'],
  ['goldFrom', 'relation'],
  ['dbInvoke', 'relation'],
  ['restNativeInvoke', 'relation'],
  ['untypedRpc', 'rpc'],
  ['callRpc', 'rpc'],
]);
const GENERIC_WRAPPER_IMPLEMENTATION_FILES = new Set([
  'src/integrations/supabase/gold.ts',
  'src/lib/db/postgrest.ts',
  'src/lib/external-db/rest-native.ts',
  'src/lib/external-db/rpc-native.ts',
  'src/lib/supabase-untyped.ts',
  'src/lib/supabase/rest-client.ts',
]);
// These names are intentionally narrow. A receiver is never considered
// external merely because it happens to be called `crm` or `client`: the
// source must show a known external factory or external credential origin.
const EXTERNAL_CLIENT_FACTORY_NAMES = new Set([
  'getCrmClient',
  'buildCrmClient',
  'getExternalClient',
]);
const EXTERNAL_CREDENTIAL_FACTORY_NAMES = new Set(['getCrmCreds']);
const EXTERNAL_CREDENTIAL_TOKEN_RE = /(?:EXTERNAL_|CRM_|PROMOBRIND|externalUrl|externalKey|CRM_URL|CRM_KEY|EXT_URL|EXT_KEY)/i;

function normalizePath(file) {
  return file.replaceAll('\\', '/');
}

function sourceLineAndColumn(sourceFile, node) {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return { line: position.line + 1, column: position.character + 1 };
}

function literalText(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

function rootIdentifier(node) {
  let current = node;
  while (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
    current = current.expression;
  }
  return ts.isIdentifier(current) ? current.text : null;
}

function hasPlaceholderAnnotation(sourceFile, node) {
  const leading = sourceFile.text.slice(node.getFullStart(), node.getStart(sourceFile));
  return /@supabase-reference-placeholder\b/.test(leading);
}

function objectPropertyLiteral(call, propertyName) {
  const first = call.arguments[0];
  if (!first || !ts.isObjectLiteralExpression(first)) return null;
  for (const property of first.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = property.name;
    const key = ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : null;
    if (key === propertyName) return literalText(property.initializer);
  }
  return null;
}

function calledIdentifier(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return null;
}

function containsCallTo(node, names) {
  let found = false;
  const visit = (candidate) => {
    if (found) return;
    if (ts.isCallExpression(candidate) && names.has(calledIdentifier(candidate.expression))) {
      found = true;
      return;
    }
    ts.forEachChild(candidate, visit);
  };
  visit(node);
  return found;
}

function collectBindingIdentifiers(name, identifiers) {
  if (ts.isIdentifier(name)) {
    identifiers.add(name.text);
    return;
  }
  if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
    for (const element of name.elements) {
      if (ts.isBindingElement(element)) collectBindingIdentifiers(element.name, identifiers);
    }
  }
}

function expressionUsesBindings(node, bindings) {
  let found = false;
  const visit = (candidate) => {
    if (found) return;
    if (ts.isIdentifier(candidate) && bindings.has(candidate.text)) {
      found = true;
      return;
    }
    ts.forEachChild(candidate, visit);
  };
  visit(node);
  return found;
}

function isExternalCreateClientCall(sourceFile, node, externalCredentialBindings) {
  if (!ts.isCallExpression(node) || calledIdentifier(node.expression) !== 'createClient') return false;
  const initializerText = node.getText(sourceFile);
  return EXTERNAL_CREDENTIAL_TOKEN_RE.test(initializerText) ||
    expressionUsesBindings(node, externalCredentialBindings);
}

function collectReceiverBindings(sourceFile) {
  const external = new Set();
  const storage = new Set();
  const externalCredentialBindings = new Set();

  // First collect destructured credentials. In quote-sync, for example,
  // `crmUrl`/`crmKey` come from `getCrmCreds()` before they create `crm`.
  const collectCredentials = (node) => {
    if (ts.isVariableDeclaration(node) && node.initializer &&
      containsCallTo(node.initializer, EXTERNAL_CREDENTIAL_FACTORY_NAMES)) {
      collectBindingIdentifiers(node.name, externalCredentialBindings);
    }
    ts.forEachChild(node, collectCredentials);
  };
  collectCredentials(sourceFile);

  const collectReceivers = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const identifier = node.name.text;
      const initializer = node.initializer;
      const initializerText = initializer.getText(sourceFile);
      if (/\.storage\b/.test(initializerText)) storage.add(identifier);
      if (
        containsCallTo(initializer, EXTERNAL_CLIENT_FACTORY_NAMES) ||
        isExternalCreateClientCall(sourceFile, initializer, externalCredentialBindings)
      ) {
        external.add(identifier);
      }
    }
    ts.forEachChild(node, collectReceivers);
  };
  collectReceivers(sourceFile);
  return { external, storage, externalCredentialBindings };
}

function isExternalReceiver(sourceFile, receiver, bindings) {
  const root = rootIdentifier(receiver);
  if (root && bindings.external.has(root)) return true;
  return containsCallTo(receiver, EXTERNAL_CLIENT_FACTORY_NAMES) ||
    isExternalCreateClientCall(sourceFile, receiver, bindings.externalCredentialBindings);
}

function classifyReceiver(sourceFile, receiver, bindings) {
  const normalized = receiver.getText().replace(/\s+/g, '');
  const root = rootIdentifier(receiver);
  if (/\.storage(?:\.|$)/.test(normalized) || (root && bindings.storage.has(root))) {
    return 'storage';
  }
  if (isExternalReceiver(sourceFile, receiver, bindings)) {
    return 'external';
  }
  if (root && NON_DATABASE_FROM_RECEIVERS.has(root)) return 'non_database';
  return 'canonical';
}

function makeReference({ sourceFile, call, kind, name, classification, receiver, form }) {
  const { line, column } = sourceLineAndColumn(sourceFile, call);
  return {
    kind,
    name,
    classification,
    receiver,
    form,
    file: normalizePath(sourceFile.fileName),
    line,
    column,
  };
}

/**
 * Extracts literal and dynamic references from one executable source file.
 * File is deliberately a caller-supplied logical path, so unit tests do not
 * depend on an on-disk project tree.
 */
export function scanSupabaseReferences(source, file = 'src/example.ts') {
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') || file.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const refs = [];
  const bindings = collectReceiverBindings(sourceFile);

  const add = ({ call, kind, name, classification, receiver, form }) => {
    const isPlaceholder = hasPlaceholderAnnotation(sourceFile, call) ||
      (typeof name === 'string' && PLACEHOLDER_RE.test(name));
    refs.push(
      makeReference({
        sourceFile,
        call,
        kind,
        name,
        classification: isPlaceholder ? 'placeholder' : classification,
        receiver,
        form,
      }),
    );
  };

  const visit = (node) => {
    if (!ts.isCallExpression(node)) {
      ts.forEachChild(node, visit);
      return;
    }

    const expression = node.expression;
    if (ts.isPropertyAccessExpression(expression) && (expression.name.text === 'from' || expression.name.text === 'rpc')) {
      const kind = expression.name.text === 'from' ? 'relation' : 'rpc';
      const receiver = expression.expression.getText(sourceFile);
      const dynamicWrapperImplementation = literalText(node.arguments[0]) === null &&
        GENERIC_WRAPPER_IMPLEMENTATION_FILES.has(normalizePath(file));
      const classification = dynamicWrapperImplementation
        ? 'wrapper_implementation'
        : classifyReceiver(sourceFile, expression.expression, bindings);
      add({
        call: node,
        kind,
        name: literalText(node.arguments[0]),
        classification,
        receiver,
        form: 'direct',
      });
    } else if (ts.isIdentifier(expression) && WRAPPER_KINDS.has(expression.text)) {
      const kind = WRAPPER_KINDS.get(expression.text);
      const name = expression.text === 'dbInvoke' || expression.text === 'restNativeInvoke'
        ? objectPropertyLiteral(node, 'table')
        : literalText(node.arguments[0]);
      add({
        call: node,
        kind,
        name,
        classification: 'canonical',
        receiver: expression.text,
        form: 'wrapper',
      });
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return refs;
}

function shouldScanFile(relativePath) {
  const normalized = normalizePath(relativePath);
  if (!SOURCE_EXTENSIONS.has(extname(normalized))) return false;
  if (/(?:^|\/)(?:__tests__|tests?)(?:\/|$)/.test(normalized)) return false;
  if (/(?:^|[._-])(?:test|spec)(?:[._-]|$)/.test(normalized)) return false;
  return true;
}

function walkSourceFiles(root, dir, files) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_PATH_PARTS.has(entry.name) || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSourceFiles(root, full, files);
      continue;
    }
    const relativePath = normalizePath(relative(root, full));
    if (entry.isFile() && shouldScanFile(relativePath)) files.push({ full, relativePath });
  }
}

export function collectProjectSupabaseReferences({ root = ROOT, sourceRoots = SOURCE_ROOTS } = {}) {
  const files = [];
  for (const sourceRoot of sourceRoots) walkSourceFiles(root, join(root, sourceRoot), files);
  const refs = [];
  for (const { full, relativePath } of files.sort((a, b) => a.relativePath.localeCompare(b.relativePath))) {
    refs.push(...scanSupabaseReferences(readFileSync(full, 'utf8'), relativePath));
  }
  return refs.sort((a, b) =>
    `${a.file}:${a.line}:${a.column}`.localeCompare(`${b.file}:${b.line}:${b.column}`),
  );
}

function countByKey(items, keyOf) {
  const counts = new Map();
  for (const item of items) {
    const key = keyOf(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function normalizeCatalog(catalog) {
  return {
    relations: new Set(catalog?.relations ?? []),
    rpcs: new Set(catalog?.rpcs ?? []),
    relationAliases: new Map(Object.entries(catalog?.relation_aliases ?? {})),
    exceptions: catalog?.exceptions ?? [],
    dynamic_baseline: catalog?.dynamic_baseline ?? [],
  };
}

function exceptionBudget(exceptions, reference) {
  return exceptions
    .filter((entry) => entry.kind === reference.kind && entry.name === reference.name && entry.file === reference.file)
    .reduce((total, entry) => total + Number(entry.occurrences ?? 0), 0);
}

function dynamicBudget(dynamicBaseline, reference) {
  return dynamicBaseline
    .filter((entry) => entry.kind === reference.kind && entry.file === reference.file &&
      (!entry.receiver || entry.receiver === reference.receiver))
    .reduce((total, entry) => total + Number(entry.occurrences ?? 0), 0);
}

function isDocumentedAlias(reference, catalog) {
  if (reference.kind !== 'relation') return false;
  const alias = catalog.relationAliases.get(reference.name);
  if (!alias || !catalog.relations.has(alias.target)) return false;
  if (alias.forms && !alias.forms.includes(reference.form)) return false;
  if (alias.receivers && !alias.receivers.includes(reference.receiver)) return false;
  return true;
}

/**
 * Compares scanned references with a catalog. Existing unknown references are
 * only tolerated through an occurrence-counted, source-scoped exception.
 */
export function auditSupabaseReferences(references, catalog) {
  const normalizedCatalog = normalizeCatalog(catalog);
  const actionable = references.filter((reference) => reference.classification === 'canonical');
  const literal = actionable.filter((reference) => reference.name !== null);
  const dynamic = actionable.filter((reference) => reference.name === null);
  const literalSeen = new Map();
  const dynamicSeen = new Map();
  const errors = [];
  const acknowledged = [];

  for (const reference of literal) {
    const available = reference.kind === 'relation'
      ? normalizedCatalog.relations.has(reference.name)
      : normalizedCatalog.rpcs.has(reference.name);
    if (available) continue;
    if (isDocumentedAlias(reference, normalizedCatalog)) {
      acknowledged.push({ ...reference, reason: 'documented_alias' });
      continue;
    }
    const budget = exceptionBudget(normalizedCatalog.exceptions, reference);
    const key = `${reference.kind}|${reference.name}|${reference.file}`;
    const occurrence = (literalSeen.get(key) ?? 0) + 1;
    literalSeen.set(key, occurrence);
    if (budget >= occurrence) {
      acknowledged.push({ ...reference, reason: 'known_exception' });
    } else {
      errors.push({ ...reference, reason: 'missing_catalog_object' });
    }
  }

  for (const reference of dynamic) {
    const budget = dynamicBudget(normalizedCatalog.dynamic_baseline, reference);
    const key = `${reference.kind}|${reference.receiver}|${reference.file}`;
    const occurrence = (dynamicSeen.get(key) ?? 0) + 1;
    dynamicSeen.set(key, occurrence);
    if (budget >= occurrence) {
      acknowledged.push({ ...reference, reason: 'known_dynamic_dispatch' });
    } else {
      errors.push({ ...reference, reason: 'new_dynamic_dispatch' });
    }
  }

  const ignored = references.filter((reference) => reference.classification !== 'canonical');
  return {
    ok: errors.length === 0,
    errors,
    acknowledged,
    ignored,
    summary: {
      scanned: references.length,
      canonical_literals: literal.length,
      canonical_dynamic: dynamic.length,
      ignored: ignored.length,
      errors: errors.length,
    },
  };
}

export function loadReferenceCatalog(catalogPath = DEFAULT_CATALOG_PATH) {
  if (!existsSync(catalogPath)) {
    throw new Error(`Catálogo Supabase ausente: ${catalogPath}`);
  }
  return JSON.parse(readFileSync(catalogPath, 'utf8'));
}

function formatReference(reference) {
  const target = reference.name ?? `<dinâmico via ${reference.receiver}>`;
  return `${reference.file}:${reference.line}:${reference.column} → ${reference.kind} ${target}`;
}

export function runCli({ root = ROOT, catalogPath = DEFAULT_CATALOG_PATH, json = false } = {}) {
  const catalog = loadReferenceCatalog(catalogPath);
  const references = collectProjectSupabaseReferences({ root });
  const audit = auditSupabaseReferences(references, catalog);

  if (json) {
    console.log(JSON.stringify({ references, audit }, null, 2));
    return audit;
  }

  console.log('Supabase reference catalog contract');
  console.log(
    `  ${audit.summary.canonical_literals} literal(is) canônico(s) · ` +
      `${audit.summary.canonical_dynamic} despacho(s) dinâmico(s) · ` +
      `${audit.summary.ignored} classificado(s) fora do PostgREST canônico`,
  );
  if (audit.acknowledged.length) {
    console.warn(`⚠️ ${audit.acknowledged.length} ocorrência(s) legada(s) reconhecida(s) pelo catálogo temporário.`);
  }
  if (audit.errors.length) {
    console.error(`\n❌ ${audit.errors.length} referência(s) Supabase não coberta(s) pelo catálogo:`);
    for (const error of audit.errors) console.error(`  ${formatReference(error)} [${error.reason}]`);
    console.error(
      '\nAtualize o catálogo somente após confirmar o objeto com pg_catalog ou registrar uma exceção ' +
        'source-scoped, com motivo e etapa de remoção. Storage, clientes externos e placeholders ' +
        'anotados não devem ser incluídos como relações PostgREST.\n',
    );
  } else {
    console.log('✅ Nenhuma referência canônica nova ou despacho dinâmico novo passou sem contrato.');
  }
  return audit;
}

function parseCliArgs(args) {
  let catalogPath = DEFAULT_CATALOG_PATH;
  let json = false;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--json') json = true;
    if (args[index] === '--catalog') {
      const next = args[index + 1];
      if (!next) throw new Error('--catalog exige um caminho.');
      catalogPath = resolve(ROOT, next);
      index += 1;
    }
  }
  return { catalogPath, json };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { catalogPath, json } = parseCliArgs(process.argv.slice(2));
    const audit = runCli({ catalogPath, json });
    if (!audit.ok) process.exitCode = 1;
  } catch (error) {
    console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  }
}
