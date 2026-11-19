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

/** Colunas que a decisão de projeto manda ignorar (ver README do módulo). */
const COLUNAS_LEGADAS = [
  'shipping_weight_kg',
  'shipping_width_cm',
  'shipping_height_cm',
  'shipping_length_cm',
  'cubic_weight',
];

describe('PRODUCT_MEASURE_COLUMNS', () => {
  it('é exatamente a lista do bloco A', () => {
    expect([...PRODUCT_MEASURE_COLUMNS]).toEqual([
      'id',
      'name',
      'sku',
      'height_cm',
      'width_cm',
      'length_cm',
      'diameter_cm',
      'weight_g',
      'box_height_mm',
      'box_width_mm',
      'box_length_mm',
      'box_weight_kg',
    ]);
  });

  it('não lê nenhuma coluna legada de frete', () => {
    for (const legada of COLUNAS_LEGADAS) {
      expect(PRODUCT_MEASURE_COLUMNS).not.toContain(legada);
    }
  });

  it('não tem repetição', () => {
    expect(new Set(PRODUCT_MEASURE_COLUMNS).size).toBe(PRODUCT_MEASURE_COLUMNS.length);
  });
});

describe('PRODUCT_MEASURE_SELECT', () => {
  it('é a lista separada por vírgula, pronta para o select', () => {
    expect(PRODUCT_MEASURE_SELECT).toBe(
      'id, name, sku, height_cm, width_cm, length_cm, diameter_cm, weight_g, box_height_mm, box_width_mm, box_length_mm, box_weight_kg',
    );
  });
});
