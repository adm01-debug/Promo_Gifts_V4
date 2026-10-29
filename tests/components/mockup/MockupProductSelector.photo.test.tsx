/**
 * MockupProductSelector — a geração usa a FOTO ORIGINAL escolhida, nunca a miniatura.
 *
 * Defeito-alvo (Codex M04): `handleColorSelect` decidia sozinho entre
 * `selected_thumbnail` e a primeira imagem da variante — e convertia tudo para a
 * MINIATURA do CDN. O resultado ia direto para a geração, sem escolha explícita entre
 * as fotos da mesma variante. Decisão: a galeria mostra só as fotos REAIS disponíveis
 * (resolvidas ao original, sem placeholder, sem repetir a mesma foto em tamanhos
 * diferentes) e o usuário escolhe uma; sem foto utilizável não avança.
 *
 * jsdom não faz layout: `@tanstack/react-virtual` vira um seam que só devolve os itens.
 * O `Dialog` real é usado, para não esconder o caminho do portal do Radix.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { renderWithProviders } from '../render-helpers';
import {
  MockupProductSelector,
  getMockupVariantPhotos,
  type MockupProductSelection,
} from '@/components/mockup/MockupProductSelector';
import type { ExternalVariantStock, Product } from '@/hooks/products';

const PHOTO_A = 'https://imagedelivery.net/abc123/hash-a/public';
const PHOTO_B = 'https://imagedelivery.net/abc123/hash-b/public';
/** `selected_thumbnail` chega como MINIATURA; o original correspondente é /public. */
const PHOTO_C_THUMB = 'https://imagedelivery.net/abc123/hash-c/thumbnail';
const PHOTO_C_ORIGINAL = 'https://imagedelivery.net/abc123/hash-c/public';
const PRODUCT_PHOTO = 'https://imagedelivery.net/abc123/product-main/public';

// Catálogo/variantes controlados pelo teste (o factory do vi.mock roda no import).
const { catalog } = vi.hoisted(() => ({
  catalog: { products: [] as unknown[], product: null as unknown, variants: [] as unknown[] },
}));

vi.mock('@/hooks/products', () => ({
  useProductsCatalog: () => ({
    data: { pages: [{ products: catalog.products, nextOffset: null, totalEstimate: 1 }] },
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
  }),
  useProduct: () => ({ data: catalog.product, isLoading: false }),
  useExternalVariantStock: () => ({ data: catalog.variants, isLoading: false }),
}));

vi.mock('@/hooks/common', () => ({ useDebounce: <T,>(value: T) => value }));

// renderWithProviders monta o SellerCartProvider, que puxa `useSellerCarts` do barrel
// `@/hooks/products` (mockado acima) — substituímos o provider por um passthrough.
vi.mock('@/contexts/SellerCartContext', () => ({
  SellerCartProvider: ({ children }: { children: React.ReactNode }) => children,
  useSellerCart: () => ({}),
}));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({ index, key: index, start: 0, size: 280 })),
    getTotalSize: () => count * 280,
    // A grade da main (#2100) remede as linhas quando a largura muda.
    measure: () => undefined,
  }),
}));

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    name: 'Caneta Azul',
    sku: 'SKU-1',
    price: 12.5,
    stock: 10,
    image_url: PRODUCT_PHOTO,
    images: [PRODUCT_PHOTO],
    ...overrides,
  } as Product;
}

function makeVariant(overrides: Partial<ExternalVariantStock> = {}): ExternalVariantStock {
  return {
    id: 'v1',
    product_id: 'p1',
    sku: 'SKU-1-AZ',
    supplier_sku: null,
    color_code: 'AZ',
    color_name: 'Azul',
    color_hex: '#0000ff',
    size_code: null,
    stock_quantity: 10,
    next_entry_date: null,
    next_entry_quantity: null,
    selected_thumbnail: PHOTO_C_THUMB,
    images: [PHOTO_A, PHOTO_B],
    bitrix_product_id: null,
    ...overrides,
  };
}

/** Percorre o fluxo real: abre o diálogo → escolhe o produto → escolhe a variante. */
async function renderAndPickVariant(onSelect = vi.fn()) {
  renderWithProviders(<MockupProductSelector selection={null} onSelect={onSelect} />);
  fireEvent.click(await screen.findByRole('button', { name: /buscar produto/i }));
  const card = (await screen.findByText('Caneta Azul')).closest('[role="button"]');
  fireEvent.click(card as HTMLElement);
  fireEvent.click((await screen.findByText('Azul')).closest('button') as HTMLElement);
  return onSelect;
}

