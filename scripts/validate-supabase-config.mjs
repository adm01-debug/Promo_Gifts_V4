import { readFileSync, readdirSync, statSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const CLIENT_PATH = join(ROOT, 'src/integrations/supabase/client.ts');
// SSOT: projeto Gold/Medallion de produ\u00E7\u00E3o (doufsxqlfjyuvxuezpln).
// pqpdolkaeqlyzpdpbizo \u00E9 o projeto Lovable Cloud sem cat\u00E1logo \u2014 proibido em produ\u00E7\u00E3o.
const CANONICAL_PROJECT_ID = 'doufsxqlfjyuvxuezpln';
const CANONICAL_URL = `https://${CANONICAL_PROJECT_ID}.supabase.co`;

console.log('\u{1F680} Validating Supabase Project Connection Configuration...');

try {
  const content = readFileSync(CLIENT_PATH, 'utf-8');

  // 1. Check if the canonical project ID constant matches
  const hasProjectId = content.includes(`const CURRENT_PROJECT_ID = "doufsxqlfjyuvxuezpln"`) || content.includes(`const CURRENT_PROJECT_ID = 'doufsxqlfjyuvxuezpln'`);
  if (!hasProjectId) {
    console.error(`\u274C ERROR: Project ID "${CANONICAL_PROJECT_ID}" not found as CURRENT_PROJECT_ID in ${CLIENT_PATH}.`);
    process.exit(1);
  }

  // 2. Check for boot validation logic
  const hasValidationLogic = content.includes('validateEnv') && content.includes('CURRENT_PROJECT_ID');
  if (!hasValidationLogic) {
    console.error(`\u274C ERROR: Boot validation logic for "${CANONICAL_PROJECT_ID}" not found in ${CLIENT_PATH}`);
    process.exit(1);
  }

  // 3. Ensure the old Lovable Cloud project is not used as a fallback in executable code.
  // Strip standalone comment lines (lines whose first non-whitespace chars are //) so that
  // historical incident notes don't trip the guard.  We intentionally do NOT strip inline
  // end-of-line comments (e.g. "value; // note") nor URL slashes ("https://...") — both
  // are correctly handled by anchoring to the start of the line.
  const codeOnly = content.replace(/^[ \t]*\/\/.*$/gm, '');
  const hasForbiddenRefs = codeOnly.includes('pqpdolkaeqlyzpdpbizo');
  if (hasForbiddenRefs) {
    console.error(`\u274C ERROR: Lovable Cloud project (pqpdolkaeqlyzpdpbizo) found in executable code in ${CLIENT_PATH}. Use ${CANONICAL_PROJECT_ID}.`);
    process.exit(1);
  }

  console.log('\u2705 Supabase connection is correctly pointing to the current project.');
} catch (error) {
  console.error('\u274C Failed to validate Supabase configuration:', error.message);
  process.exit(1);
}

// \u2500\u2500 E064: varrer supabase/migrations/** em busca do project-ref proibido \u2500\u2500\u2500\u2500\u2500
const FORBIDDEN_ID = 'pqpdolkaeqlyzpdpbizo';
const MIGRATIONS_DIRS = [
  join(ROOT, 'supabase', 'migrations'),
  join(ROOT, 'supabase', 'migrations-snapshot'),
];

function stripSqlComments(sql) {
  // Remove single-line SQL comments (-- ...) and C-style block comments (/* ... */)
  return sql
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

function walkSql(dir) {
  let files = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isFile() && entry.endsWith('.sql')) files.push(full);
    }
  } catch {
    // directory may not exist
  }
  return files;
}

// Migrations já aplicadas em produção são imutáveis (E184): o ref legado
// nelas é registro histórico do que rodou — não pode ser editado nem
// "substituído pelo canônico". A isenção é fixada por hash do conteúdo
// aprovado: qualquer edição posterior no arquivo sai da allowlist e
// volta a ser varrida — impedir refs legadas NOVAS entrando disfarçadas
// num nome isento. Qualquer NOVA migration que referencie o projeto
// proibido segue flagrada.
const LEGACY_APPLIED_MIGRATION_HASHES = new Map([
  ['supabase/migrations/20260514112149_edge_function_secrets_callers_hardening.sql',
    'bdd80a18a5c68fec108c7548c6a9f05b28a157776d9f121c9f62c0b7ffcdf8ce'],
  ['supabase/migrations/20260522151608_fase_4_gate_ci_drift_check_sql_native.sql',
    '15037e7fab2c2a0ffa1312c104b42374cd8aeccb4bdc37025bf891e922cb8fdc'],
  ['supabase/migrations/20260522160000_align_wave_3_5_5_drift_allowlist.sql',
    'fee80e90450256188574c38a1b33a0d9ae87e15754033c8dd9e01674a7fa1b6c'],
  ['supabase/migrations/20260525113000_runtime_edge_function_base_url.sql',
    'c3e35ed0f33f5cb5702bc5e4e8903be27e513f593f0965bd781e010a927dcfc1'],
  ['supabase/migrations/20260601140100_fix_cron_connections_auto_test_hardcode_url.sql',
    'fdfb537e7f8f5ebf2177eac8a51e7c98c3cafcf9b8e908ee79b5e133bd05b830'],
  ['supabase/migrations/20260602020000_fix_hardcoded_api_key_cron.sql',
    'c01f2bf94c386559749c9ca52ed265097ce9d1614d8119d77991c587fc19fd26'],
]);

// ALL_IN_ONE.sql é artefato REGENERADO a partir das migrations
// (export-schema-snapshot.mjs → buildAllInOne) — o conteúdo muda a cada
// regen, então não dá pra fixar hash. Fica isento por nome; a garantia
// real está nas migrations-fonte pinadas acima.
const LEGACY_GENERATED_SNAPSHOT = 'supabase/migrations-snapshot/ALL_IN_ONE.sql';

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

const migrationFiles = MIGRATIONS_DIRS.flatMap(walkSql);
const migrationViolations = [];

for (const f of migrationFiles) {
  const rel = f.replace(ROOT + '/', '');
  if (rel === LEGACY_GENERATED_SNAPSHOT) continue;
  const raw = readFileSync(f, 'utf-8');
  if (LEGACY_APPLIED_MIGRATION_HASHES.get(rel) === sha256(raw)) continue;
  const code = stripSqlComments(raw);
  if (code.includes(FORBIDDEN_ID)) {
    migrationViolations.push(rel);
  }
}

if (migrationViolations.length > 0) {
  console.error(
    `\u274C E064: project-ref proibido (${FORBIDDEN_ID}) em SQL execut\u00E1vel em ${migrationViolations.length} arquivo(s):\n` +
    migrationViolations.map((f) => `   - ${f}`).join('\n') +
    '\nSubstitua pelo can\u00F4nico: doufsxqlfjyuvxuezpln',
  );
  process.exit(1);
}

console.log(`\u2705 E064: ${migrationFiles.length} arquivo(s) de migration sem refer\u00EAncia execut\u00E1vel ao project-ref proibido.`);
