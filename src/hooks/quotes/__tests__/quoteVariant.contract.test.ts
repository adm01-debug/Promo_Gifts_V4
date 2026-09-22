import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildItemsInsertPayload } from '../quoteHelpers';
import { useQuoteItems } from '../useQuoteItems';
import type { ExternalVariantStock } from '@/hooks/products';
import type { QuoteItem } from '../quoteTypes';

vi.mock('sonner', () => ({ toast: { info: vi.fn(), error: vi.fn() } }));

const product = { id: 'p', sku: 'BASE', name: 'Camiseta', price: 15, images: [] };
const variant = (id: string): ExternalVariantStock => ({
  id,
  product_id: 'p',
  sku: `SKU-${id}`,
  color_name: 'PRETO',
  color_hex: '#000000',
  size_code: 'G',
  supplier_sku: null,
  color_code: null,
  stock_quantity: 10,
  next_entry_date: null,
  next_entry_quantity: null,
  selected_thumbnail: null,
  images: [],
  bitrix_product_id: null,
});

describe('identidade de variante no contrato de orçamento', () => {
  it('mantém a identidade entre seleção e payload de persistência', () => {
    const { result } = renderHook(() => useQuoteItems());
    act(() => result.current.addProductWithColor(product, variant('v1')));
    expect(result.current.items[0]).toMatchObject({ product_variant_id: 'v1', size_code: 'G' });
    expect(buildItemsInsertPayload(result.current.items, 'q')[0]).toMatchObject({
      product_variant_id: 'v1',
      size_code: 'G',
    });
  });

  it('não funde IDs distintos que compartilham cor e tamanho', () => {
    const { result } = renderHook(() => useQuoteItems());
    act(() => result.current.addProductWithColor(product, variant('v1')));
    act(() => result.current.addProductWithColor(product, variant('v2')));
    act(() => result.current.addProductWithColor(product, variant('v1')));
    expect(result.current.items).toHaveLength(2);
    expect(result.current.items.map((item) => item.quantity)).toEqual([2, 1]);
  });

  it('não mistura legado sem ID com seleção que tem identidade explícita', () => {
    const seed: QuoteItem = {
      product_id: 'p',
      product_name: 'Camiseta',
      color_name: 'PRETO',
      size_code: 'G',
      quantity: 1,
      unit_price: 15,
    };
    const { result } = renderHook(() => useQuoteItems([seed]));
    act(() => result.current.addProductWithColor(product, variant('v1')));
    expect(result.current.items).toHaveLength(2);
  });

  it('legado sem variante continua aceito com NULL explícito', () => {
    const item: QuoteItem = {
      product_id: 'p',
      product_name: 'Camiseta',
      color_name: 'PRETO',
      quantity: 1,
      unit_price: 15,
    };
    expect(buildItemsInsertPayload([item], 'q')[0].product_variant_id).toBeNull();
  });
});
