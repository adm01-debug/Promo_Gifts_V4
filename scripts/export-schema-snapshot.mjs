#!/usr/bin/env node
/**
 * export-schema-snapshot.mjs
 *
 * Exporta um snapshot consolidado do schema do projeto Supabase canônico
 * (`doufsxqlfjyuvxuezpln`) para auditoria, e regenera também o
 * `ALL_IN_ONE.sql` concatenando as migrations versionadas.
 *
 * Saídas em `supabase/migrations-snapshot/`:
 *   - ALL_IN_ONE.sql             — concatenação alfabética de supabase/migrations/**
 *   - SCHEMA_LIVE.sql            — dump do schema do projeto linkado
 *                                  (via `supabase db dump --linked`, todos os schemas da aplicação)
 *   - SNAPSHOT_META.json         — metadados (timestamp, contagens, project ref)
 * E em `supabase/baseline/` o baseline do db-schema-drift-check (ver
 * scripts/drift-baseline.mjs). O drift em si é calculado pelo
 * db-schema-drift-check; o antigo SCHEMA_DRIFT.sql é removido.
 *
 * IMPORTANTE:
 *   - Nada aqui aplica DDL. É read-only.
 *   - Live/Drift dependem do CLI do Supabase (`supabase`) linkado ao projeto.
 *     Aceita link local canônico já autenticado ou credenciais de link em CI.
 *   - O drift só é calculado se o ledger local/remoto estiver alinhado.
 *
 * Uso local:
 *   node scripts/export-schema-snapshot.mjs
 *
 * Uso em CI (com secrets):
 *   SUPABASE_ACCESS_TOKEN=... SUPABASE_DB_PASSWORD=... \
 *     node scripts/export-schema-snapshot.mjs
 */

import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseSupabaseMigrationLedgerOutput } from './check-supabase-migration-ledger.mjs';
import {
  appliedVersionsFromLedger,
  BASELINE_DIR,
  BASELINE_NAME_RE,
  buildBaselineSql,
  byCodeUnit,
  findSecrets,
  ledgerSnapshotName,
  maxNumericVersion,
} from './drift-baseline.mjs';

const ROOT = process.cwd();
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');
const OUT_DIR = join(ROOT, 'supabase', 'migrations-snapshot');
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'doufsxqlfjyuvxuezpln';

const RESET = '\x1b[0m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';

const log = (msg) => console.log(`${CYAN}[schema-snapshot]${RESET} ${msg}`);
const warn = (msg) => console.warn(`${YELLOW}[schema-snapshot][warn]${RESET} ${msg}`);
const ok = (msg) => console.log(`${GREEN}[schema-snapshot][ok]${RESET} ${msg}`);
const err = (msg) => console.error(`${RED}[schema-snapshot][err]${RESET} ${msg}`);

function ensureOutDir() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
}

function hasSupabaseCli() {
  const r = spawnSync('supabase', ['--version'], { encoding: 'utf8' });
  return r.status === 0;
}

function tryLink() {
  if (!process.env.SUPABASE_ACCESS_TOKEN || !process.env.SUPABASE_DB_PASSWORD) {
    const linkedRefPath = join(ROOT, 'supabase', '.temp', 'project-ref');
    if (existsSync(linkedRefPath) && readFileSync(linkedRefPath, 'utf8').trim() === PROJECT_REF) {
      log(`Usando link local existente para ${PROJECT_REF}.`);
      return true;
    }
    warn('Credenciais de link ausentes e link local canônico não encontrado — pulando live/drift.');
    return false;
  }
  try {
    execSync(
      `supabase link --project-ref ${PROJECT_REF} -p "$SUPABASE_DB_PASSWORD"`,
      { stdio: 'inherit', shell: '/bin/bash' },
    );
    return true;
  } catch (e) {
    err(`Falha ao linkar projeto ${PROJECT_REF}: ${e.message}`);
    return false;
  }
}

function buildAllInOne() {
  log('Concatenando migrations versionadas → ALL_IN_ONE.sql');
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const outPath = join(OUT_DIR, 'ALL_IN_ONE.sql');
  const header = [
    '-- ==============================================================',
    '-- ALL_IN_ONE.sql — snapshot concatenado de supabase/migrations/',
    `-- Gerado em: ${new Date().toISOString()}`,
    `-- Total de arquivos: ${files.length}`,
    '-- Ordem: alfabética (mesmo critério do Supabase CLI)',
    '-- Uso: APENAS auditoria/leitura. NÃO aplicar direto no banco.',
    '-- SSOT continua sendo os arquivos individuais em supabase/migrations/.',
    '-- ==============================================================',
    '',
  ].join('\n');
  const chunks = [header];
  for (const f of files) {
    chunks.push(`\n-- >>> BEGIN ${f} >>>`);
    chunks.push(readFileSync(join(MIGRATIONS_DIR, f), 'utf8'));
    chunks.push(`-- <<< END ${f} <<<`);
  }
  writeFileSync(outPath, chunks.join('\n'));
  ok(`ALL_IN_ONE.sql gerado (${files.length} migrations).`);
  return { count: files.length, path: outPath };
}

function readLedger() {
  try {
    const output = execSync('supabase migration list --linked --output-format json', {
      encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    });
    return parseSupabaseMigrationLedgerOutput(output);
  } catch (error) {
    err(`Ledger remoto indisponível: ${error.message}`);
    return null;
  }
}

