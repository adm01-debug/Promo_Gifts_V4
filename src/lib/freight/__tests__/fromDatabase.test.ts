/**
 * fromDatabase.test.ts — tradução da linha do banco para os tipos do motor.
 *
 * A caixa usada é a GG real (externa 40 × 50 × 60 cm, parede de 3 mm, 30 kg):
 * os três lados são diferentes, então trocar altura por largura ou comprimento
 * no mapeador quebra o teste.
 */
import { describe, expect, it } from 'vitest';

import type { Database } from '@/integrations/supabase/types';

import { volumeInternoCm3 } from '../boxOrder';
import { toFreightSettings, toShippingBox, type ShippingBoxSource } from '../fromDatabase';

type ShippingBoxesRow = Database['public']['Tables']['shipping_boxes']['Row'];
type FreightSettingsDbRow = Database['public']['Tables']['freight_settings']['Row'];

/**
 * Linha completa como o PostgREST devolve. Internas = externa − 2 × 3 mm:
 * 40 − 0,6 = 39,4 · 50 − 0,6 = 49,4 · 60 − 0,6 = 59,4.
 */
function linhaGG(overrides: Partial<ShippingBoxesRow> = {}): ShippingBoxesRow {
  return {
    id: 'box-gg',
    code: 'GG',
    name: 'Caixa GG',
    outer_height_cm: 40,
    outer_width_cm: 50,
    outer_length_cm: 60,
    wall_thickness_mm: 3,
    inner_height_cm: 39.4,
    inner_width_cm: 49.4,
    inner_length_cm: 59.4,
    empty_weight_g: 350,
    max_weight_g: 30000,
    fill_factor: 0.9,
    is_active: true,
    sort_order: 4,
    created_at: '2026-11-19T21:30:00Z',
    updated_at: '2026-11-19T21:30:00Z',
    deleted_at: null,
    ...overrides,
  };
}

describe('toShippingBox', () => {
  it('mapeia cada coluna para o campo certo do motor', () => {
    expect(toShippingBox(linhaGG())).toEqual({
      id: 'box-gg',
      code: 'GG',
      name: 'Caixa GG',
      inner: { heightCm: 39.4, widthCm: 49.4, lengthCm: 59.4 },
      outer: { heightCm: 40, widthCm: 50, lengthCm: 60 },
      emptyWeightG: 350,
      maxWeightG: 30000,
      fillFactor: 0.9,
    });
  });

  it('a caixa mapeada tem o volume interno que o motor espera', () => {
    const box = toShippingBox(linhaGG());
    // 39,4 × 49,4 = 1.946,36 ; 1.946,36 × 59,4 = 115.613,784 cm³ (115,6 L)
    expect(box).not.toBeNull();
    expect(volumeInternoCm3(box!)).toBeCloseTo(115613.784, 3);
  });

  it('aceita só as colunas que o motor lê, sem a linha inteira', () => {
    const minima: ShippingBoxSource = {
      id: 'box-p',
      code: 'P',
      name: 'Caixa P',
      // Externa 27 × 33 × 33 com parede de 3 mm: 27 − 0,6 = 26,4 ; 33 − 0,6 = 32,4
      outer_height_cm: 27,
      outer_width_cm: 33,
      outer_length_cm: 33,
      inner_height_cm: 26.4,
      inner_width_cm: 32.4,
      inner_length_cm: 32.4,
      empty_weight_g: 0,
      max_weight_g: 10000,
      fill_factor: 0.9,
    };
    expect(toShippingBox(minima)).toEqual({
      id: 'box-p',
      code: 'P',
      name: 'Caixa P',
      inner: { heightCm: 26.4, widthCm: 32.4, lengthCm: 32.4 },
      outer: { heightCm: 27, widthCm: 33, lengthCm: 33 },
      emptyWeightG: 0,
      maxWeightG: 10000,
      fillFactor: 0.9,
    });
  });

  it.each([
    ['inner_height_cm nula', { inner_height_cm: null }],
    ['inner_width_cm nula', { inner_width_cm: null }],
    ['inner_length_cm nula', { inner_length_cm: null }],
    ['inner_height_cm zero', { inner_height_cm: 0 }],
    ['inner_width_cm zero', { inner_width_cm: 0 }],
    ['inner_length_cm zero', { inner_length_cm: 0 }],
    ['inner_height_cm negativa', { inner_height_cm: -0.1 }],
    ['inner_width_cm negativa', { inner_width_cm: -0.1 }],
    ['inner_length_cm negativa', { inner_length_cm: -0.1 }],
    ['inner_height_cm NaN', { inner_height_cm: Number.NaN }],
  ] satisfies Array<[string, Partial<ShippingBoxesRow>]>)(
    'devolve null com %s',
    (_caso, overrides) => {
      expect(toShippingBox(linhaGG(overrides))).toBeNull();
    },
  );

  it.each([
    ['inativa', { is_active: false }],
    ['excluída', { deleted_at: '2026-11-19T22:00:00Z' }],
  ] satisfies Array<[string, Partial<ShippingBoxesRow>]>)(
    'não filtra caixa %s: quem escolhe as caixas é quem consulta',
    (_caso, overrides) => {
      expect(toShippingBox(linhaGG(overrides))?.code).toBe('GG');
    },
  );
});

describe('toFreightSettings', () => {
  const linha: FreightSettingsDbRow = {
    id: true,
    origin_cep: '03377-000',
    cubic_divisor_correios: 6000,
    cubic_divisor_rodoviario: 3333,
    default_fill_factor: 0.9,
    internal_buffer_days: 2,
    multi_personalization_rule: 'max',
    updated_at: '2026-11-19T21:31:00Z',
    updated_by: null,
  };

  it('devolve só os três parâmetros que o motor usa', () => {
    expect(toFreightSettings(linha)).toEqual({
      cubicDivisorCorreios: 6000,
      cubicDivisorRodoviario: 3333,
      defaultFillFactor: 0.9,
    });
  });

  it('não confunde os dois divisores', () => {
    const settings = toFreightSettings({
      cubic_divisor_correios: 5000,
      cubic_divisor_rodoviario: 3000,
      default_fill_factor: 0.85,
    });
    expect(settings.cubicDivisorCorreios).toBe(5000);
    expect(settings.cubicDivisorRodoviario).toBe(3000);
    expect(settings.defaultFillFactor).toBe(0.85);
  });
});
