#!/usr/bin/env node
/**
 * E42 — Valida que pelo menos N testes Playwright foram executados.
 *
 * Uso:
 *   node scripts/check-playwright-min-executed.mjs <results.json> [--min N] [--max-skipped-ratio R]
 *
 * Exit 0: N ou mais testes executados (expected + unexpected + flaky) e ratio de skipped ≤ R.
 * Exit 1: menos de N testes, ratio de skipped > R, arquivo ausente ou JSON inválido.
 *
 * Propósito: detectar quando secrets E2E ausentes fazem o job aparecer verde
 * mas sem executar nenhum teste autenticado, ou quando toda a suite é marcada skip.
 *
 * --min N            (default 1): mínimo de testes executados (expected + unexpected + flaky)
 * --max-skipped-ratio R (default 1.0 = sem limite): ratio máximo skipped/(executed+skipped)
 *                    Exemplo: --max-skipped-ratio 0.5 falha se mais de 50% da suite foi skipped.
 */

import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const filePath = args[0];

function argVal(flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : undefined;
}

const minRaw = argVal('--min');
const min = minRaw !== undefined ? parseInt(minRaw, 10) : 1;
const ratioRaw = argVal('--max-skipped-ratio');
const maxSkippedRatio = ratioRaw !== undefined ? parseFloat(ratioRaw) : 1.0;

if (!filePath) {
  console.error('Uso: node check-playwright-min-executed.mjs <results.json> [--min N] [--max-skipped-ratio R]');
  process.exit(1);
}

if (isNaN(min) || min < 1) {
  console.error(`[check-playwright-min-executed] --min deve ser >= 1, recebido: ${minRaw}`);
  process.exit(1);
}

if (isNaN(maxSkippedRatio) || maxSkippedRatio < 0 || maxSkippedRatio > 1) {
  console.error(`[check-playwright-min-executed] --max-skipped-ratio deve ser entre 0 e 1, recebido: ${ratioRaw}`);
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
const expected   = stats.expected   ?? 0;
const unexpected = stats.unexpected ?? 0;
const flaky      = stats.flaky      ?? 0;
const skipped    = stats.skipped    ?? 0;
const executed   = expected + unexpected + flaky;

console.log(
  `Testes: executed=${executed}` +
  ` (expected=${expected} unexpected=${unexpected} flaky=${flaky} skipped=${skipped})`,
);

let failed = false;

if (executed < min) {
  console.error(
    `[check-playwright-min-executed] FALHA: ${executed} testes executados, minimo ${min}.`,
  );
  console.error(
    'Causas possiveis: secrets E2E ausentes, spec list vazia ou Playwright abortou antes de rodar.',
  );
  failed = true;
}

// Detecta suites inteiramente em skip (expected==0 && skipped>0 é sinal de auth ausente ou filtro incorreto)
if (executed === 0 && skipped > 0) {
  console.error(
    `[check-playwright-min-executed] FALHA: 0 testes executados com ${skipped} skipped — suite inteiramente ignorada.`,
  );
  console.error(
    'Causas possiveis: requireAuth bloqueou todos os testes, --grep nao casou nenhum, ou spec depende de fixture ausente.',
  );
  failed = true;
}

const total = executed + skipped;
if (total > 0 && maxSkippedRatio < 1.0) {
  const ratio = skipped / total;
  if (ratio > maxSkippedRatio) {
    console.error(
      `[check-playwright-min-executed] FALHA: ratio de skipped ${(ratio * 100).toFixed(1)}% > maximo ${(maxSkippedRatio * 100).toFixed(1)}% (${skipped}/${total}).`,
    );
    console.error(
      'Causas possiveis: muitos testes com requireAuth, condicoes de skip incorretas ou spec nao encontrou dados de fixture.',
    );
    failed = true;
  }
}

if (failed) process.exit(1);

console.log(`✓ Minimo de ${min} teste(s) executado(s) confirmado${maxSkippedRatio < 1.0 ? ` (ratio skipped ok: ${skipped}/${total})` : ''}.`);
