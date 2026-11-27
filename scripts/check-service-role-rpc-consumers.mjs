#!/usr/bin/env node
/**
 * check-service-role-rpc-consumers.mjs
 * --------------------------------------------------------------
 * Gate estatico que cruza duas fontes que vivem separadas no repo:
 *
 *   1. `supabase/baseline/<versao>_baseline_schema.sql` — dump do schema
 *      vivo — de onde saem os GRANTs de EXECUTE por funcao;
 *   2. `src/**` — codigo React que roda no browser como `authenticated`
 *      (ou `anon`) — de onde saem os consumidores literais de RPC.
 *
 * Por que existe: uma funcao `public` com EXECUTE somente para
 * `service_role` e invisivel para quem esta logado. Se `src/` a chama, o
 * painel compila, a tela renderiza e o fluxo quebra em producao com
 * `permission denied for function ...` — foi exatamente o caso de
 * `fn_ai_quota_summary` (baseline :116233), que so tinha EXECUTE para
 * `service_role` e nunca podia ser lida pelo painel `/admin/consumo-ia`.
 * O contrato de catalogo de referencias nao pega isso: ele valida que a
 * RPC existe, nao quem pode executa-la.
 *
 * Nao conecta no Supabase: e estatico por natureza (o baseline e o dump do
 * schema) e `--require-live` nao muda isso.
 *
 * Uso:
 *   node scripts/check-service-role-rpc-consumers.mjs
 *   node scripts/check-service-role-rpc-consumers.mjs --orphans
 *   node scripts/check-service-role-rpc-consumers.mjs --baseline supabase/baseline/<v>_baseline_schema.sql
 *
 * Allowlist: `.security/service-role-rpc-consumers-allowlist.json`. Cada
 * entrada precisa de motivo e etapa de remocao; ela registra consumos
 * legitimamente `service_role` (ex.: canario que espera `permission denied`)
 * sem esconder consumo novo.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { CHECK_RESULT_STATUS, concludeCheck } from './check-result-contract.mjs';
import { collectProjectSupabaseReferences } from './check-supabase-reference-catalog.mjs';
import { findBaseline } from './drift-baseline.mjs';

const CHECK = 'service-role-rpc-consumers';
const ALLOWLIST_RELATIVE = join('.security', 'service-role-rpc-consumers-allowlist.json');
const SERVICE_ROLE = 'service_role';
const SRC_ROOT = 'src';

// `GRANT ALL ON FUNCTION "public"."f"("p" "uuid") TO "authenticated";`
// O dump escreve identificadores entre aspas, mas aceitamos sem aspas para
// nao depender do formato exato de cada geracao.
const GRANT_RE =
  /^(GRANT|REVOKE)\s+(?:ALL|EXECUTE)\s+ON\s+FUNCTION\s+"?([A-Za-z0-9_]+)"?\."?([A-Za-z0-9_]+)"?\s*\(([^)]*)\)\s+(TO|FROM)\s+"?([A-Za-z0-9_]+)"?\s*;$/i;

/**
 * Extrai `schema.funcao -> {roles, publicRevoked}` do dump do baseline.
 * `REVOKE ... FROM PUBLIC` e rastreado para relatorio: `EXECUTE` e concedido
 * a PUBLIC por padrao em funcao nova, entao a ausencia do revoke e sinal de
 * exposicao, nao de permissao restrita.
 */
export function parseFunctionGrants(sql) {
  const grants = new Map();
  for (const line of sql.split('\n')) {
    const match = GRANT_RE.exec(line.trim());
    if (!match) continue;
    const [, verb, schema, name, , direction, role] = match;
    const key = `${schema}.${name}`;
    if (!grants.has(key)) {
      grants.set(key, { schema, name, roles: new Set(), publicRevoked: false });
    }
    const entry = grants.get(key);
    if (verb.toUpperCase() === 'GRANT' && direction.toUpperCase() === 'TO') entry.roles.add(role);
    if (
      verb.toUpperCase() === 'REVOKE' &&
      direction.toUpperCase() === 'FROM' &&
      role === 'PUBLIC'
    ) {
      entry.publicRevoked = true;
    }
  }
  return grants;
}

/** Funcoes `public` cujo unico grant de EXECUTE e `service_role`. */
export function findServiceRoleOnlyFunctions(grants) {
  const result = new Map();
  for (const [key, entry] of grants) {
    if (entry.schema !== 'public') continue;
    if (entry.roles.size !== 1 || !entry.roles.has(SERVICE_ROLE)) continue;
    result.set(entry.name, { key, publicRevoked: entry.publicRevoked });
  }
  return result;
}

/** Consumidores literais de RPC em `src/`, agrupados por nome da funcao. */
export function collectSrcRpcConsumers({ root = process.cwd(), references } = {}) {
  const refs = references ?? collectProjectSupabaseReferences({ root, sourceRoots: [SRC_ROOT] });
  const consumers = new Map();
  for (const reference of refs) {
    if (reference.kind !== 'rpc') continue;
    if (reference.classification !== 'canonical') continue;
    if (typeof reference.name !== 'string' || reference.name.length === 0) continue;
    const file = String(reference.file).replaceAll('\\', '/');
    if (!file.startsWith(`${SRC_ROOT}/`)) continue;
    if (!consumers.has(reference.name)) consumers.set(reference.name, []);
    consumers.get(reference.name).push({ file, line: reference.line ?? null });
  }
  for (const list of consumers.values()) {
    list.sort((a, b) => `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`));
  }
  return consumers;
}

