import { readFileSync, readdirSync, statSync } from 'fs';
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

const migrationFiles = MIGRATIONS_DIRS.flatMap(walkSql);
const migrationViolations = [];

for (const f of migrationFiles) {
  const raw = readFileSync(f, 'utf-8');
  const code = stripSqlComments(raw);
  if (code.includes(FORBIDDEN_ID)) {
    migrationViolations.push(f.replace(ROOT + '/', ''));
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
