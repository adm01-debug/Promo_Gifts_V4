/**
 * expandQuantities.test.ts — multiplicação por número de kits e validação de
 * quantidade. O erro é retornado, nunca lançado.
 */
import { describe, expect, it } from 'vitest';

import { expandQuantities } from '../expandQuantities';
import type { PackItem } from '../types';

function item(overrides: Partial<PackItem> = {}): PackItem {
  return {
    productId: '8e3ff0f1-bba8-4413-8e44-b337c6b077ea',
    name: 'Caderneta kraft B6 com porta caneta',
    sku: '02601',
    quantity: 2,
    dims: { heightCm: 17.5, widthCm: 13.5, lengthCm: 13.5 },
    weightG: 162,
    shipsSeparately: false,
    source: 'product',
    ...overrides,
  };
}

describe('expandQuantities', () => {
  it('1 kit mantém as quantidades', () => {
    const result = expandQuantities([item({ quantity: 3 })], 1);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.items.map((i) => i.quantity)).toEqual([3]);
  });

  it('50 kits multiplicam cada linha', () => {
    const result = expandQuantities(
      [item({ quantity: 3 }), item({ quantity: 1, sku: '00001' })],
      50,
    );

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    // 3 × 50 = 150 e 1 × 50 = 50
    expect(result.items.map((i) => i.quantity)).toEqual([150, 50]);
  });

  it('kitQuantity padrão é 1', () => {
    const result = expandQuantities([item({ quantity: 7 })]);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.items[0]?.quantity).toBe(7);
  });

  it('não muta a entrada', () => {
    const entrada = item({ quantity: 4 });
    expandQuantities([entrada], 10);

    expect(entrada.quantity).toBe(4);
  });

  it('zero kits devolve ValidationError, sem lançar', () => {
    const result = expandQuantities([item()], 0);

    expect(result).toEqual({
      status: 'error',
      error: {
        code: 'invalid_kit_quantity',
        message: 'Quantidade de kits inválida: 0. Informe um número inteiro maior que zero.',
      },
    });
  });

  it('2,5 kits devolve ValidationError, sem lançar', () => {
    const result = expandQuantities([item()], 2.5);

    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.error.code).toBe('invalid_kit_quantity');
  });

  it('quantidade de item inválida nomeia o produto', () => {
    const result = expandQuantities([item({ quantity: 0 })], 10);

    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.error.code).toBe('invalid_item_quantity');
    expect(result.error.productId).toBe('8e3ff0f1-bba8-4413-8e44-b337c6b077ea');
  });

  it('quantidade de item fracionária é recusada', () => {
    const result = expandQuantities([item({ quantity: 1.5 })], 1);

    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.error.code).toBe('invalid_item_quantity');
  });

  it('lista vazia é válida: zero volumes, não erro', () => {
    const result = expandQuantities([], 10);

    expect(result).toEqual({ status: 'ok', items: [] });
  });
});
