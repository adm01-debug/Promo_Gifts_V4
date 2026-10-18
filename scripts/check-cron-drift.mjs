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
import { execSync } from 'node:child_process';
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

function getDbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const ref = process.env.SUPABASE_PROJECT_REF;
  const pw = process.env.SUPABASE_DB_PASSWORD;
  if (ref && pw) return `postgresql://postgres:${pw}@db.${ref}.supabase.co:5432/postgres`;
  return null;
}

function queryLiveCronJobs(dbUrl) {
  let out;
  try {
    out = execSync(
      `psql "${dbUrl}" -t -A -c "SELECT COALESCE(json_agg(t ORDER BY t.jobname),'[]'::json) FROM (SELECT jobid::text,jobname,schedule,command,active FROM cron.job) t;"`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
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
  console.log('::notice::Sem snapshot de cron jobs — bootstrap, passando.');
  process.exit(0);
}

const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
const dbUrl = getDbUrl();

if (!dbUrl) {
  console.error('DATABASE_URL ou SUPABASE_PROJECT_REF+SUPABASE_DB_PASSWORD ausentes — não é permitido pular validação live.');
  process.exit(1);
}

let live;
try {
  live = queryLiveCronJobs(dbUrl);
} catch (e) {
  console.error(`Falha ao consultar cron.job: ${e.message}`);
  process.exit(1);
}

const snapshotNames = new Set(snapshot.map((r) => r.jobname));
const liveNames = new Set(live.map((r) => r.jobname));

const added = [...liveNames].filter((n) => !snapshotNames.has(n));
const removed = [...snapshotNames].filter((n) => !liveNames.has(n));

if (added.length === 0 && removed.length === 0) {
  console.log(`✅ Cron jobs: sem drift (${live.length} jobs, snapshot ${snapshotPath.split('/').pop()}).`);
  process.exit(0);
}

console.error('\n❌ Drift de cron jobs detectado:');
for (const n of added) console.error(`  + ADICIONADO sem migration: ${n}`);
for (const n of removed) console.error(`  - REMOVIDO sem migration: ${n}`);
console.error('\nCrie uma migration espelho ou adicione ao drift-allowlist com justificativa.');
process.exit(1);
