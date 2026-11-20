import { describe, expect, it } from 'vitest';

import type { ProductMeasureRow } from '../columns';
import { getFreightReadiness } from '../readiness';

const BASE: ProductMeasureRow = {
  id: 'p-1',
  sku: 'SKU-1',
  name: 'Produto de teste',
  height_cm: null,
  width_cm: null,
  length_cm: null,
  diameter_cm: null,
  weight_g: null,
};

describe('getFreightReadiness', () => {
  it.each([
    {
      caso: 'três lados e peso → pronto como peça nua',
      row: { ...BASE, height_cm: 10, width_cm: 5, length_cm: 3, weight_g: 120 },
      esperado: { ready: true, missing: [], source: 'product' },
    },
    {
      caso: 'altura + diâmetro e peso → pronto como cilíndrico',
      row: { ...BASE, height_cm: 17.6, diameter_cm: 6.6, weight_g: 67 },
      esperado: { ready: true, missing: [], source: 'cylinder' },
    },
    {
      caso: 'três lados sem peso → falta só o peso',
      row: { ...BASE, height_cm: 10, width_cm: 5, length_cm: 3 },
      esperado: { ready: false, missing: ['weight'], source: null },
    },
    {
      caso: 'só altura e peso → faltam largura e comprimento',
      row: { ...BASE, height_cm: 10, weight_g: 50 },
      esperado: { ready: false, missing: ['width', 'length'], source: null },
    },
    {
      caso: 'zero é ausência: tudo 0 → faltam altura, largura, comprimento e peso',
      row: { ...BASE, height_cm: 0, width_cm: 0, length_cm: 0, weight_g: 0 },
      esperado: { ready: false, missing: ['height', 'width', 'length', 'weight'], source: null },
    },
  ])('$caso', ({ row, esperado }) => {
    expect(getFreightReadiness(row)).toEqual(esperado);
  });
});
