/**
 * Smoke estrutural: garante invariantes do bloco Frete no QuoteBuilderPage
 * que previnem regressões de layout em diferentes larguras de tela
 * (mobile empilhado / md+ em 3 colunas) e evitam regressões de JSX
 * mal-balanceado como as que já causaram "Unexpected token" no build.
 *
 * Nota: a verificação de compilação real ("tsc --noEmit" + "npm run build")
 * roda no workflow build-typecheck.yml a cada PR — este teste é a
 * primeira linha de defesa, barata e rápida.
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

describe('QuoteBuilderPage — bloco Frete: layout responsivo', () => {
  it('usa o grid de 3 colunas com items-end (empilha em mobile, 3 col em md+)', () => {
    // Conjunto de classes, nao string literal: o prettier-plugin-tailwindcss
    // reordena utilitarias a cada toque no arquivo (ver helper).
    const classes = classesPorTestId(SRC, 'freight-grid');
    expect(classesFaltando(classes, [...GRID_3_COLUNAS, 'items-end'])).toEqual([]);
    // E a 1a celula do grid continua sendo a do select de frete.
    const grid = indiceDoTestId(SRC, 'freight-grid');
    const col1 = indiceDoTestId(SRC, 'freight-grid-col-1');
    expect(grid).toBeGreaterThan(-1);
    expect(col1).toBeGreaterThan(grid);
    expect(SRC.indexOf('shipping-type-select-root')).toBeGreaterThan(col1);
  });

  it('labels Frete e Valor R$ vivem dentro das células do grid para não aumentar o container só no fob_pre', () => {
    expect(SRC).toMatch(
      /data-testid="freight-grid-col-1"[^]*?>[^]*?<Label[^]*?>[^]*?Frete[^]*?<\/Label>[^]*?shipping-type-select-root/,
    );
    expect(SRC).toMatch(
      /data-testid="freight-grid-col-2"[^]*?>[^]*?<Label[^]*?>[^]*?Valor R\$[^]*?<\/Label>[^]*?shipping-cost-input/,
    );
  });

  it('input "Valor R$" (fob_pre) vive DENTRO do mesmo grid do trigger (2ª coluna)', () => {
    const gridIdx = indiceDoTestId(SRC, 'freight-grid');
    expect(gridIdx).toBeGreaterThan(0);
    // Janela delimitada pelo PROXIMO IRMAO do bloco de frete, nao por um numero
    // magico de caracteres: o prettier mudou a formatacao e o input passou dos
    // 3000 chars do recorte antigo, deixando o caso vermelho sem mudanca de layout.
    const fimDoBloco = SRC.indexOf('{s.companyInfo?.id', gridIdx);
    expect(fimDoBloco).toBeGreaterThan(gridIdx);
    const janela = SRC.slice(gridIdx, fimDoBloco);
    const fobPreIdx = janela.indexOf("s.shippingType === 'fob_pre'");
    const shippingCostIdx = janela.indexOf('shipping-cost-input');
    expect(fobPreIdx).toBeGreaterThan(0);
    expect(shippingCostIdx).toBeGreaterThan(fobPreIdx);
  });

  it('não existe bloco full-width legado envolvendo o Valor R$ (mt-1.5 + shipping-cost)', () => {
    expect(SRC).not.toMatch(/mt-1\.5 space-y-1[^"]*"[^]*?shipping-cost-input/);
  });

  it('JSX do bloco Frete tem <div> balanceados (open == close entre o wrapper externo e o próximo irmão)', () => {
    const start = SRC.indexOf('{/* Frete */}');
    const end = SRC.indexOf('{s.companyInfo?.id', start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const bloco = SRC.slice(start, end);
    const opens = (bloco.match(/<div\b/g) ?? []).length;
    const closes = (bloco.match(/<\/div>/g) ?? []).length;
    expect(opens).toBe(closes);
  });
});
