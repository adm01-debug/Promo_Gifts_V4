#!/usr/bin/env node
/**
 * P200-E049 — valida que as tabelas com INSERT anônimo estejam protegidas
 * pelo trigger de rate guard. A validação live usa exclusivamente pg_catalog,
 * via Management API read-only (`supabase-read-only-query.mjs`).
 *
 * Em pull_request, uma ausência live só é aceita quando uma migration NOVA
 * neste PR cria exatamente o trigger/função esperados para aquela tabela.
 * Em push/main, schedule e dispatch, nenhuma ausência é tolerada.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  CHECK_RESULT_STATUS,
  concludeCheck,
  maskUrl,
  shouldRequireLive,
} from './check-result-contract.mjs';
import { querySupabaseReadOnly } from './supabase-read-only-query.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = join(ROOT, '.security/anon-insert-rate-guard-manifest.json');
const MIGRATIONS_DIR = join(ROOT, 'supabase/migrations');
const MANIFEST = loadManifest();

export const REQUIRED_TABLES = [
  'analytics_events',
  'catalog_analytics',
  'product_views',
  'search_analytics',
  'frontend_telemetry',
  'kill_switch_hits',
  'password_reset_requests',
].map((table) => ({
  schema_name: 'public',
  table_name: table,
  trigger_name: 'trg_anon_rate_guard',
  function_name: 'fn_anon_insert_rate_guard',
}));

const REQUIRED_TABLES_SQL = REQUIRED_TABLES
  .map((item) => `'${item.table_name}'`)
  .join(', ');

export const LIVE_SQL = `
  SELECT n.nspname AS schema_name,
         c.relname AS table_name,
         t.tgname AS trigger_name,
         p.proname AS function_name,
         t.tgenabled::text AS enabled
  FROM pg_catalog.pg_trigger AS t
  JOIN pg_catalog.pg_class AS c ON c.oid = t.tgrelid
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  JOIN pg_catalog.pg_proc AS p ON p.oid = t.tgfoid
  WHERE n.nspname = 'public'
    AND c.relname = ANY (ARRAY[${REQUIRED_TABLES_SQL}])
    AND NOT t.tgisinternal
  ORDER BY c.relname, t.tgname;
`.trim();

function loadManifest(path = MANIFEST_PATH) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export function validateManifest(manifest) {
  if (!manifest || !Array.isArray(manifest.tables)) {
    return ['manifest ausente ou inválido (esperado tables[])'];
  }

  const problems = [];
  const seen = new Set();
  for (const entry of manifest.tables) {
    if (!entry?.table_name || seen.has(entry.table_name)) {
      problems.push(`entrada inválida ou duplicada: ${entry?.table_name ?? '(sem tabela)'}`);
      continue;
    }
    seen.add(entry.table_name);
  }

  const expected = new Map(REQUIRED_TABLES.map((entry) => [entry.table_name, entry]));
  for (const [tableName, requirement] of expected) {
    const entry = manifest.tables.find((item) => item?.table_name === tableName);
    if (!entry) {
      problems.push(`tabela ${tableName} não documentada no manifest`);
      continue;
    }
    if (entry.schema_name !== requirement.schema_name) {
      problems.push(`${tableName}: schema_name deve ser ${requirement.schema_name}`);
    }
    if (entry.trigger_name !== requirement.trigger_name) {
      problems.push(`${tableName}: trigger_name deve ser ${requirement.trigger_name}`);
    }
    if (entry.function_name !== requirement.function_name) {
      problems.push(`${tableName}: function_name deve ser ${requirement.function_name}`);
    }
  }

  for (const tableName of seen) {
    if (!expected.has(tableName)) problems.push(`tabela inesperada no manifest: ${tableName}`);
  }
  return problems;
}

/** Uma trigger só cobre INSERTs normais quando está habilitada como O ou A. */
export function computeMissingGuards(liveTriggers, requiredTables = REQUIRED_TABLES) {
  return requiredTables.filter((required) => !liveTriggers.some((live) =>
    live.schema_name === required.schema_name &&
    live.table_name === required.table_name &&
    live.trigger_name === required.trigger_name &&
    live.function_name === required.function_name &&
    ['O', 'A'].includes(live.enabled),
  ));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function migrationCreatesGuard(sql, required) {
  const table = escapeRegExp(required.table_name);
  const trigger = escapeRegExp(required.trigger_name);
  const fn = escapeRegExp(required.function_name);
  const executable = sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const re = new RegExp(
    `CREATE\\s+TRIGGER\\s+${trigger}\\s+BEFORE\\s+INSERT\\s+ON\\s+${required.schema_name}\\.${table}\\b[^;]*?EXECUTE\\s+FUNCTION\\s+${required.schema_name}\\.${fn}\\s*\\(`,
    'i',
  );
  return re.test(executable);
}

function addedMigrationPaths(baseRef) {
  if (!baseRef || !existsSync(join(ROOT, '.git'))) return [];
  try {
    const output = execFileSync(
      'git',
      ['diff', '--name-only', '--diff-filter=A', `origin/${baseRef}...HEAD`, '--', 'supabase/migrations'],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return output.split('\n').map((line) => line.trim()).filter((line) => line.endsWith('.sql'));
  } catch {
    return [];
  }
}

export function findPlannedGuards({ root = ROOT, baseRef, eventName, missingTables }) {
  if (eventName !== 'pull_request' || !baseRef || missingTables.length === 0) return [];
  const addedPaths = new Set(addedMigrationPaths(baseRef));
  const result = [];
  for (const relativePath of addedPaths) {
    const absolutePath = join(root, relativePath);
    if (!existsSync(absolutePath)) continue;
    const sql = readFileSync(absolutePath, 'utf8');
    for (const missing of missingTables) {
      if (migrationCreatesGuard(sql, missing)) {
        result.push({ table_name: missing.table_name, migration: relativePath });
      }
    }
  }
  return result;
}

function readRowsFromFile(filePath) {
  const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
  return Array.isArray(parsed) ? parsed : parsed.triggers ?? [];
}

async function runCheck(argv = process.argv.slice(2), env = process.env) {
  const gateMode = argv.includes('--gate');
  const requireLive = gateMode || shouldRequireLive(argv, env);
  const fromFileArg = argv.find((arg) => arg.startsWith('--from-file='));
  const manifest = loadManifest();
  const manifestProblems = validateManifest(manifest);

  if (manifestProblems.length > 0) {
    return concludeCheck({
      check: 'anon-insert-rate-guard',
      status: CHECK_RESULT_STATUS.FAILED,
      summary: `manifest inválido: ${manifestProblems[0]}`,
      details: { manifestProblems },
    });
  }

  let liveRows;
  let source;
  let target;
  if (fromFileArg) {
    liveRows = readRowsFromFile(fromFileArg.slice('--from-file='.length));
    source = 'fixture';
  } else {
    const live = await querySupabaseReadOnly(LIVE_SQL);
    if (live.kind !== 'live') {
      return concludeCheck({
        check: 'anon-insert-rate-guard',
        status: requireLive ? CHECK_RESULT_STATUS.INCONCLUSIVE : CHECK_RESULT_STATUS.STATIC_PASS,
        summary: requireLive
          ? `não foi possível consultar pg_trigger ao vivo (${live.kind})`
          : `sem consulta ao vivo (${live.kind}); nenhum estado de trigger foi afirmado`,
        details: { reason: live.kind, maskedUrl: maskUrl(live.target) },
      });
    }
    liveRows = live.rows;
    source = live.source;
    target = maskUrl(live.target);
  }

  const missing = computeMissingGuards(liveRows);
  const planned = findPlannedGuards({
    baseRef: env.GITHUB_BASE_REF,
    eventName: env.GITHUB_EVENT_NAME,
    missingTables: missing,
  });
  const plannedTables = new Set(planned.map((item) => item.table_name));
  const unresolved = missing.filter((item) => !plannedTables.has(item.table_name));

  if (unresolved.length > 0) {
    return concludeCheck({
      check: 'anon-insert-rate-guard',
      status: CHECK_RESULT_STATUS.FAILED,
      summary: `rate guard ausente ou desabilitado em ${unresolved.map((item) => item.table_name).join(', ')}`,
      details: { source, maskedUrl: target, missing: unresolved, planned },
    });
  }

  return concludeCheck({
    check: 'anon-insert-rate-guard',
    status: CHECK_RESULT_STATUS.PASSED,
    summary: planned.length > 0
      ? `guards ativos; ${planned.length} ausência(s) live coberta(s) por migration nova do PR`
      : `rate guard ativo nas ${REQUIRED_TABLES.length} tabelas requeridas`,
    details: { source, maskedUrl: target, checked: REQUIRED_TABLES.length, planned },
  });
}

export { loadManifest, runCheck };

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runCheck().catch((error) => concludeCheck({
    check: 'anon-insert-rate-guard',
    status: CHECK_RESULT_STATUS.INCONCLUSIVE,
    summary: `erro inesperado na checagem (${error.message})`,
  }));
}
