/**
 * columns.test.ts — contrato das colunas que o motor lê de `products`.
 *
 * A existência de cada coluna em `products` é garantida em tempo de compilação
 * pelo `Pick<ProductsRow, ProductMeasureColumn>` de `columns.ts`
 * (`npm run qa:typecheck`). Aqui o que se trava é a **lista**: nenhuma coluna
 * legada entra de volta por descuido, e o `select` sai no formato que o
 * PostgREST espera.
 */
import { describe, expect, it } from 'vitest';

import { PRODUCT_MEASURE_COLUMNS, PRODUCT_MEASURE_SELECT } from '../columns';

/**
 * Colunas que a decisão de projeto manda ignorar (ver README do módulo).
 *
 * As quatro `box_*` entraram nesta lista em 19/11/2026: são a caixa master do
 * fornecedor, não a embalagem individual (1.153 dos 1.197 produtos com os três
 * lados têm `box_quantity > 1`, média 228,6 peças por caixa). Devolvê-las à
 * lista infla o frete em ordens de magnitude.
 */
const COLUNAS_IGNORADAS = [
  'shipping_weight_kg',
  'shipping_width_cm',
  'shipping_height_cm',
  'shipping_length_cm',
  'cubic_weight',
  'box_height_mm',
  'box_width_mm',
  'box_length_mm',
  'box_weight_kg',
  'box_quantity',
  'box_volume_cm3',
];

describe('PRODUCT_MEASURE_COLUMNS', () => {
  it('é exatamente a lista do motor', () => {
    expect([...PRODUCT_MEASURE_COLUMNS]).toEqual([
      'id',
      'name',
      'sku',
      'height_cm',
      'width_cm',
      'length_cm',
      'diameter_cm',
      'weight_g',
      'ships_separately',
    ]);
  });

  it('não lê nenhuma coluna ignorada por decisão', () => {
    for (const ignorada of COLUNAS_IGNORADAS) {
      expect(PRODUCT_MEASURE_COLUMNS).not.toContain(ignorada);
    }
  });

  it('não tem repetição', () => {
    expect(new Set(PRODUCT_MEASURE_COLUMNS).size).toBe(PRODUCT_MEASURE_COLUMNS.length);
  });
});

describe('PRODUCT_MEASURE_SELECT', () => {
  it('é a lista separada por vírgula, pronta para o select', () => {
    expect(PRODUCT_MEASURE_SELECT).toBe(
      'id, name, sku, height_cm, width_cm, length_cm, diameter_cm, weight_g, ships_separately',
    );
  });
});
