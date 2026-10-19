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
// Prefixo do ID — pega o ref montado por concatenação de literais
// ('pqpdolkaeqlyzpd' || 'pbizo'), que nunca aparece como literal inteiro.
// Evasão residual (chr()/format()/reverse) fica fora do escopo do gate.
const FORBIDDEN_FRAGMENT = 'pqpdolkae';
const MIGRATIONS_DIRS = [
  join(ROOT, 'supabase', 'migrations'),
  join(ROOT, 'supabase', 'migrations-snapshot'),
];

// Lexer SQL single-pass: devolve a visão "código" — comentários removidos,
// conteúdo de strings/identificadores/dollar-quoting preservado (ref dentro
// de literal é uso executável e DEVE flagrar). Substituir sequencialmente
// `--` e depois `/* */` truncava a linha quando `--` aparecia dentro de
// string ('a--b'), de block comment (/* -- */) ou de dollar-quote
// ($$a--b$$), deixando o ref "vivo" depois do corte.
function stripSqlComments(sql) {
  let out = '';
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i];
    if (c === '-' && sql[i + 1] === '-') {
      while (i < n && sql[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && sql[i + 1] === '*') {
      // Postgres permite block comments ANINHADOS — depth, não primeiro */.
      let depth = 1;
      i += 2;
      while (i < n && depth > 0) {
        if (sql[i] === '/' && sql[i + 1] === '*') { depth++; i += 2; continue; }
        if (sql[i] === '*' && sql[i + 1] === '/') { depth--; i += 2; continue; }
        i++;
      }
      continue;
    }
    if (c === "'") {
      out += c;
      i++;
      while (i < n) {
        out += sql[i];
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") { out += "'"; i += 2; continue; }
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (c === '"') {
      out += c;
      i++;
      while (i < n) {
        out += sql[i];
        if (sql[i] === '"') { i++; break; }
        i++;
      }
      continue;
    }
    if (c === '$') {
      const tag = /^\$[A-Za-z_0-9]*\$/.exec(sql.slice(i))?.[0];
      if (tag) {
        const end = sql.indexOf(tag, i + tag.length);
        if (end === -1) { out += sql.slice(i); break; }
        // Corpo $tag$ é código (função PL/pgSQL, comando de cron) — comentários
        // dentro dele também não são executáveis: strip recursivo. O corpo não
        // pode conter a própria tag, então `end` é sempre o fechamento real.
        out += tag + stripSqlComments(sql.slice(i + tag.length, end)) + tag;
        i = end + tag.length;
        continue;
      }
    }
    out += c;
    i++;
  }
  return out;
}

function walkSql(dir) {
  let files = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) files = files.concat(walkSql(full));
      else if (st.isFile() && entry.toLowerCase().endsWith('.sql')) files.push(full);
    }
  } catch {
    // directory may not exist
  }
  return files;
}

// ALL_IN_ONE.sql é artefato REGENERADO a partir das migrations
// (export-schema-snapshot.mjs → buildAllInOne) — o conteúdo muda a cada
// regen, então fica isento por nome; a garantia real está na varredura das
// migrations-fonte. Nenhuma migration aplicada guarda o ref em código
// executável hoje (F6 de #2228 saneou todas), então não há allowlist:
// qualquer ref novo em posição executável é flagrado.
const LEGACY_GENERATED_SNAPSHOT = 'supabase/migrations-snapshot/ALL_IN_ONE.sql';

const migrationFiles = MIGRATIONS_DIRS.flatMap(walkSql);
const migrationViolations = [];

for (const f of migrationFiles) {
  const rel = f.replace(ROOT + '/', '');
  if (rel === LEGACY_GENERATED_SNAPSHOT) continue;
  const code = stripSqlComments(readFileSync(f, 'utf-8'));
  if (code.includes(FORBIDDEN_ID) || code.includes(FORBIDDEN_FRAGMENT)) {
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
