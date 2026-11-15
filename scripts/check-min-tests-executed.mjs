#!/usr/bin/env node
/**
 * E23/E109 — Gate: minimo de testes executados.
 * Le o relatorio JSON do Playwright (--reporter=json) e falha se
 * total de specs executados (passed + failed + flaky) < MIN_TESTS.
 *
 * Uso: node scripts/check-min-tests-executed.mjs [relatorio.json] [--min=N]
 * Default: test-results/results.json, --min 10 (E109: default proporcional ao
 * projeto; cada workflow deve passar --min explícito para seu contexto)
 */
import fs from 'fs';
import { missingPrerequisite } from './lib/missing-prerequisite.mjs';

const args = process.argv.slice(2);
const reportPath = args.find((a) => !a.startsWith('--')) ?? 'test-results/results.json';
const minArg = args.find((a) => a.startsWith('--min='));
const minRaw = minArg?.slice('--min='.length);
const MIN_TESTS = minRaw === undefined ? 10 : Number(minRaw);

if (
  minRaw !== undefined
  && (!/^\d+$/.test(minRaw) || !Number.isSafeInteger(MIN_TESTS) || MIN_TESTS < 1)
) {
  console.error(`[check-min-tests] Valor invalido para --min: ${minRaw || '(vazio)'}`);
  console.error('[check-min-tests] Use um inteiro seguro maior ou igual a 1 (ex.: --min=10).');
  process.exit(2);
}

if (!fs.existsSync(reportPath)) {
  missingPrerequisite('check-min-tests', `relatorio ${reportPath} ausente`, {
    exitCode: 1,
    hint: 'Execute playwright com --reporter=json antes deste gate.',
  });
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
