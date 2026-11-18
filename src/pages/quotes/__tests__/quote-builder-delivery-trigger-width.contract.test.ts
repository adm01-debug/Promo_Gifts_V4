/**
 * Guarda: trigger de "Prazo | Entrega" deve usar o mesmo grid do card
 * "Validade | Proposta" para ter largura exatamente igual à primeira coluna.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  GRID_3_COLUNAS,
  classesDoGridQueEnvolve,
  classesFaltando,
} from './helpers/jsxLayoutContract';

const SRC = readFileSync(resolve(__dirname, '../QuoteBuilderPage.tsx'), 'utf8');

describe('QuoteBuilderPage — largura do trigger "Prazo | Entrega"', () => {
  it('usa o mesmo grid de 3 colunas do campo Validade | Proposta', () => {
    // O trigger de Prazo|Entrega tem de viver no grid de 3 colunas. O grid nao
    // tem data-testid proprio, entao sobe-se do marcador ate o <div> com `grid`.
    const classes = classesDoGridQueEnvolve(SRC, "s.deliveryMode === 'prazo' ? (");
    expect(classesFaltando(classes, [...GRID_3_COLUNAS])).toEqual([]);
    expect(SRC).not.toMatch(/md:w-2\/5/);
    expect(SRC).not.toMatch(/md:w-1\/2(?![0-9])/);
    expect(SRC).not.toMatch(/md:w-1\/3(?![0-9])/);
    expect(SRC).not.toMatch(/md:w-1\/4(?![0-9])/);
  });
});
