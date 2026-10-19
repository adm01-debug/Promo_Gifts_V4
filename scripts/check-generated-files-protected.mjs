#!/usr/bin/env node
/**
 * E196 — Gate: arquivos gerados não podem ter >20% de linhas removidas sem label.
 *
 * Execução: node scripts/check-generated-files-protected.mjs [--gate]
 *   --gate  sai com código 1 se algum arquivo gerado teve redução ≥ THRESHOLD
 *
 * Em CI, a detecção usa a variável GITHUB_BASE_SHA (PR) ou compara HEAD~1.
 * Localmente compara working-tree vs HEAD.
 */

import { execSync } from 'child_process';
import path from 'path';

const THRESHOLD = 0.20; // 20% de redução dispara a falha

const GENERATED_FILES = [
  'src/integrations/supabase/types.ts',
  'supabase/functions/_shared/cors-snapshot.json',
  '.codeql-alerts-baseline.json',
  'supabase/MIGRATIONS_SYNC_LOG.md',
  'docs/TYPES_INVENTORY_REMOVAL_ALLOWLIST.json',
];

const GENERATED_GLOBS = [
  /^src\/.*\/__snapshots__\/.*\.snap$/,
  /^tests\/.*\/__snapshots__\/.*\.snap$/,
  /^graphify-out\//,
  /^supabase\/baseline\//,
];

const IS_GATE = process.argv.includes('--gate');

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    return '';
  }
}

function isGenerated(filePath) {
  if (GENERATED_FILES.includes(filePath)) return true;
  return GENERATED_GLOBS.some((re) => re.test(filePath));
}

function countLines(ref, filePath) {
  const out = run(`git show "${ref}:${filePath}" 2>/dev/null | wc -l`);
  const n = parseInt(out, 10);
  return isNaN(n) ? 0 : n;
}

const baseSha = process.env.GITHUB_BASE_SHA
  || run('git rev-parse HEAD~1 2>/dev/null')
  || 'HEAD~1';

const diffFiles = run(`git diff --name-only "${baseSha}" HEAD -- 2>/dev/null`)
  .split('\n')
  .filter(Boolean);

const violations = [];

for (const f of diffFiles) {
  if (!isGenerated(f)) continue;

  const before = countLines(baseSha, f);
  const after = countLines('HEAD', f);

  if (before === 0) continue; // arquivo novo — não é regressão

  const reduction = (before - after) / before;
  if (reduction >= THRESHOLD) {
    violations.push({ file: f, before, after, pct: Math.round(reduction * 100) });
  }
}

if (violations.length === 0) {
  console.log('✅ check-generated-files-protected: nenhuma redução ≥20% em arquivos gerados.');
  process.exit(0);
}

console.error(`❌ check-generated-files-protected: ${violations.length} arquivo(s) gerado(s) com redução ≥20% de linhas sem label:\n`);
for (const v of violations) {
  console.error(`  ${v.file}  ${v.before} → ${v.after} linhas  (−${v.pct}%)`);
}
console.error('\nPara override intencional, adicione a label "ratchet-override" ao PR.');

if (IS_GATE) process.exit(1);
