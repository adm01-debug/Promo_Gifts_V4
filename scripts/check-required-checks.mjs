#!/usr/bin/env node
/**
 * check-required-checks — E71 (2026-10-15)
 *
 * Verifica se todo check em .github/required-checks.json tem um job
 * correspondente (campo `name:`) em algum workflow de .github/workflows/.
 *
 * Um check "fantasma" é aquele listado como required mas sem job correspondente
 * — nunca vai passar porque nenhum workflow o emite, bloqueando merges para sempre.
 *
 * Saídas:
 *   exit 0 — todos os checks têm jobs correspondentes
 *   exit 1 — um ou mais checks fantasmas foram encontrados
 *
 * Uso:
 *   node scripts/check-required-checks.mjs
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const _require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Carrega todos os workflows como objetos YAML parseados.
 * @param {string} rootDir
 * @returns {{ file: string, text: string, doc: object }[]}
 */
function loadWorkflows(rootDir) {
  const yaml = _require('js-yaml');
  const dir = join(rootDir, '.github', 'workflows');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .flatMap((f) => {
      const text = readFileSync(join(dir, f), 'utf-8');
      let doc = null;
      try { doc = yaml.load(text); } catch { /* skip */ }
      if (!doc || typeof doc !== 'object') return [];
      return [{ file: f, text, doc }];
    });
}

/**
 * Coleta todos os job display names (campo `name:`) de um conjunto de workflows.
 * @param {{ file: string, doc: object }[]} workflows
 * @returns {Map<string, string[]>} name → [files...]
 */
function collectJobNames(workflows) {
  const map = new Map();
  for (const { file, doc } of workflows) {
    const jobs = doc.jobs || {};
    for (const [, jobDef] of Object.entries(jobs)) {
      if (!jobDef || typeof jobDef !== 'object') continue;
      const name = typeof jobDef.name === 'string' ? jobDef.name.trim() : null;
      if (!name) continue;
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(file);
    }
  }
  return map;
}

/**
 * Coleta todos os required check names de todos os rulesets não-disabled.
 * @param {object} requiredChecksJson
 * @returns {{ name: string, workflow: string | null, ruleset: string }[]}
 */
function collectRequiredChecks(requiredChecksJson) {
  const result = [];
  for (const ruleset of requiredChecksJson.rulesets || []) {
    if (ruleset._disabled) continue;
    for (const check of ruleset.required_checks || []) {
      result.push({
        name: check.name,
        workflow: check.workflow || null,
        ruleset: ruleset.id,
      });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const requiredChecksPath = join(ROOT, '.github', 'required-checks.json');
if (!existsSync(requiredChecksPath)) {
  console.error('ERROR: .github/required-checks.json not found.');
  process.exit(1);
}

const requiredChecksJson = JSON.parse(readFileSync(requiredChecksPath, 'utf-8'));
const requiredChecks = collectRequiredChecks(requiredChecksJson);

if (requiredChecks.length === 0) {
  console.log('No active required checks found in required-checks.json. Nothing to verify.');
  process.exit(0);
}

const workflows = loadWorkflows(ROOT);
const jobNames = collectJobNames(workflows);

const phantoms = [];
const matched = [];

for (const check of requiredChecks) {
  if (jobNames.has(check.name)) {
    matched.push({ check, files: jobNames.get(check.name) });
  } else {
    phantoms.push(check);
  }
}

console.log('\n=== check-required-checks — E71 ===');
console.log(`Required checks (active rulesets): ${requiredChecks.length}`);
console.log(`Workflows scanned: ${workflows.length}`);
console.log(`Matched: ${matched.length}`);
console.log(`Phantoms (no matching job): ${phantoms.length}`);

if (matched.length > 0) {
  console.log('\nMatched required checks:');
  for (const { check, files } of matched) {
    const fileList = files.slice(0, 3).join(', ') + (files.length > 3 ? ` …+${files.length - 3}` : '');
    console.log(`  ✓ [${check.ruleset}] "${check.name}" → ${fileList}`);
  }
}

if (phantoms.length > 0) {
  console.error('\nPhantom required checks (listed as required but no job emits them):');
  for (const check of phantoms) {
    const hinted = check.workflow ? ` (expected in ${check.workflow})` : '';
    console.error(`  ✗ [${check.ruleset}] "${check.name}"${hinted}`);
  }
  console.error(
    '\nERROR: Phantom required checks will block all merges to main because no workflow\n' +
    'will ever emit them as a passing status. Either:\n' +
    '  1. Add a job with the matching `name:` to the correct workflow, OR\n' +
    '  2. Remove the check from .github/required-checks.json if it is no longer needed.\n' +
    'Do NOT add a placeholder job that always passes — that defeats the purpose of the gate.',
  );
  process.exit(1);
}

process.exit(0);
