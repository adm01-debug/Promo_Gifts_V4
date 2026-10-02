#!/usr/bin/env node
/**
 * Gate de CI: ratchet de marcadores TODO/FIXME/HACK em src/ (produção).
 *
 * Uso:
 *   node scripts/check-todo-baseline.mjs            # verifica
 *   node scripts/check-todo-baseline.mjs --update   # regrava .todo-baseline.json
 */
import { runBaselineGate, countMatchesInSrc } from './lib/baseline-gate.mjs';

runBaselineGate({
  baselineFile: '.todo-baseline.json',
  label: 'TODO/FIXME/HACK baseline gate',
  description:
    'Baseline de marcadores TODO/FIXME/HACK em src/ (excluindo testes). Falha apenas em REGRESSÃO (contagem cresce).',
  totalKey: 'productionTodoCount',
  fixHint:
    'Resolva o débito ou vincule a uma issue rastreada.\nPara atualizar o baseline (após revisão): node scripts/check-todo-baseline.mjs --update',
  scan: () => countMatchesInSrc(process.cwd(), /\b(TODO|FIXME|HACK)\b/gi),
});
