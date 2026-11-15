#!/usr/bin/env node
/**
 * Gate E117: roda tsc -p tsconfig.eslint.json (inclui src + tests + e2e + scripts)
 * e compara o total de erros com .tsc-tests-baseline.json.
 *
 * Política: falha SOMENTE se houver erros NOVOS (total > baseline).
 * Drift positivo (erros diminuíram) é logado como conquista, não falha.
 *
 * Para atualizar o baseline após reduzir erros:
 *   npm run typecheck:tests:baseline:update
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { classifyTscRun, tscHeapArgs } from './lib/tsc-run.mjs';

const ROOT = process.cwd();
const BASELINE_PATH = join(ROOT, '.tsc-tests-baseline.json');
const TSC_BIN = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
const UPDATE = process.argv.includes('--update');

let baseline = { totalErrors: 0 };
try {
  baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
  if (!UPDATE) {
    console.error('❌ .tsc-tests-baseline.json não encontrado. Gere com: npm run typecheck:tests:baseline:update');
    process.exit(2);
  }
}

console.log('⏳ Rodando tsc -p tsconfig.eslint.json --noEmit ...');
const res = spawnSync(
  process.execPath,
  [...tscHeapArgs(), TSC_BIN, '-p', 'tsconfig.eslint.json', '--noEmit'],
  { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 },
);

const output = (res.stdout || '') + (res.stderr || '');
// GUARD: tsc que não chegou a checar (tsconfig ausente/inválido, OOM) não pode virar
// "1 erro < baseline" e celebrar drift positivo.
const run = classifyTscRun({ status: res.status, signal: res.signal, error: res.error, output });
if (!run.ok) {
  console.error(`❌ ${run.reason}`);
  process.exit(2);
}
const totalCurrent = run.count;
const totalBaseline = baseline.totalErrors ?? 0;

if (UPDATE) {
  writeFileSync(BASELINE_PATH, JSON.stringify({ totalErrors: totalCurrent }, null, 2) + '\n');
  console.log(`✅ Baseline atualizado: ${totalCurrent} erros → ${BASELINE_PATH}`);
  process.exit(0);
}

console.log(`TS tests baseline gate — atual: ${totalCurrent} · baseline: ${totalBaseline}`);

if (totalCurrent > totalBaseline) {
  const delta = totalCurrent - totalBaseline;
  console.error(`❌ Regressão: ${delta} erro(s) novo(s) em tests/e2e/scripts (tsconfig.eslint).`);
  console.error('Para investigar: npx tsc -p tsconfig.eslint.json --noEmit 2>&1 | grep "error TS"');
  console.error('Para aceitar (após resolver erros): npm run typecheck:tests:baseline:update');
  process.exit(1);
}

if (totalCurrent < totalBaseline) {
  const delta = totalBaseline - totalCurrent;
  console.log(`✨ Drift positivo: ${delta} erro(s) eliminado(s). Atualize o baseline!`);
  console.log('  npm run typecheck:tests:baseline:update');
}

console.log('✅ Nenhuma regressão de TypeScript em tests/e2e/scripts.');
process.exit(0);
