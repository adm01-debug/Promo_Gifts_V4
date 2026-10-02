#!/usr/bin/env node
/**
 * E23 — Valida que pelo menos N testes Playwright foram executados.
 *
 * Uso:
 *   node scripts/check-playwright-min-executed.mjs test-results/results.json [--min N]
 *
 * Exit 0: N ou mais testes executados (expected + unexpected + flaky).
 * Exit 1: menos de N testes, arquivo ausente ou JSON inválido.
 *
 * Propósito: detectar quando secrets E2E ausentes fazem o job aparecer verde
 * mas sem executar nenhum teste autenticado.
 */

import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const filePath = args[0];
const minIdx = args.indexOf('--min');
const min = minIdx >= 0 ? parseInt(args[minIdx + 1], 10) : 1;

if (!filePath) {
  console.error('Uso: node check-playwright-min-executed.mjs <results.json> [--min N]');
  process.exit(1);
}

if (isNaN(min) || min < 1) {
  console.error(`[check-playwright-min-executed] --min deve ser >= 1, recebido: ${args[minIdx + 1]}`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(readFileSync(filePath, 'utf-8'));
} catch (e) {
  console.error(`[check-playwright-min-executed] Nao foi possivel ler ${filePath}: ${e.message}`);
  process.exit(1);
}

const stats = data.stats ?? {};
const expected  = stats.expected  ?? 0;
const unexpected = stats.unexpected ?? 0;
const flaky     = stats.flaky     ?? 0;
const skipped   = stats.skipped   ?? 0;
const executed  = expected + unexpected + flaky;

console.log(
  `Testes: executed=${executed}` +
  ` (expected=${expected} unexpected=${unexpected} flaky=${flaky} skipped=${skipped})`,
);

if (executed < min) {
  console.error(
    `[check-playwright-min-executed] FALHA: ${executed} testes executados, minimo ${min}.`,
  );
  console.error(
    'Causas possiveis: secrets E2E ausentes, spec list vazia ou Playwright abortou antes de rodar.',
  );
  process.exit(1);
}

console.log(`✓ Minimo de ${min} teste(s) executado(s) confirmado.`);
