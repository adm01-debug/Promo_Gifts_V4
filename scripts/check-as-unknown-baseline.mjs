#!/usr/bin/env node
/**
 * Gate de CI: ratchet descendente de `as unknown as` em src/ (produção).
 *
 * Conta `as unknown as T` (double-cast) — escape hatch de tipo que contorna
 * verificações estruturais do TypeScript. Falha em qualquer AUMENTO vs baseline.
 * Meta de redução: decrementar ao longo das Ondas do P200.
 *
 * Uso:
 *   node scripts/check-as-unknown-baseline.mjs            # verifica
 *   node scripts/check-as-unknown-baseline.mjs --update   # regrava baseline
 */
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { runBaselineGate, walkSrc } from './lib/baseline-gate.mjs';

// Conta `as unknown as` literal em código (não em comentários).
// Remove comentários de linha e bloco antes de contar para evitar
// falsos positivos de prosa ou exemplos em comentários explicativos.
const AS_UNKNOWN_RE = /\bas\s+unknown\s+as\b/g;

function scanAsUnknown(root) {
  const counts = new Map();
  for (const file of walkSrc(root)) {
    const text = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
    const matches = text.match(AS_UNKNOWN_RE);
    if (matches?.length) counts.set(relative(root, file), matches.length);
  }
  return counts;
}

runBaselineGate({
  baselineFile: '.as-unknown-baseline.json',
  label: '`as unknown as` baseline gate',
  description:
    'Baseline de double-casts `as unknown as` em src/ (excluindo testes). Falha em qualquer AUMENTO. Meta: reduzir continuamente.',
  totalKey: 'productionAsUnknownCount',
  fixHint:
    'Substitua `as unknown as T` por tipagem explícita, guards ou parseJsonb.\nPara atualizar o baseline (após redução): node scripts/check-as-unknown-baseline.mjs --update',
  scan: () => scanAsUnknown(process.cwd()),
});
