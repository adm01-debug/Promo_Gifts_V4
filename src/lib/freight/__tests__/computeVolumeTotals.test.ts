/**
 * computeVolumeTotals.test.ts — os números de um volume fechado.
 *
 * Externas usadas: P 27 × 33 × 33 = 29.403 cm³ · G 36 × 36 × 54 = 69.984 cm³.
 * Divisores: Correios 6.000 cm³/kg, rodoviário 3.333 cm³/kg.
 */
import { describe, expect, it } from 'vitest';

import { computeVolumeTotals } from '../computeVolumeTotals';
import { CAIXA_G, CAIXA_P, SETTINGS_PADRAO } from './fixtures/boxes';
import { caderneta, squeeze } from './fixtures/items';

describe('computeVolumeTotals', () => {
  it('100 cadernetas de 120 g na caixa G', () => {
    const volume = computeVolumeTotals(
      { box: CAIXA_G, contents: [{ item: caderneta(100), quantity: 100 }] },
      SETTINGS_PADRAO,
    );

    // peso bruto: caixa vazia 0 + 100 × 120 = 12.000 g
    expect(volume.grossWeightG).toBe(12_000);

    // externa 36 × 36 × 54 = 69.984 cm³
    // Correios:   69.984 ÷ 6.000 × 1.000 = 11.664 g
    // rodoviário: 69.984 ÷ 3.333 × 1.000 = 20.997,30 g
    expect(volume.cubicWeightG.correios).toBe(11_664);
    expect(volume.cubicWeightG.rodoviario).toBeCloseTo(20_997.3, 1);

    // 69.984 cm³ = 0,069984 m³
    expect(volume.volumeM3).toBeCloseTo(0.069984, 6);

    // ocupação: 100 × 294 = 29.400 cm³ sobre 66.918,744 × 0,9 = 60.226,8696
    expect(volume.fillRatio).toBeCloseTo(29_400 / 60_226.8696, 6);

    expect(volume.items).toEqual([{ productId: 'caderneta', quantity: 100 }]);
    expect(volume.box.code).toBe('G');
  });

  it('caixa vazia tem ocupação zero e peso só da própria caixa', () => {
    const comCaixaPesada = { ...CAIXA_P, emptyWeightG: 250 };
    const volume = computeVolumeTotals({ box: comCaixaPesada, contents: [] }, SETTINGS_PADRAO);

    expect(volume.grossWeightG).toBe(250);
    expect(volume.fillRatio).toBe(0);
    // externa 27 × 33 × 33 = 29.403 cm³ → Correios 29.403 ÷ 6.000 × 1.000 = 4.900,50 g
    expect(volume.cubicWeightG.correios).toBeCloseTo(4_900.5, 2);
  });

  it('soma produtos diferentes no mesmo volume', () => {
    const volume = computeVolumeTotals(
      {
        box: CAIXA_G,
        contents: [
          { item: caderneta(50), quantity: 50 },
          { item: squeeze(50), quantity: 50 },
        ],
      },
      SETTINGS_PADRAO,
    );

    // 50 × 120 + 50 × 80 = 6.000 + 4.000 = 10.000 g
    expect(volume.grossWeightG).toBe(10_000);
    // 50 × 294 + 50 × 1.225 = 14.700 + 61.250 = 75.950 cm³ sobre 60.226,8696
    // (acima de 1: este rascunho não veio de um empacotador, é cálculo puro)
    expect(volume.fillRatio).toBeCloseTo(75_950 / 60_226.8696, 6);
    expect(volume.items).toHaveLength(2);
  });

  it('divisor zerado não divide por zero: devolve cubado zero', () => {
    const volume = computeVolumeTotals(
      { box: CAIXA_G, contents: [{ item: caderneta(1), quantity: 1 }] },
      { ...SETTINGS_PADRAO, cubicDivisorCorreios: 0, cubicDivisorRodoviario: 0 },
    );

    expect(volume.cubicWeightG).toEqual({ correios: 0, rodoviario: 0 });
  });

  it('caixa com lado interno zerado não divide por zero: ocupação zero', () => {
    const caixaDegenerada = { ...CAIXA_G, inner: { heightCm: 0, widthCm: 35.4, lengthCm: 53.4 } };
    const volume = computeVolumeTotals(
      { box: caixaDegenerada, contents: [{ item: caderneta(10), quantity: 10 }] },
      SETTINGS_PADRAO,
    );

    expect(volume.fillRatio).toBe(0);
    expect(volume.grossWeightG).toBe(1_200);
  });

  it('fator da caixa fora do intervalo cai no padrão global', () => {
    const semFator = { ...CAIXA_G, fillFactor: 0 };
    const volume = computeVolumeTotals(
      { box: semFator, contents: [{ item: caderneta(100), quantity: 100 }] },
      SETTINGS_PADRAO,
    );

    expect(volume.fillRatio).toBeCloseTo(29_400 / 60_226.8696, 6);
  });
});
