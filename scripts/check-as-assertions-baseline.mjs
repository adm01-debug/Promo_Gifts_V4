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
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { runBaselineGate, walkSrc } from './lib/baseline-gate.mjs';

// Scan próprio (em vez de countMatchesInSrc por linha) porque o padrão
// por-linha tinha dois buracos provados em auditoria adversarial:
//   • `x as /*comentário*/ Tipo`  — comentário entre `as` e o tipo evadia;
//   • `x as\n      Tipo`          — cast multi-linha nunca era contado.
// Remover comentários antes de contar também elimina o falso positivo de
// prosa pt-BR ("... as Regras ..." dentro de // ou /* */ não é assertion).
// `//` em strings com `://` (URLs) é preservado pelo lookbehind `[^:'"`]`.
// Cast multi-linha exige tipo PascalCase: a alternativa `[ \t]+` cobre o
// caso na mesma linha (qualquer case, como antes); `\s+` seguido de
// maiúscula cobre `as\nTipo` sem contar prosa quebrada ("todas as\ncred.").
const AS_RE =
  /\bas[ \t]+(?!const\b|unknown\b|any\b)[A-Za-z_$]|\bas\s+(?=[A-Z])(?!const\b|unknown\b|any\b)[A-Za-z_$]/g;

function scanAsAssertions(root) {
  const counts = new Map();
  for (const file of walkSrc(root)) {
    const text = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
    const matches = text.match(AS_RE);
    if (matches?.length) counts.set(relative(root, file), matches.length);
  }
  return counts;
}

runBaselineGate({
  baselineFile: '.as-assertions-baseline.json',
  label: '`as <Tipo>` baseline gate',
  description:
    'Baseline de asserções `as <Tipo>` em src/ (excluindo testes, `as const`, `as unknown` e `as any`). Falha apenas em REGRESSÃO.',
  totalKey: 'productionAsCount',
  fixHint:
    'Prefira narrowing/guards a asserções de tipo.\nPara atualizar o baseline (após revisão): node scripts/check-as-assertions-baseline.mjs --update',
  scan: () => scanAsAssertions(process.cwd()),
});
