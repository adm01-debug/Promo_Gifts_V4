/**
 * Guarda: quando shippingType === 'fob_pre', o campo "Valor R$"
 * é renderizado DENTRO do mesmo grid do trigger de Frete
 * (grid grid-cols-1 md:grid-cols-3 gap-3), como 2ª célula — não em
 * bloco full-width abaixo.
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

describe('QuoteBuilderPage — "Valor R$" inline no grid do Frete (fob_pre)', () => {
  it('grid do Frete usa items-end para alinhar input ao trigger', () => {
    const classes = classesPorTestId(SRC, 'freight-grid');
    expect(classesFaltando(classes, [...GRID_3_COLUNAS, 'items-end'])).toEqual([]);
    const col1 = indiceDoTestId(SRC, 'freight-grid-col-1');
    expect(col1).toBeGreaterThan(indiceDoTestId(SRC, 'freight-grid'));
    expect(SRC.indexOf('shipping-type-select-root')).toBeGreaterThan(col1);
  });

  it('mantém os labels dentro das células do grid, sem criar linha externa que aumenta o container', () => {
    expect(SRC).toMatch(
      /data-testid="freight-grid-col-1"[^]*?>[^]*?<Label[^]*?>[^]*?Frete[^]*?<\/Label>[^]*?shipping-type-select-root/,
    );
    expect(SRC).toMatch(
      /data-testid="freight-grid-col-2"[^]*?>[^]*?<Label[^]*?>[^]*?Valor R\$[^]*?<\/Label>[^]*?shipping-cost-input/,
    );
  });

  it('shipping-cost-input aparece dentro do mesmo grid (após o trigger, antes do fechamento do grid)', () => {
    const gridStart = indiceDoTestId(SRC, 'freight-grid');
    expect(gridStart).toBeGreaterThan(-1);
    const tail = SRC.slice(gridStart);
    const fobPreIdx = tail.indexOf("s.shippingType === 'fob_pre'");
    const shippingCostIdx = tail.indexOf('shipping-cost-input');
    expect(fobPreIdx).toBeGreaterThan(0);
    expect(shippingCostIdx).toBeGreaterThan(fobPreIdx);
  });

  it('não existe bloco legado full-width com mt-1.5 envolvendo o Valor R$', () => {
    expect(SRC).not.toMatch(/mt-1\.5 space-y-1[^"]*"[^]*?shipping-cost-input/);
  });
});