// Um único `supabase db dump --linked` (sem --schema): todos os schemas da
// aplicação (public, analytics, internal, cf_recon, prod_audit,
// supplier_stricker, classification_audit…) e os CREATE EXTENSION — public
// sozinho não reconstrói o banco (views de public dependem de analytics e
// vice-versa). Alimenta SCHEMA_LIVE.sql e o baseline do drift-check.
function dumpLiveSchema(ledger) {
  log('Exportando schema vivo (supabase db dump --linked)');
  // Sem shell; stderr do CLI (progresso) descartado para não entrar no dump.
  const r = spawnSync('supabase', ['db', 'dump', '--linked'], {
    encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'],
  });
  if (r.error || r.status !== 0) {
    err(`Falha ao dumpar schema vivo: ${r.error?.message ?? `exit ${r.status}`}`);
    return { ok: false };
  }
  const sql = r.stdout;
  // O dump leva minutos: migration aplicada no meio entraria no schema mas
  // não na lista de versões, e o drift-check a replayaria em cima dela.
  const after = readLedger();
  const before = appliedVersionsFromLedger(ledger).sort(byCodeUnit).join(',');
  if (!after || appliedVersionsFromLedger(after).sort(byCodeUnit).join(',') !== before) {
    err('Ledger mudou (ou ficou ilegível) durante o dump — nada gravado; rode de novo.');
    return { ok: false };
  }
  const generatedAt = new Date().toISOString();
  const secrets = findSecrets(sql);
  if (secrets.length) {
    err(`Possível segredo no dump (${secrets.map((h) => `${h.kind}@linha ${h.line}`).join(', ')}) — nada gravado.`);
    return { ok: false, secrets };
  }
  writeFileSync(join(OUT_DIR, 'SCHEMA_LIVE.sql'), [
    '-- ==============================================================',
    '-- SCHEMA_LIVE.sql — dump do schema do projeto canônico',
    `-- Projeto: ${PROJECT_REF}`,
    `-- Gerado em: ${generatedAt}`,
    '-- Fonte: supabase db dump --linked',
    '-- ==============================================================',
    '',
  ].join('\n') + sql);
  ok('SCHEMA_LIVE.sql gerado.');
  // SCHEMA_DRIFT.sql nunca foi calculável pelo replay do histórico; o drift
  // agora sai do db-schema-drift-check (baseline + replay).
  rmSync(join(OUT_DIR, 'SCHEMA_DRIFT.sql'), { force: true });

  const versions = appliedVersionsFromLedger(ledger);
  const version = maxNumericVersion(versions);
  if (!version) {
    err('Ledger sem versões numéricas — baseline não gerado.');
    return { ok: false };
  }
  const dir = join(ROOT, BASELINE_DIR);
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir)) {
    if (BASELINE_NAME_RE.test(f) || /^\d{14}_ledger_versions\.json$/.test(f)) rmSync(join(dir, f));
  }
  writeFileSync(
    join(dir, `${version}_baseline_schema.sql`),
    buildBaselineSql({ dump: sql, version, projectRef: PROJECT_REF, generatedAt }),
  );
  writeFileSync(
    join(dir, ledgerSnapshotName(version)),
    `${JSON.stringify({ baseline_version: version, generated_at: generatedAt, versions: [...versions].sort(byCodeUnit) }, null, 2)}\n`,
  );
  ok(`Baseline ${version} gerado (${versions.length} versões no ledger).`);
  return { ok: true, bytes: sql.length, baselineVersion: version, ledgerVersions: versions.length };
}

function writeMeta(meta) {
  const outPath = join(OUT_DIR, 'SNAPSHOT_META.json');
  writeFileSync(outPath, JSON.stringify(meta, null, 2) + '\n');
  ok(`SNAPSHOT_META.json gerado.`);
}

function main() {
  ensureOutDir();
  const allInOne = buildAllInOne();

  const meta = {
    generated_at: new Date().toISOString(),
    project_ref: PROJECT_REF,
    migrations_count: allInOne.count,
    live_schema: null,
    drift: null,
  };

  if (!hasSupabaseCli()) {
    warn('CLI `supabase` não encontrado — pulando SCHEMA_LIVE.sql e o baseline.');
    writeMeta(meta);
    return;
  }
  // Com credenciais (CI em schedule/dispatch) falha de ledger ou dump é erro.
  // Sem elas, um link local sem `supabase login` só pula o dump — como em PR
  // e push, onde as credenciais não são entregues ao job.
  const strict = Boolean(process.env.SUPABASE_ACCESS_TOKEN);
  if (!tryLink()) {
    writeMeta(meta);
    if (strict) process.exitCode = 1;
    return;
  }

  const ledger = readLedger();
  if (!ledger) {
    writeMeta(meta);
    if (strict) process.exitCode = 1;
    return;
  }
  const live = dumpLiveSchema(ledger);
  if (live.ok) {
    meta.live_schema = { bytes: live.bytes };
    meta.baseline = { version: live.baselineVersion, ledger_versions: live.ledgerVersions };
  } else if (strict) {
    process.exitCode = 1;
  }
  meta.drift = 'calculado por .github/workflows/db-schema-drift-check.yml a partir do baseline';

  meta.generated_at = new Date().toISOString();
  writeMeta(meta);
}

try {
  main();
} catch (e) {
  err(e.stack || e.message);
  process.exit(1);
}
