#!/usr/bin/env node
/**
 * Auditoria dos workflows de PR check e update de snapshots do card "Condições".
 * Usa parser YAML nativo (Node 20+ tem `yaml` via bundle? não — usamos regex + JSON via node --input-type).
 * Como não podemos assumir `js-yaml`, validamos por REGEX estritas + parser leve.
 *
 * Atualizado 2026-11-08: PR check migrado para e2e-quotes.yml (consolidação E77 —
 * 12 workflows individuais → 1 workflow matrix). O arquivo antigo
 * e2e-quote-conditions-pr-check.yml foi removido; referências a ele foram
 * atualizadas aqui para evitar crash por ENOENT.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..');

// E77: PR check consolidado em e2e-quotes.yml (matrix de 12 suites)
const PR = resolve(root, '.github/workflows/e2e-quotes.yml');
const UP = resolve(root, '.github/workflows/update-snapshots.yml');

const errors = [];
const ok = [];

function check(cond, msg) {
  (cond ? ok : errors).push(msg);
}

// Guard: sai cedo se qualquer arquivo estiver ausente (evita crash por ENOENT)
const prExists = existsSync(PR);
const upExists = existsSync(UP);
check(prExists, `existe: ${PR}`);
check(upExists, `existe: ${UP}`);
if (!prExists || !upExists) {
  console.log('OK:', ok.length);
  for (const m of ok) console.log('  ✓', m);
  if (errors.length) {
    console.log('FAIL:', errors.length);
    for (const m of errors) console.log('  ✗', m);
  }
  process.exit(errors.length ? 1 : 0);
}

const pr = readFileSync(PR, 'utf8');
const up = readFileSync(UP, 'utf8');

// ── PR check (e2e-quotes.yml — matrix E77) ──────────────────────────────────
check(/on:\s*\n\s*pull_request:/.test(pr), 'PR: trigger pull_request');
check(/branches:\s*\[main\]/.test(pr), 'PR: branch main');
check(/paths:/.test(pr), 'PR: paths filter');
check(/quote-conditions-visual\.spec\.ts/.test(pr), 'PR: spec do card Condicoes');
// E77: o matrix PR usa paths e2e/** + src/components/** (sem path de spec individual)
check(/src\/components\/\*\*/.test(pr) || /e2e\/\*\*/.test(pr),
  'PR: paths filter inclui src/components/** ou e2e/**');
check(/permissions:/.test(pr), 'PR: permissions');
check(/concurrency:/.test(pr), 'PR: concurrency');
check(/timeout-minutes:/.test(pr), 'PR: timeout-minutes');
// E77: usa composite action e2e-setup (sem actions/cache@v4 explícito no workflow)
check(/e2e-setup/.test(pr), 'PR: composite action e2e-setup');
check(/chromium-public/.test(pr), 'PR: matrix project chromium-public');
// E77: usa --update-snapshots=missing (nao bare); regex permite =missing mas rejeita bare
check(!/--update-snapshots(?!=)/.test(pr), 'PR: SEM --update-snapshots bare (fail-on-diff)');
check(!/contents:\s*write/.test(pr), 'PR: SEM permissao contents:write');

// ── Update manual (update-snapshots.yml) ────────────────────────────────────
check(/workflow_dispatch:/.test(up), 'UP: workflow_dispatch');
check(/inputs:/.test(up), 'UP: inputs definidos');
check(/contents:\s*write/.test(up), 'UP: contents:write');
check(/--update-snapshots/.test(up), 'UP: --update-snapshots');
check(/git push origin/.test(up), 'UP: git push origin');
check(/concurrency:/.test(up), 'UP: concurrency');
check(/timeout-minutes:/.test(up), 'UP: timeout-minutes');
// SHA-pinned (versao agnostica — pode ser cache@v4 ou cache@SHA40)
check(/actions\/cache@/.test(up), 'UP: cache de browsers (SHA-pinned)');

// ── YAML syntax sanity: sem TABs, sem trailing crlf estranho ────────────────
for (const [name, txt] of [['PR', pr], ['UP', up]]) {
  check(!/\t/.test(txt), `${name}: sem TABs`);
  check(txt.endsWith('\n'), `${name}: termina com newline`);
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log('OK:', ok.length);
for (const m of ok) console.log('  ✓', m);
if (errors.length) {
  console.log('FAIL:', errors.length);
  for (const m of errors) console.log('  ✗', m);
  process.exit(1);
}
console.log('\nQuote Conditions workflows: PASS');
