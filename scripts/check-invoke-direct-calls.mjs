#!/usr/bin/env node
/**
 * check-invoke-direct-calls — Onda 18 gate.
 *
 * Bane novas chamadas diretas a `supabase.functions.invoke` (ou variantes
 * dinâmicas) fora do SSOT `invokeEdgeSafe` (`src/lib/edge/safeInvokeCall.ts`).
 *
 * - Varre `src/**\/*.{ts,tsx}` exceto testes/e2e/próprio SSOT.
 * - Ignora comentários (linha e bloco) e string literals contendo o padrão.
 * - Baseline congelada em `.invoke-direct-baseline.json` (chaves `file:line`).
 * - Regressão (call site novo fora da baseline) → exit 1.
 * - Legados migrados (baseline entry sem match atual) → warning; falha só se
 *   STRICT_BASELINE=1.
 * - `UPDATE_BASELINE=1` regenera o arquivo.
 *
 * Uso:
 *   node scripts/check-invoke-direct-calls.mjs
 *   UPDATE_BASELINE=1 node scripts/check-invoke-direct-calls.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'node:fs';
import ts from 'typescript';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const BASELINE_PATH = resolve(ROOT, '.invoke-direct-baseline.json');

const SSOT_FILE = 'src/lib/edge/safeInvokeCall.ts';
const IGNORE_PATTERNS = [/(^|[\\/])__tests__[\\/]/, /\.test\.(t|j)sx?$/, /(^|[\\/])e2e[\\/]/];

function isFunctionsAccess(node) {
  if (ts.isPropertyAccessExpression(node)) {
    return node.name.text === 'functions';
  }
  if (!ts.isElementAccessExpression(node)) return false;
  const key = node.argumentExpression;
  return (
    (ts.isStringLiteral(key) || ts.isNoSubstitutionTemplateLiteral(key)) && key.text === 'functions'
  );
}

function isDirectInvokeCall(node) {
  if (!ts.isCallExpression(node)) return false;
  const invoke = node.expression;
  return (
    ts.isPropertyAccessExpression(invoke) &&
    invoke.name.text === 'invoke' &&
    isFunctionsAccess(invoke.expression)
  );
}

function shouldIgnore(relPath) {
  const p = relPath.split(sep).join('/');
  if (p === SSOT_FILE) return true;
  return IGNORE_PATTERNS.some((re) => re.test(p));
}

function scanFile(absPath) {
  const rel = relative(ROOT, absPath).split(sep).join('/');
  if (shouldIgnore(rel)) return [];
  let src;
  try {
    src = readFileSync(absPath, 'utf8');
  } catch {
    return [];
  }
  if (!src.includes('.invoke')) return [];
  const sourceFile = ts.createSourceFile(
    rel,
    src,
    ts.ScriptTarget.Latest,
    true,
    rel.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const hits = [];
  const visit = (node) => {
    if (isDirectInvokeCall(node)) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      hits.push({ file: rel, line: line + 1 });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return hits;
}

function collect() {
  const files = globSync('src/**/*.{ts,tsx}', { cwd: ROOT, absolute: true });
  const hits = [];
  for (const f of files) {
    hits.push(...scanFile(f));
  }
  // dedupe file:line
  const seen = new Set();
  const uniq = [];
  for (const h of hits) {
    const k = `${h.file}:${h.line}`;
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(h);
  }
  uniq.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  return uniq;
}

function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) return null;
  try {
    const raw = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
    return new Set(raw.entries || []);
  } catch {
    return null;
  }
}

function writeBaseline(hits) {
  const payload = {
    generated_at: new Date().toISOString(),
    note:
      'Snapshot congelado de call sites diretos a supabase.functions.invoke. ' +
      'Novos call sites DEVEM usar invokeEdgeSafe (src/lib/edge/safeInvokeCall.ts). ' +
      'Regenerar com UPDATE_BASELINE=1 após migração legítima.',
    total: hits.length,
    entries: hits.map((h) => `${h.file}:${h.line}`),
  };
  writeFileSync(BASELINE_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

function main() {
  const hits = collect();
  const update = process.env.UPDATE_BASELINE === '1';
  const strict = process.env.STRICT_BASELINE === '1';

  // GUARD: baseline ausente não é recriada em silêncio (apagar o arquivo zerava o gate).
  if (!update && !existsSync(BASELINE_PATH)) {
    console.error(
      `❌ baseline ausente: ${BASELINE_PATH}. Recrie com UPDATE_BASELINE=1 node scripts/check-invoke-direct-calls.mjs`,
    );
    process.exit(2);
  }

  if (update) {
    writeBaseline(hits);
    console.log(
      `✅ invoke-direct baseline ${update ? 'atualizada' : 'criada'}: ${hits.length} call sites em ${BASELINE_PATH}`,
    );
    return;
  }

  const baseline = loadBaseline();
  if (!baseline) {
    console.error('❌ Baseline corrompida — rode UPDATE_BASELINE=1 para regenerar.');
    process.exit(2);
  }

  const current = new Set(hits.map((h) => `${h.file}:${h.line}`));
  const added = [...current].filter((k) => !baseline.has(k)).sort();
  const removed = [...baseline].filter((k) => !current.has(k)).sort();

  if (added.length === 0 && removed.length === 0) {
    console.log(`✅ invoke-direct gate: ${current.size} call sites (baseline intacta).`);
    return;
  }

  if (removed.length > 0) {
    console.log(
      `⚠️  ${removed.length} entrada(s) da baseline não foram encontradas (migração legítima?):`,
    );
    for (const r of removed.slice(0, 20)) console.log(`   - ${r}`);
    if (removed.length > 20) console.log(`   ... +${removed.length - 20}`);
    console.log(
      '   Rode `UPDATE_BASELINE=1 node scripts/check-invoke-direct-calls.mjs` para consolidar.',
    );
  }

  if (added.length > 0) {
    console.error(
      `❌ ${added.length} NOVA(S) chamada(s) direta(s) a supabase.functions.invoke detectada(s):`,
    );
    for (const a of added) console.error(`   + ${a}`);
    console.error(
      '\n→ Use `invokeEdgeSafe(<fn>, { body, op })` de `@/lib/edge/safeInvokeCall`.\n' +
        '→ Guia: docs/observability/invoke-safe-migration.md',
    );
    process.exit(1);
  }

  if (strict && removed.length > 0) {
    console.error('❌ STRICT_BASELINE=1: baseline contém entradas mortas.');
    process.exit(1);
  }
}

main();
