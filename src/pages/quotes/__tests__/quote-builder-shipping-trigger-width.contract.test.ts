/**
 * Guarda: trigger do "Frete" deve usar o mesmo grid do "Prazo | Entrega"
 * (grid grid-cols-1 md:grid-cols-3 gap-3) para largura pixel-a-pixel idêntica.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  GRID_3_COLUNAS,
  classesFaltando,
  classesPorTestId,
  indiceDoTestId,
} from './helpers/jsxLayoutContract';

const SRC = readFileSync(resolve(__dirname, '../QuoteBuilderPage.tsx'), 'utf8');

describe('QuoteBuilderPage — largura do trigger "Frete"', () => {
  it('envolve o shipping-type-select no grid de 3 colunas', () => {
    expect(classesFaltando(classesPorTestId(SRC, 'freight-grid'), [...GRID_3_COLUNAS])).toEqual([]);
    const col1 = indiceDoTestId(SRC, 'freight-grid-col-1');
    expect(col1).toBeGreaterThan(indiceDoTestId(SRC, 'freight-grid'));
    expect(SRC.indexOf('shipping-type-select-root')).toBeGreaterThan(col1);
  });

  it('não usa larguras fracionárias legadas no bloco do frete', () => {
    const bloco = SRC.split('shipping-type-select-root')[1]?.slice(0, 400) ?? '';
    expect(bloco).not.toMatch(/md:w-1\/2|md:w-2\/5|md:w-1\/3|md:w-1\/4/);
  });
});
