import { describe, expect, it } from 'vitest';
import { isKnownItemWeight, summarizeKitWeight } from '@/lib/kit-builder/weight';

describe('peso conhecido no Kit Maker', () => {
  it.each([undefined, null, 0, -10, Number.NaN, Number.POSITIVE_INFINITY])(
    'não aceita %s como peso medido',
    (weight) => {
      expect(isKnownItemWeight(weight)).toBe(false);
    },
  );

  it('soma somente pesos positivos e conta linhas de item e caixa sem peso', () => {
    expect(
      summarizeKitWeight(
        [
          { weight: 100, quantity: 2 },
          { weight: 0, quantity: 1 },
          { weight: undefined, quantity: 3 },
        ],
        { weight: 50 },
      ),
    ).toEqual({ totalWeightGrams: 250, itemsWeightGrams: 200, unknownWeightCount: 2 });
  });

  it('conta caixa com peso zero como peso desconhecido', () => {
    expect(summarizeKitWeight([], { weight: 0 })).toEqual({
      totalWeightGrams: 0,
      itemsWeightGrams: 0,
      unknownWeightCount: 1,
    });
  });
});
