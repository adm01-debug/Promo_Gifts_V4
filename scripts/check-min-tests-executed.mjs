#!/usr/bin/env node
/**
 * E23 — Gate: minimo de testes executados.
 * Le o relatorio JSON do Playwright (--reporter=json) e falha se
 * total de specs executados (passed + failed + flaky) < MIN_TESTS.
 *
 * Uso: node scripts/check-min-tests-executed.mjs [relatorio.json] [--min=N]
 * Default: test-results/results.json, --min=1
 */
import fs from 'fs';

const args = process.argv.slice(2);
const reportPath = args.find((a) => !a.startsWith('--')) ?? 'test-results/results.json';
const minArg = args.find((a) => a.startsWith('--min='));
const MIN_TESTS = minArg ? parseInt(minArg.replace('--min=', ''), 10) : 1;

if (!fs.existsSync(reportPath)) {
  console.error(`[check-min-tests] Relatorio nao encontrado: ${reportPath}`);
  console.error('[check-min-tests] Execute playwright com --reporter=json antes deste gate.');
  process.exit(1);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
} catch (e) {
  console.error(`[check-min-tests] Falha ao parsear ${reportPath}: ${e.message}`);
  process.exit(1);
}

const stats = report?.stats ?? {};
// Playwright JSON: stats.expected=passed, stats.unexpected=failed, stats.flaky=flaky
const executed = (stats.expected ?? 0) + (stats.unexpected ?? 0) + (stats.flaky ?? 0);

if (executed < MIN_TESTS) {
  console.error(
    `[check-min-tests] FALHOU: ${executed} spec(s) executados (minimo: ${MIN_TESTS}).`,
  );
  console.error('[check-min-tests] Specs estao sendo pulados silenciosamente.');
  console.error('[check-min-tests] Verifique: credenciais E2E (E22/E23), filtros de projeto, skip em fixtures.');
  process.exit(1);
}

console.log(`[check-min-tests] OK: ${executed} spec(s) executados (minimo: ${MIN_TESTS}).`);
