#!/usr/bin/env node
/**
 * check-cron-drift — E037
 *
 * Compara o inventário de cron jobs (cron.job) ao vivo contra o snapshot em
 * supabase/baseline/<B>_cron_jobs.json. Falha se um job foi criado ou
 * removido sem migration correspondente.
 *
 * Uso:
 *   node scripts/check-cron-drift.mjs [--baseline <path>]
 *
 * Variáveis de ambiente:
 *   DATABASE_URL  — string de conexão Postgres (requerida para consulta live)
 *   SUPABASE_PROJECT_REF, SUPABASE_DB_PASSWORD — alternativa ao DATABASE_URL
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const BASELINE_DIR = 'supabase/baseline';

function findLatestCronSnapshot() {
  const files = readdirSync(BASELINE_DIR)
    .filter((f) => /^\d{14}_cron_jobs\.json$/.test(f))
    .sort();
  if (!files.length) return null;
  return join(BASELINE_DIR, files[files.length - 1]);
}

function getDbConnection() {
  if (process.env.DATABASE_URL) {
    return { args: ['--dbname', process.env.DATABASE_URL], env: process.env };
  }
  const ref = process.env.SUPABASE_PROJECT_REF;
  const pw = process.env.SUPABASE_DB_PASSWORD;
  if (ref && pw) {
    return {
      args: [],
      env: {
        ...process.env,
        PGHOST: `db.${ref}.supabase.co`,
        PGPORT: '5432',
        PGDATABASE: 'postgres',
        PGUSER: 'postgres',
        PGPASSWORD: pw,
      },
    };
  }
  return null;
}

function queryLiveCronJobs(connection) {
  let out;
  try {
    out = execFileSync(
      'psql',
      [
        ...connection.args,
        '-t',
        '-A',
        '-c',
        "SELECT COALESCE(json_agg(t ORDER BY t.jobname),'[]'::json) FROM (SELECT jobname,schedule,active FROM cron.job) t;",
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: connection.env },
    );
  } catch (e) {
    // cron schema ausente — extensão pg_cron não instalada; retorna vazio
    if (e.stderr && (e.stderr.includes('does not exist') || e.stderr.includes('schema "cron"'))) {
      return [];
    }
    throw e;
  }
  return JSON.parse(out.trim() || '[]');
}

const snapshotPath = findLatestCronSnapshot();
if (!snapshotPath) {
  console.error('Snapshot versionado de cron jobs ausente — gate fail-closed.');
  process.exit(1);
}

const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
const connection = getDbConnection();

if (!connection) {
  console.error(
    'DATABASE_URL ou SUPABASE_PROJECT_REF+SUPABASE_DB_PASSWORD ausentes — não é permitido pular validação live.',
  );
  process.exit(1);
}

let live;
try {
  live = queryLiveCronJobs(connection);
} catch (e) {
  console.error(`Falha ao consultar cron.job: ${e.message}`);
  process.exit(1);
}

const snapshotNames = new Set(snapshot.map((r) => r.jobname));
const liveNames = new Set(live.map((r) => r.jobname));

const added = [...liveNames].filter((n) => !snapshotNames.has(n));
const removed = [...snapshotNames].filter((n) => !liveNames.has(n));
const liveByName = new Map(live.map((row) => [row.jobname, row]));
const changed = snapshot.filter((expected) => {
  const actual = liveByName.get(expected.jobname);
  return actual && (actual.schedule !== expected.schedule || actual.active !== expected.active);
});

if (added.length === 0 && removed.length === 0 && changed.length === 0) {
  console.log(
    `✅ Cron jobs: sem drift (${live.length} jobs, snapshot ${snapshotPath.split('/').pop()}).`,
  );
  process.exit(0);
}

console.error('\n❌ Drift de cron jobs detectado:');
for (const n of added) console.error(`  + ADICIONADO sem migration: ${n}`);
for (const n of removed) console.error(`  - REMOVIDO sem migration: ${n}`);
for (const expected of changed) {
  const actual = liveByName.get(expected.jobname);
  console.error(
    `  ~ ALTERADO sem snapshot: ${expected.jobname} ` +
      `(esperado schedule=${JSON.stringify(expected.schedule)}, active=${expected.active}; ` +
      `live schedule=${JSON.stringify(actual.schedule)}, active=${actual.active})`,
  );
}
console.error('\nCrie uma migration espelho ou adicione ao drift-allowlist com justificativa.');
process.exit(1);
