#!/usr/bin/env node
/**
 * Gate de CI: ratchet descendente de `eslint-disable` em src/ (produção).
 *
 * Conta todas as formas de supressão inline do ESLint:
 *   eslint-disable          (bloco inteiro)
 *   eslint-disable-next-line
 *   eslint-disable-line
 *
 * Cada ocorrência representa uma regra ignorada que pode esconder um bug real.
 * O gate falha em qualquer AUMENTO vs baseline.
 * Meta de redução: decrementar ao longo das Ondas do P200.
 *
 * Uso:
 *   node scripts/check-eslint-disable-baseline.mjs            # verifica
 *   node scripts/check-eslint-disable-baseline.mjs --update   # regrava baseline
 */
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { runBaselineGate, walkSrc } from './lib/baseline-gate.mjs';

// Captura eslint-disable, eslint-disable-next-line, eslint-disable-line
// dentro de comentários (// ou /* */).
const ESLINT_DISABLE_RE = /eslint-disable(?:-next-line|-line)?/g;

function scanEslintDisable(root) {
  const counts = new Map();
  for (const file of walkSrc(root)) {
    const text = readFileSync(file, 'utf8');
    const matches = text.match(ESLINT_DISABLE_RE);
    if (matches?.length) counts.set(relative(root, file), matches.length);
  }
  return counts;
}

runBaselineGate({
  baselineFile: '.eslint-disable-baseline.json',
  label: '`eslint-disable` baseline gate',
  description:
    'Baseline de supressões inline do ESLint em src/ (excluindo testes). Falha em qualquer AUMENTO. Meta: reduzir continuamente.',
  totalKey: 'productionEslintDisableCount',
  fixHint:
    'Corrija o problema real em vez de suprimir a regra. Para suprimir com justificativa, mantenha o comentário.\nPara atualizar o baseline (após redução): node scripts/check-eslint-disable-baseline.mjs --update',
  scan: () => scanEslintDisable(process.cwd()),
});
