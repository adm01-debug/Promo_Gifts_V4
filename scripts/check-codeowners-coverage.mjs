#!/usr/bin/env node
/**
 * check-codeowners-coverage.mjs
 *
 * E72 (PLANO_WORKFLOWS_CI_V2_100_ETAPAS_2026-10-14.md):
 * Lista os "arquivos de gate" do repositório que não têm dono em
 * .github/CODEOWNERS. Um arquivo de gate é qualquer arquivo que, se
 * alterado sem revisão, pode silenciosamente degradar segurança, CI ou
 * governança do projeto.
 *
 * Uso:
 *   node scripts/check-codeowners-coverage.mjs          # relato completo
 *   node scripts/check-codeowners-coverage.mjs --gate   # exit 1 se > 0 descobertos
 *
 * 2026-10-18: versão inicial (E72).
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, relative } from 'path';

const REPO_ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const CODEOWNERS_PATH = resolve(REPO_ROOT, '.github/CODEOWNERS');

const isGate = process.argv.includes('--gate');
const isJson = process.argv.includes('--json');

const GATE_FILES = [
  '.github/workflows/deploy-gates.yml',
  '.github/required-checks.json',
  '.github/CODEOWNERS',
  '.github/dependabot.yml',
  'package.json',
  'package-lock.json',
  '.nvmrc',
  'playwright.config.ts',
  'vitest.config.ts',
  '.lighthouserc.json',
  '.gitleaks.toml',
  'src/integrations/supabase/client.ts',
  'scripts/validate-supabase-config.mjs',
  '.tsc-ratchet-baseline',
  'bundle-size-baseline.json',
  '.migration-refs-baseline.json',
  '.todo-baseline.json',
  '.audit-credentials-baseline.json',
  '.as-assertions-baseline.json',
  '.any-type-baseline.json',
  '.invoke-direct-baseline.json',
  '.outline-none-baseline.json',
  '.security/supabase-linter-baseline.json',
  'docs/TYPES_INVENTORY_REMOVAL_ALLOWLIST.json',
  'supabase/MIGRATIONS_SYNC_LOG.md',
  'docs/db/POLITICA_DDL.md',
  'docs/ci/SEGREDOS.md',
];

function parseCodowners(path) {
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, 'utf8').split('\n');
  const patterns = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 1) patterns.push(parts[0]);
  }
  return patterns;
}

function globToRegex(glob) {
  const p = glob.replace(/\/$/, '');
  const hasSlash = p.includes('/');
  let regexStr = '';
  let i = 0;
  while (i < p.length) {
    const ch = p[i];
    if (ch === '*') {
      if (p[i + 1] === '*') {
        if (p[i + 2] === '/') { regexStr += '(?:.+/)?'; i += 3; }
        else { regexStr += '.*'; i += 2; }
      } else { regexStr += '[^/]*'; i++; }
    } else if (ch === '?') { regexStr += '[^/]'; i++; }
    else if ('.+^${}()|[]\\'.includes(ch)) { regexStr += '\\' + ch; i++; }
    else { regexStr += ch; i++; }
  }
  if (!hasSlash) return new RegExp(`(^|/)${regexStr}(/|$)`);
  if (p.startsWith('/')) return new RegExp(`^${regexStr.slice(1)}(/|$)`);
  return new RegExp(`^${regexStr}(/|$)`);
}

function matchPattern(pattern, filePath) {
  try { return globToRegex(pattern).test(filePath); }
  catch (_) { return false; }
}

const patterns = parseCodowners(CODEOWNERS_PATH);
if (patterns.length === 0) {
  console.error(`[check-codeowners] CODEOWNERS não encontrado ou vazio: ${CODEOWNERS_PATH}`);
  process.exit(isGate ? 1 : 0);
}

const uncovered = [];
for (const gateFile of GATE_FILES) {
  const absPath = resolve(REPO_ROOT, gateFile);
  if (!existsSync(absPath)) continue;
  const relPath = relative(REPO_ROOT, absPath);
  if (!patterns.some(p => matchPattern(p, relPath))) uncovered.push(relPath);
}

if (isJson) {
  console.log(JSON.stringify({ uncovered, total_gate_files: GATE_FILES.length, covered: GATE_FILES.length - uncovered.length }));
} else {
  console.log(`[check-codeowners] Arquivos de gate sem dono: ${uncovered.length} / ${GATE_FILES.length}`);
  if (uncovered.length > 0) {
    console.log('Descobertos:');
    for (const f of uncovered) console.log(`  - ${f}`);
    console.log('\nAdicione entradas correspondentes em .github/CODEOWNERS.');
  } else {
    console.log('[check-codeowners] Todos os arquivos de gate têm dono. OK.');
  }
}

if (isGate && uncovered.length > 0) process.exit(1);
