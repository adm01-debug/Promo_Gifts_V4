#!/usr/bin/env node
/**
 * check-event-triggers-drift — E036
 *
 * Compara o inventário de event triggers ao vivo contra o snapshot em
 * supabase/baseline/<B>_event_triggers.json. Falha se um event trigger
 * foi criado ou removido sem migration correspondente.
 *
 * Uso:
 *   node scripts/check-event-triggers-drift.mjs [--baseline <path>]
 *
 * Variáveis de ambiente:
 *   DATABASE_URL  — string de conexão Postgres (requerida para consulta live)
 *   SUPABASE_PROJECT_REF, SUPABASE_DB_PASSWORD — alternativa ao DATABASE_URL
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const BASELINE_DIR = 'supabase/baseline';

function findLatestEventTriggerSnapshot() {
  const files = readdirSync(BASELINE_DIR)
    .filter((f) => /^\d{14}_event_triggers\.json$/.test(f))
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

function queryLiveEventTriggers(connection) {
  const sql = `SELECT evtname, evtevent, evtenabled, evtfoid::regproc::text AS evtfunc
               FROM pg_event_trigger ORDER BY evtname;`;
  const out = execFileSync('psql', [...connection.args, '-t', '-A', '-F', '|', '-c', sql], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: connection.env,
  });
  return out
    .split('\n')
    .filter(Boolean)
    .map((row) => {
      const [evtname, evtevent, evtenabled, evtfunc] = row.split('|');
      return { evtname, evtevent, evtenabled, evtfunc };
    });
}

const snapshotPath = findLatestEventTriggerSnapshot();
if (!snapshotPath) {
  console.error('Snapshot versionado de event triggers ausente — gate fail-closed.');
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
  live = queryLiveEventTriggers(connection);
} catch (e) {
  console.error(`Falha ao consultar pg_event_trigger: ${e.message}`);
  process.exit(1);
}

const snapshotNames = new Set(snapshot.map((r) => r.evtname));
const liveNames = new Set(live.map((r) => r.evtname));

const added = [...liveNames].filter((n) => !snapshotNames.has(n));
const removed = [...snapshotNames].filter((n) => !liveNames.has(n));
const liveByName = new Map(live.map((row) => [row.evtname, row]));
const changed = snapshot.filter((expected) => {
  const actual = liveByName.get(expected.evtname);
  return (
    actual &&
    (actual.evtevent !== expected.evtevent ||
      actual.evtenabled !== expected.evtenabled ||
      actual.evtfunc !== expected.evtfunc)
  );
});

if (added.length === 0 && removed.length === 0 && changed.length === 0) {
  console.log(
    `✅ Event triggers: sem drift (${live.length} triggers, snapshot ${snapshotPath.split('/').pop()}).`,
  );
  process.exit(0);
}

console.error('\n❌ Drift de event triggers detectado:');
for (const n of added) console.error(`  + ADICIONADO sem migration: ${n}`);
for (const n of removed) console.error(`  - REMOVIDO sem migration: ${n}`);
for (const expected of changed) {
  console.error(
    `  ~ ALTERADO sem snapshot: ${expected.evtname} ` +
      `(esperado ${expected.evtevent}/${expected.evtenabled}/${expected.evtfunc}; ` +
      `live ${liveByName.get(expected.evtname).evtevent}/${liveByName.get(expected.evtname).evtenabled}/${liveByName.get(expected.evtname).evtfunc})`,
  );
}
console.error('\nCrie uma migration espelho ou adicione ao drift-allowlist com justificativa.');
process.exit(1);
