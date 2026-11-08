#!/usr/bin/env node
/**
 * check-anon-insert-rate-guard.mjs (P200-E049)
 *
 * Confere, por consulta somente leitura a pg_catalog, se cada tabela com
 * INSERT anônimo real tem um trigger INSERT habilitado que chama a função de
 * rate guard registrada no manifest.
 *
 * `--gate` exige evidência live: sem SUPABASE_ACCESS_TOKEN e
 * SUPABASE_PROJECT_REF, o resultado é inconclusivo (exit 2), nunca um falso
 * passe estático.
 *
 * Exit codes: 0 (passed), 1 (trigger/tabela ausente ou manifest inválido),
 * 2 (consulta inconclusiva/erro).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { CHECK_RESULT_STATUS, concludeCheck } from './check-result-contract.mjs';
import { querySupabaseReadOnly } from './supabase-read-only-query.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, '.security/anon-insert-rate-guard-manifest.json');

// Apenas estes destinos, revisados em P200-E049, entram na query SQL.
export const REQUIRED_TABLES = [
  { table: 'analytics_events', trigger_name: 'fn_anon_insert_rate_guard' },
  { table: 'catalog_analytics', trigger_name: 'fn_anon_insert_rate_guard' },
  { table: 'product_views', trigger_name: 'fn_anon_insert_rate_guard' },
  { table: 'search_analytics', trigger_name: 'fn_anon_insert_rate_guard' },
  { table: 'frontend_telemetry', trigger_name: 'fn_anon_insert_rate_guard' },
  { table: 'kill_switch_hits', trigger_name: 'fn_anon_insert_rate_guard' },
  { table: 'password_reset_requests', trigger_name: 'fn_anon_insert_rate_guard' },
];

export function loadManifest(manifestPath = MANIFEST_PATH) {
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export function validateManifest(manifest) {
  if (!manifest || !Array.isArray(manifest.tables)) {
    return ['manifest ausente ou inválido (sem campo tables[])'];
  }

  const problems = [];
  const entries = manifest.tables;
  const byTable = new Map();

  for (const entry of entries) {
    if (!entry || typeof entry.table !== 'string' || !entry.table.trim()) {
      problems.push('manifest contém entrada sem nome de tabela válido');
      continue;
    }
    if (byTable.has(entry.table)) problems.push(`tabela ${entry.table} duplicada no manifest`);
    byTable.set(entry.table, entry);
  }

  for (const required of REQUIRED_TABLES) {
    const entry = byTable.get(required.table);
    if (!entry) {
      problems.push(`tabela ${required.table} não documentada no manifest`);
      continue;
    }
    if (entry.trigger_name !== required.trigger_name) {
      problems.push(`${required.table}: trigger_name esperado ${required.trigger_name}`);
    }
  }

  const unexpected = [...byTable.keys()].filter(
    (table) => !REQUIRED_TABLES.some((required) => required.table === table),
  );
  for (const table of unexpected) problems.push(`tabela inesperada ${table} no manifest`);

  return problems;
}

function sqlLiteral(value) {
  // Os valores vêm da constante REQUIRED_TABLES, mas mantemos escape explícito.
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function buildTriggerQuery(tables = REQUIRED_TABLES) {
  const values = tables
    .map((entry) => `(${sqlLiteral(entry.table)}, ${sqlLiteral(entry.trigger_name)})`)
    .join(',\n      ');

  return `WITH expected(table_name, expected_function) AS (
    VALUES ${values}
  )
  SELECT
    e.table_name,
    (c.oid IS NOT NULL) AS table_exists,
    tr.tgname AS trigger_name,
    p.proname AS function_name,
    pn.nspname AS function_schema,
    tr.tgenabled AS trigger_enabled,
    (tr.tgtype & 4) = 4 AS handles_insert
  FROM expected e
  LEFT JOIN pg_namespace n ON n.nspname = 'public'
  LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = e.table_name AND c.relkind IN ('r', 'p')
  LEFT JOIN LATERAL (
    SELECT t.tgname, t.tgenabled, t.tgtype, t.tgfoid
    FROM pg_trigger t
    WHERE t.tgrelid = c.oid
      AND NOT t.tgisinternal
    ORDER BY t.tgname
  ) tr ON true
  LEFT JOIN pg_proc p ON p.oid = tr.tgfoid
  LEFT JOIN pg_namespace pn ON pn.oid = p.pronamespace
  ORDER BY e.table_name;`;
}

export function evaluateTriggerRows(rows, tables = REQUIRED_TABLES) {
  if (!Array.isArray(rows)) {
    return { problems: ['resposta live inválida (esperado um array de linhas)'], checked: 0 };
  }

  const byTable = new Map();
  for (const row of rows) {
    if (row && typeof row.table_name === 'string') {
      const current = byTable.get(row.table_name) ?? [];
      current.push(row);
      byTable.set(row.table_name, current);
    }
  }

  const problems = [];
  for (const expected of tables) {
    const candidates = byTable.get(expected.table) ?? [];
    const row = candidates.find((candidate) => candidate.table_exists === true);
    if (!row) {
      problems.push(`${expected.table}: tabela ausente no schema public`);
      continue;
    }

    const valid = candidates.some(
      (candidate) =>
        candidate.table_exists === true &&
        candidate.function_name === expected.trigger_name &&
        candidate.function_schema === 'public' &&
        ['O', 'A'].includes(candidate.trigger_enabled) &&
        candidate.handles_insert === true,
    );
    if (!valid) {
      problems.push(`${expected.table}: sem trigger INSERT habilitado que execute ${expected.trigger_name}`);
    }
  }

  return { problems, checked: tables.length };
}

export async function run({ argv = process.argv.slice(2) } = {}) {
  const manifest = loadManifest();
  const manifestProblems = validateManifest(manifest);
  if (manifestProblems.length) {
    return concludeCheck({
      check: 'anon-insert-rate-guard',
      status: CHECK_RESULT_STATUS.FAILED,
      summary: `manifest inválido: ${manifestProblems[0]}`,
      details: { problems: manifestProblems },
    });
  }

  const result = await querySupabaseReadOnly(buildTriggerQuery());

  if (result.kind !== 'live') {
    const reason = result.kind === 'missing-config'
      ? 'SUPABASE_ACCESS_TOKEN e SUPABASE_PROJECT_REF ausentes'
      : `consulta read-only não concluída (${result.kind}${result.httpStatus ? `, HTTP ${result.httpStatus}` : ''})`;
    return concludeCheck({
      check: 'anon-insert-rate-guard',
      status: CHECK_RESULT_STATUS.INCONCLUSIVE,
      summary: `${reason}; nenhuma afirmação de cobertura foi feita`,
      details: { reason: result.kind, requireLive: argv.includes('--gate') || argv.includes('--require-live') },
    });
  }

  const evaluation = evaluateTriggerRows(result.rows);
  if (evaluation.problems.length) {
    return concludeCheck({
      check: 'anon-insert-rate-guard',
      status: CHECK_RESULT_STATUS.FAILED,
      summary: evaluation.problems[0],
      details: { source: result.source, problems: evaluation.problems, checked: evaluation.checked },
    });
  }

  return concludeCheck({
    check: 'anon-insert-rate-guard',
    status: CHECK_RESULT_STATUS.PASSED,
    summary: `${evaluation.checked} tabelas verificadas em pg_catalog: trigger INSERT ativo chama fn_anon_insert_rate_guard`,
    details: { source: result.source, checked: evaluation.checked },
  });
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  run().catch((error) => {
    process.stderr.write(`[rate-guard] erro inesperado: ${error.message}\n`);
    process.exit(2);
  });
}
