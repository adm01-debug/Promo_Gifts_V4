#!/usr/bin/env node
/**
 * Ratchet advisory: noUncheckedIndexedAccess.
 *
 * O flag ainda não pode ser ligado no tsconfig (dívida grande). Este check
 * roda `tsc --noUncheckedIndexedAccess` e falha se a contagem de erros
 * CRESCER vs `.indexed-access-baseline.json` — congela a dívida e premia
 * redução, padrão dos demais ratchets do repo.
 *
 * Uso:
 *   node scripts/check-indexed-access-ratchet.mjs            # verifica
 *   node scripts/check-indexed-access-ratchet.mjs --update   # regrava baseline
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const BASELINE_PATH = join(ROOT, '.indexed-access-baseline.json');
const UPDATE = process.argv.includes('--update');

function countErrors() {
  console.log('⏳ Rodando tsc -p tsconfig.app.json --noEmit --noUncheckedIndexedAccess ...');
  let output = '';
  try {
    output = execSync(
      'npx tsc -p tsconfig.app.json --noEmit --noUncheckedIndexedAccess',
      { encoding: 'utf8', cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 },
    );
  } catch (e) {
    output = `${e.stdout ?? ''}`;
  }
  return (output.match(/error TS\d+/g) ?? []).length;
}

const current = countErrors();

if (UPDATE) {
  const next = {
    generatedAt: new Date().toISOString(),
    description:
      'Baseline de erros do tsc com --noUncheckedIndexedAccess. Falha se a contagem crescer (ratchet descendente).',
    errorCount: current,
  };
  writeFileSync(BASELINE_PATH, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`✅ .indexed-access-baseline.json atualizado — ${current} erros.`);
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  console.error('❌ .indexed-access-baseline.json não encontrado. Gere com: node scripts/check-indexed-access-ratchet.mjs --update');
  process.exit(2);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
const expected = baseline.errorCount ?? 0;

console.log(`noUncheckedIndexedAccess ratchet — atual: ${current} · baseline: ${expected}`);

if (current > expected) {
  console.error(`\n❌ Regressão: +${current - expected} erro(s) com noUncheckedIndexedAccess.`);
  console.error('Acesse índices com bounds-check (?? / optional chaining / narrowing).');
  console.error('Para atualizar o baseline (após revisão): node scripts/check-indexed-access-ratchet.mjs --update');
  process.exit(1);
}
if (current < expected) {
  console.log(`✨ Drift positivo: -${expected - current} erro(s). Considere: node scripts/check-indexed-access-ratchet.mjs --update`);
}
console.log('✅ Sem regressão de noUncheckedIndexedAccess.');
process.exit(0);
