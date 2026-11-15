import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type ColorSwatch,
  type ProductWithSwatches,
  useProductColorSwatch,
} from './useProductColorSwatch';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc },
}));

const swatches: ColorSwatch[] = [
  {
    variant_id: 'variant-red-1',
    sku: 'RED-1',
    color_id: 'red-1',
    color_name: 'Vermelho',
    color_hex: '#ff0000',
    stock_quantity: 3,
    image_url: '/red-1.png',
    is_in_stock: true,
  },
  {
    variant_id: 'variant-red-2',
    sku: 'RED-2',
    color_id: 'red-2',
    color_name: 'Vermelho',
    color_hex: '#cc0000',
    stock_quantity: 9,
    image_url: '/red-2.png',
    is_in_stock: true,
  },
];

const product = (overrides: Partial<ProductWithSwatches> = {}): ProductWithSwatches => ({
  id: 'product-1',
  name: 'Produto',
  primary_image_url: '/default.png',
  stock_quantity: 12,
  color_swatches: swatches,
  has_colors: true,
  ...overrides,
});

describe('useProductColorSwatch', () => {
  beforeEach(() => rpc.mockReset());

  it('seleciona e reseta uma variante em modo não controlado', () => {
    const { result } = renderHook(() => useProductColorSwatch(product()));

    act(() => result.current.selectVariant('variant-red-2'));
    expect(result.current.activeVariantId).toBe('variant-red-2');
    expect(result.current.displayStock).toBe(9);

    act(() => result.current.resetActive());
    expect(result.current.activeVariantId).toBeNull();
    expect(result.current.displayStock).toBe(12);
  });

  it('prioriza variant_id e não troca variantes com nomes de cor duplicados', () => {
    const { result } = renderHook(() =>
      useProductColorSwatch(
        product({ selected_color_name: 'Vermelho', selected_variant_id: 'variant-red-2' }),
      ),
    );

    expect(result.current.activeVariant?.sku).toBe('RED-2');
    expect(result.current.displayImage).toBe('/red-2.png');
    expect(result.current.displayStock).toBe(9);
  });

  it('mantém compatibilidade com persistência legada baseada no nome da cor', () => {
    const { result } = renderHook(() =>
      useProductColorSwatch(product({ selected_color_name: '  VERMELHO  ' })),
    );

    expect(result.current.activeVariantId).toBe('variant-red-1');
  });

  it('não troca silenciosamente para outra variante quando o variant_id persistido é inválido', () => {
    const { result } = renderHook(() =>
      useProductColorSwatch(
        product({ selected_color_name: 'Vermelho', selected_variant_id: 'variant-removida' }),
      ),
    );

    expect(result.current.activeVariantId).toBeNull();
    expect(result.current.activeVariant).toBeNull();
  });

  it('aplica reset controlado imediatamente, sem ressuscitar estado local antigo', () => {
    const { result, rerender } = renderHook(
      ({ selectedVariantId }: { selectedVariantId?: string | null }) => {
        const selectionProps =
          selectedVariantId === undefined
            ? {}
            : { selected_color_name: null, selected_variant_id: selectedVariantId };
        return useProductColorSwatch(product(selectionProps));
      },
      { initialProps: { selectedVariantId: undefined } },
    );

    act(() => result.current.selectVariant('variant-red-2'));
    expect(result.current.activeVariantId).toBe('variant-red-2');

    rerender({ selectedVariantId: null });
    expect(result.current.activeVariantId).toBeNull();
    expect(result.current.isFiltered).toBe(false);
  });

  it('isola respostas lazy concorrentes por produto', async () => {
    let resolveFirst!: (value: unknown) => void;
    let resolveSecond!: (value: unknown) => void;
    rpc
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSecond = resolve;
        }),
      );

    const productWithoutSwatches = (id: string): ProductWithSwatches =>
      product({ id, color_swatches: undefined });
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useProductColorSwatch(productWithoutSwatches(id)),
      { initialProps: { id: 'product-a' } },
    );

    let firstRequest!: Promise<void>;
    act(() => {
      firstRequest = result.current.fetchSwatchesIfNeeded();
    });
    rerender({ id: 'product-b' });
    let secondRequest!: Promise<void>;
    act(() => {
      secondRequest = result.current.fetchSwatchesIfNeeded();
    });

    await act(async () => {
      resolveSecond({ data: [{ color_swatches: [swatches[1]] }], error: null });
      await secondRequest;
    });
    expect(result.current.swatches[0]?.variant_id).toBe('variant-red-2');

    await act(async () => {
      resolveFirst({ data: [{ color_swatches: [swatches[0]] }], error: null });
      await firstRequest;
    });
    expect(result.current.swatches[0]?.variant_id).toBe('variant-red-2');

    rerender({ id: 'product-a' });
    await waitFor(() => expect(result.current.swatches[0]?.variant_id).toBe('variant-red-1'));
  });
});
