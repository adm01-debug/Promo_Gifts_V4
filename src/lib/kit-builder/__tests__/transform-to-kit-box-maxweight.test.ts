/**
 * D1 (2026-11-21): maxWeight do Kit Builder vem de `products.box_weight_kg`
 * (carga util maxima da caixa de brinde, em kg). shipping_boxes e outra coisa
 * (caixa de TRANSPORTE do frete). Sem o campo, a regra de peso em
 * useKitBuilder.ts:140 nunca disparava.
 */
import { describe, expect, it } from 'vitest';

import { transformToKitBox } from '@/hooks/kit-builder/useKitBuilderTransformers';
import type { ExternalProductForKit } from '@/lib/kit-builder';

function packagingBox(overrides: Partial<ExternalProductForKit> = {}): ExternalProductForKit {
  return {
    id: 'box-1',
    name: 'Caixa em cartao',
    sku: 'CAIXA-1',
    sale_price: 12.5,
    image_url: null,
    primary_image_url: null,
    internal_width_cm: 30,
    internal_height_cm: 20,
    internal_length_cm: 40,
    product_type: 'packaging',
    box_weight_kg: 12.5,
    ...overrides,
  };
}

describe('transformToKitBox maxWeight (D1)', () => {
  it('preenche maxWeight em gramas a partir de box_weight_kg (kg)', () => {
    const box = transformToKitBox(packagingBox({ box_weight_kg: 12.5 }));
    expect(box?.maxWeight).toBe(12500);
  });

  it('box_weight_kg ausente/nulo deixa maxWeight indefinido (limite desconhecido)', () => {
    expect(transformToKitBox(packagingBox({ box_weight_kg: null }))?.maxWeight).toBeUndefined();
    expect(transformToKitBox(packagingBox({ box_weight_kg: undefined }))?.maxWeight).toBeUndefined();
  });

  it('valores invalidos (zero/negativo/NaN) nao viram maxWeight falso', () => {
    expect(transformToKitBox(packagingBox({ box_weight_kg: 0 }))?.maxWeight).toBeUndefined();
    expect(transformToKitBox(packagingBox({ box_weight_kg: -1 }))?.maxWeight).toBeUndefined();
  });
});