export function loadAllowlist(path) {
  if (!existsSync(path)) return { path, entries: [] };
  let document;
  try {
    document = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`${relative(process.cwd(), path)} ilegivel: ${error.message}`);
  }
  const entries = Array.isArray(document?.entries) ? document.entries : [];
  return { path, entries };
}

function allowlistKey(name, file) {
  return `${name}\u0000${file}`;
}

export function auditServiceRoleConsumers({
  root = process.cwd(),
  baselineFile,
  allowlistPath,
  references,
} = {}) {
  const baseline = baselineFile ? { file: resolve(root, baselineFile) } : findBaseline(root);
  if (!baseline || !existsSync(baseline.file)) {
    throw new Error(
      'baseline do schema nao encontrado (esperado supabase/baseline/<versao>_baseline_schema.sql)',
    );
  }
  const grants = parseFunctionGrants(readFileSync(baseline.file, 'utf8'));
  const serviceRoleOnly = findServiceRoleOnlyFunctions(grants);
  const consumers = collectSrcRpcConsumers({ root, references });
  const allowlist = loadAllowlist(allowlistPath ?? join(root, ALLOWLIST_RELATIVE));
  const allowed = new Set(allowlist.entries.map((entry) => allowlistKey(entry.name, entry.file)));

  const violations = [];
  const accepted = [];
  for (const [name, entries] of consumers) {
    if (!serviceRoleOnly.has(name)) continue;
    const byFile = new Map();
    for (const entry of entries) {
      if (!byFile.has(entry.file)) byFile.set(entry.file, []);
      byFile.get(entry.file).push(entry.line);
    }
    for (const [file, lines] of byFile) {
      const item = {
        name,
        file,
        lines: lines.filter((line) => line !== null),
        occurrences: lines.length,
      };
      if (allowed.has(allowlistKey(name, file))) accepted.push(item);
      else violations.push(item);
    }
  }
  const byLocation = (a, b) => `${a.name}:${a.file}`.localeCompare(`${b.name}:${b.file}`);
  violations.sort(byLocation);
  accepted.sort(byLocation);

  return {
    baselineFile: relative(root, baseline.file).replaceAll('\\', '/'),
    allowlistPath: relative(root, allowlist.path).replaceAll('\\', '/'),
    functionsWithGrants: grants.size,
    serviceRoleOnlyCount: serviceRoleOnly.size,
    consumersInSrc: consumers.size,
    violations,
    accepted,
    unusedAllowlistEntries: allowlist.entries
      .filter(
        (entry) => !accepted.some((item) => item.name === entry.name && item.file === entry.file),
      )
      .map((entry) => ({ name: entry.name, file: entry.file })),
    // Informativo: funcao service_role-only sem consumidor em `src/` nunca
    // podera ser lida pelo browser — util para achar o proximo objeto orfao.
    orphans: [...serviceRoleOnly.keys()].filter((name) => !consumers.has(name)).sort(),
  };
}

function conclude(status, summary, details = {}) {
  return concludeCheck({ check: CHECK, status, summary, details });
}

export function formatViolation(item) {
  const lines = item.lines.length ? `:${item.lines.join(',')}` : '';
  return `${item.name}  ${item.file}${lines}`;
}

export function main(argv = process.argv.slice(2)) {
  const showOrphans = argv.includes('--orphans');
  let baselineFile;
  let allowlistPath;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--baseline' && argv[index + 1]) baselineFile = argv[++index];
    if (argv[index] === '--allowlist' && argv[index + 1]) allowlistPath = argv[++index];
  }

  let audit;
  try {
    audit = auditServiceRoleConsumers({ baselineFile, allowlistPath });
  } catch (error) {
    return conclude(
      CHECK_RESULT_STATUS.INCONCLUSIVE,
      'Nao foi possivel ler o baseline do schema.',
      { reason: String(error?.message ?? error) },
    );
  }

  if (showOrphans) {
    console.log(
      `\nFuncoes public service_role-only sem consumidor em ${SRC_ROOT}/ (${audit.orphans.length}):`,
    );
    for (const name of audit.orphans) console.log(`  - ${name}`);
  }

  if (audit.violations.length) {
    console.error(
      `\n\u274c ${audit.violations.length} RPC service_role-only consumida por ${SRC_ROOT}/ (que roda como authenticated):`,
    );
    for (const item of audit.violations) console.error(`  ${formatViolation(item)}`);
    console.error(
      '\nCrie a RPC de leitura para `authenticated` (SECURITY DEFINER com guard is_admin_or_above) ' +
        'ou registre o consumo em .security/service-role-rpc-consumers-allowlist.json com motivo e etapa de remocao.\n',
    );
    return conclude(
      CHECK_RESULT_STATUS.FAILED,
      `${audit.violations.length} RPC service_role-only consumida em ${SRC_ROOT}/.`,
      { baseline: audit.baselineFile, violations: audit.violations },
    );
  }

  const summary =
    `${audit.serviceRoleOnlyCount} funcoes public service_role-only no baseline, ` +
    `${audit.consumersInSrc} RPCs consumidas em ${SRC_ROOT}/, ` +
    `0 consumo sem permissao (${audit.accepted.length} aceito(s) por allowlist).`;
  console.log(`\u2705 ${summary}`);
  return conclude(CHECK_RESULT_STATUS.PASSED, summary, {
    baseline: audit.baselineFile,
    serviceRoleOnly: audit.serviceRoleOnlyCount,
    consumersInSrc: audit.consumersInSrc,
    acceptedByAllowlist: audit.accepted,
    unusedAllowlistEntries: audit.unusedAllowlistEntries,
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}

export const SCRIPT_PATH = fileURLToPath(new URL(import.meta.url));
