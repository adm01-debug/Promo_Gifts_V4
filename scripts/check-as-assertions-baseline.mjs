#!/usr/bin/env node
/**
 * Gate de CI: ratchet de asserções `as <Tipo>` em src/ (produção).
 *
 * Conta `as X` excluindo os safe idioms `as const`, `as unknown` e
 * `as any` (este último tem gate próprio — check-any-type-baseline.mjs).
 *
 * Uso:
 *   node scripts/check-as-assertions-baseline.mjs            # verifica
 *   node scripts/check-as-assertions-baseline.mjs --update   # regrava baseline
 */
import { runBaselineGate, countMatchesInSrc } from './lib/baseline-gate.mjs';

runBaselineGate({
  baselineFile: '.as-assertions-baseline.json',
  label: '`as <Tipo>` baseline gate',
  description:
    'Baseline de asserções `as <Tipo>` em src/ (excluindo testes, `as const`, `as unknown` e `as any`). Falha apenas em REGRESSÃO.',
  totalKey: 'productionAsCount',
  fixHint:
    'Prefira narrowing/guards a asserções de tipo.\nPara atualizar o baseline (após revisão): node scripts/check-as-assertions-baseline.mjs --update',
  scan: () =>
    countMatchesInSrc(process.cwd(), /\bas\s+(?!const\b|unknown\b|any\b)[A-Za-z_$]/g),
});
