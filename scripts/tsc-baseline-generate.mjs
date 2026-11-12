#!/usr/bin/env node
/**
 * Gera/atualiza .tsc-baseline.json com o snapshot dos erros TypeScript atuais.
 *
 * Estrutura (mesma mecânica do .eslint-baseline.json):
 *   {
 *     "generatedAt": "ISO-date",
 *     "totalErrors": N,
 *     "counts": {
 *       "src/foo.ts": { "TS2339": 5, "TS2322": 3 }
 *     }
 *   }
 *
 * Uso:
 *   node scripts/tsc-baseline-generate.mjs
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { classifyTscRun, tscHeapArgs } from './lib/tsc-run.mjs';

const ROOT = process.cwd();
const BASELINE_PATH = join(ROOT, '.tsc-baseline.json');
const TSC_BIN = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');

console.log('⏳ Rodando tsc -p tsconfig.app.json --noEmit ...');
const res = spawnSync(process.execPath, [...tscHeapArgs(), TSC_BIN, '-p', 'tsconfig.app.json', '--noEmit'], {
  encoding: 'utf8',
  maxBuffer: 50 * 1024 * 1024,
});

// tsc com --noEmit retorna 0 se sem erros, !=0 se com erros. Ambos OK pra nós —
// DESDE QUE ele tenha realmente checado. GUARD: sem isso (tsconfig/typescript ausentes, OOM)
// o total virava 0 e o .tsc-baseline.json versionado era sobrescrito com "0 erros".
const output = (res.stdout || '') + (res.stderr || '');
const run = classifyTscRun({ status: res.status, signal: res.signal, error: res.error, output });
if (!run.ok) {
  console.error(`❌ ${run.reason} — baseline NÃO foi alterada.`);
  process.exit(2);
}
const lines = output.split('\n');

const ERR_RE = /^(\S+\.tsx?)\(\d+,\d+\): error (TS\d+):/;
const counts = {};
let total = 0;

for (const line of lines) {
  const m = line.match(ERR_RE);
  if (!m) continue;
  const [, file, rule] = m;
  counts[file] ??= {};
  counts[file][rule] = (counts[file][rule] || 0) + 1;
  total++;
}

// Sort files alfabeticamente, regras dentro de cada file também
const sorted = {};
for (const f of Object.keys(counts).sort()) {
  sorted[f] = {};
  for (const r of Object.keys(counts[f]).sort()) {
    sorted[f][r] = counts[f][r];
  }
}

const baseline = {
  generatedAt: new Date().toISOString(),
  totalErrors: total,
  counts: sorted,
};

writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n');
const fileCount = Object.keys(sorted).length;
console.log(
  `✅ Baseline gravado em .tsc-baseline.json — ${total} erros congelados em ${fileCount} arquivos.`,
);
