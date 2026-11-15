/**
 * MockupProductSelector — trocar a variante de um produto JÁ confirmado.
 *
 * Defeito-alvo: a ficha do produto confirmado só oferecia "Remover produto". Para mudar
 * a cor, o vendedor tinha de limpar a seleção e refazer o passo inteiro — perdendo o
 * cliente e a logo que já havia configurado (ambos vivem FORA deste componente, em
 * useMockupGenerator). Duas partes: o botão "Trocar variante" e o passo pendente VENCER
 * a ficha — com `if (selection)` sozinho, a ficha voltava a renderizar e o clique não
 * abria nada.
 *
 * Na main a confirmação tem dois passos (cor → FOTO real), então a troca atravessa
 * ProductLoaderAndColorSelector e MockupPhotoPicker antes de emitir a seleção.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { renderWithProviders } from '../render-helpers';
import {
  MockupProductSelector,
  type MockupProductSelection,
} from '@/components/mockup/MockupProductSelector';
import type { ExternalVariantStock, Product } from '@/hooks/products';

const PHOTO_AZUL = 'https://imagedelivery.net/abc123/img-azul/public';
const PHOTO_VERMELHO = 'https://imagedelivery.net/abc123/img-vermelho/public';

// Catálogo/variantes controlados pelo teste (o factory do vi.mock roda no import).
const { catalog } = vi.hoisted(() => ({
  catalog: { product: null as unknown, variants: [] as unknown[] },
}));

vi.mock('@/hooks/products', () => ({
  useProductsCatalog: () => ({
    data: { pages: [{ products: [], nextOffset: null, totalEstimate: 0 }] },
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
    measure: () => undefined,
  }),
}));

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    name: 'Caneta Metal',
    sku: 'CAN-001',
    price: 10,
    stock: 100,
    images: [PHOTO_AZUL],
    ...overrides,
  } as Product;
}

function makeVariant(overrides: Partial<ExternalVariantStock> = {}): ExternalVariantStock {
  return {
    id: 'v1',
    product_id: 'p1',
    sku: 'CAN-001-AZ',
    supplier_sku: null,
    color_code: 'AZ',
    color_name: 'Azul',
    color_hex: '#2563eb',
    size_code: null,
    stock_quantity: 10,
    next_entry_date: null,
    next_entry_quantity: null,
    selected_thumbnail: null,
    images: [PHOTO_AZUL],
    bitrix_product_id: null,
    ...overrides,
  };
}

const PRODUCT = makeProduct();
const AZUL = makeVariant();
const VERMELHO = makeVariant({
  id: 'v2',
  sku: 'CAN-001-VM',
  color_code: 'VM',
  color_name: 'Vermelho',
  color_hex: '#dc2626',
  images: [PHOTO_VERMELHO],
});

/**
 * Hospeda a seleção — e o cliente/logo, que vivem FORA do selector. Se a troca de
 * variante exigisse limpar a seleção, estes dois iriam embora junto.
 */
function Harness({ onSelectSpy }: { onSelectSpy: (next: MockupProductSelection | null) => void }) {
  const [selection, setSelection] = useState<MockupProductSelection | null>({
    product: PRODUCT,
    variant: AZUL,
    colorName: 'Azul',
    colorHex: '#2563eb',
    imageUrl: PHOTO_AZUL,
  });
  return (
    <>
      <span data-testid="client">Cliente Acme</span>
      <span data-testid="logo">logo-acme.png</span>
      <span data-testid="variant">{selection?.variant?.id ?? 'none'}</span>
      <span data-testid="image-url">{selection?.imageUrl ?? 'none'}</span>
      <MockupProductSelector
        selection={selection}
        onSelect={(next) => {
          onSelectSpy(next);
          setSelection(next);
        }}
      />
    </>
  );
}

describe('MockupProductSelector — trocar variante de produto confirmado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    catalog.product = PRODUCT;
    catalog.variants = [AZUL, VERMELHO];
  });

  it('o passo pendente vence a ficha: o clique abre a escolha de cor sem apagar a seleção', async () => {
    const onSelect = vi.fn();
    renderWithProviders(<Harness onSelectSpy={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Trocar variante de Caneta Metal' }));

    // A ficha deu lugar ao passo de cor...
    expect(await screen.findByRole('button', { name: /Vermelho/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remover produto selecionado' })).toBeNull();
    // ...mas a seleção atual continua de pé até a nova cor/foto ser confirmada.
    expect(screen.getByTestId('variant')).toHaveTextContent('v1');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('"Voltar" desiste da troca e devolve a ficha com a seleção intacta', async () => {
    const onSelect = vi.fn();
    renderWithProviders(<Harness onSelectSpy={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Trocar variante de Caneta Metal' }));
    fireEvent.click(await screen.findByRole('button', { name: /Voltar/ }));

    expect(
      await screen.findByRole('button', { name: 'Remover produto selecionado' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('variant')).toHaveTextContent('v1');
    expect(screen.getByTestId('image-url')).toHaveTextContent(PHOTO_AZUL);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('emite seleção completa com a foto ORIGINAL da nova cor e preserva cliente e logo', async () => {
    const onSelect = vi.fn();
    renderWithProviders(<Harness onSelectSpy={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Trocar variante de Caneta Metal' }));
    fireEvent.click(await screen.findByRole('button', { name: /Vermelho/ }));
    // Passo da FOTO real (main): a variante vermelha tem uma única foto utilizável.
    fireEvent.click(await screen.findByRole('button', { name: 'Usar foto 1 de 1' }));

    await waitFor(() => expect(screen.getByTestId('variant')).toHaveTextContent('v2'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    const emitted = onSelect.mock.calls[0][0] as MockupProductSelection;
    expect(emitted.product.id).toBe('p1'); // produto preservado: técnica/área derivam dele
    expect(emitted.variant?.id).toBe('v2');
    expect(emitted.colorName).toBe('Vermelho');
    expect(emitted.imageUrl).toBe(PHOTO_VERMELHO); // original, nunca a miniatura
    // Cliente e logo vivem fora do selector e não foram tocados pela troca.
    expect(screen.getByTestId('client')).toHaveTextContent('Cliente Acme');
    expect(screen.getByTestId('logo')).toHaveTextContent('logo-acme.png');
  });
});