/** Seleção com que `onSelect` foi chamada na n-ésima vez. */
const picked = (onSelect: ReturnType<typeof vi.fn>, call = 0) =>
  onSelect.mock.calls[call][0] as MockupProductSelection;

describe('getMockupVariantPhotos', () => {
  it('devolve o original e não repete a mesma foto em tamanhos diferentes', () => {
    const photos = getMockupVariantPhotos(
      makeVariant({
        images: [
          PHOTO_A,
          'https://imagedelivery.net/abc123/hash-a/thumbnail',
          '',
          '/placeholder.svg',
        ],
        selected_thumbnail: PHOTO_C_THUMB,
      }),
      makeProduct(),
    );

    // hash-a aparece uma vez só e em /public; hash-c volta do /thumbnail ao /public.
    expect(photos).toEqual([PHOTO_A, PHOTO_C_ORIGINAL]);
  });

  it('só cai nas fotos do produto quando a variante não tem nenhuma foto', () => {
    const photos = getMockupVariantPhotos(
      makeVariant({ images: null, selected_thumbnail: null }),
      makeProduct(),
    );
    expect(photos).toEqual([PRODUCT_PHOTO]);
  });

  it('sem foto nenhuma devolve lista vazia (nunca inventa placeholder)', () => {
    expect(getMockupVariantPhotos(null, makeProduct({ images: null, image_url: null }))).toEqual(
      [],
    );
  });
});

describe('MockupProductSelector — galeria de fotos reais (Codex M04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    catalog.product = makeProduct();
    catalog.products = [catalog.product];
    catalog.variants = [makeVariant()];
  });

  it('mostra só as fotos reais da variante (nem a do produto, nem placeholder)', async () => {
    await renderAndPickVariant();

    const options = screen.getAllByTestId('mockup-photo-option');
    expect(options).toHaveLength(3); // images[] (2 fotos) + selected_thumbnail (1)

    const thumbSrcs = options.map((option) => option.querySelector('img')?.getAttribute('src'));
    expect(thumbSrcs).toEqual([
      'https://imagedelivery.net/abc123/hash-a/thumbnail',
      'https://imagedelivery.net/abc123/hash-b/thumbnail',
      PHOTO_C_THUMB,
    ]);
    expect(thumbSrcs.some((src) => src?.includes('product-main'))).toBe(false);
    expect(thumbSrcs.some((src) => src?.includes('placeholder'))).toBe(false);
  });

  it('a foto enviada à geração é a ORIGINAL escolhida, não a miniatura', async () => {
    const onSelect = await renderAndPickVariant();
    fireEvent.click(screen.getByRole('button', { name: 'Usar foto 3 de 3' }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    // A opção exibida era /thumbnail; o que vai para a geração é o original dela.
    expect(picked(onSelect).imageUrl).toBe(PHOTO_C_ORIGINAL);
    expect(picked(onSelect).imageUrl.endsWith('/thumbnail')).toBe(false);
    expect(picked(onSelect).variant?.id).toBe('v1');
    expect(picked(onSelect).colorName).toBe('Azul');
  });

  it('permite escolher entre as fotos da MESMA variante', async () => {
    const onSelect = await renderAndPickVariant();
    fireEvent.click(screen.getByRole('button', { name: 'Usar foto 1 de 3' }));

    expect(picked(onSelect).imageUrl).toBe(PHOTO_A);
  });

  it('produto sem foto utilizável não deixa avançar', async () => {
    catalog.product = makeProduct({ images: null, image_url: null });
    catalog.products = [catalog.product];
    catalog.variants = [makeVariant({ images: null, selected_thumbnail: null })];

    const onSelect = await renderAndPickVariant();

    expect(screen.getByRole('alert')).toHaveTextContent(/não tem foto utilizável/i);
    expect(screen.queryAllByTestId('mockup-photo-option')).toHaveLength(0);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('MockupProductSelector — prévia x geração', () => {
  it('a prévia pequena usa a miniatura, mas a seleção continua com o original', () => {
    const selection: MockupProductSelection = {
      product: makeProduct(),
      variant: makeVariant(),
      colorName: 'Azul',
      colorHex: '#0000ff',
      imageUrl: PHOTO_C_ORIGINAL,
    };

    renderWithProviders(<MockupProductSelector selection={selection} onSelect={vi.fn()} />);
    expect(screen.getByAltText('Caneta Azul').getAttribute('src')).toBe(PHOTO_C_THUMB);
  });
});
