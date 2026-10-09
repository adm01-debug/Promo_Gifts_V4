/**
 * Estados reais do passo Produto (Codex p.7) — MockupProductSelector.
 *   1. sem produto          → o passo ORIENTA a busca (não fica mudo)
 *   2. carregando           → skeleton anunciado como status, sem opção incompleta clicável
 *   3. sem foto utilizável  → alerta oferece outra foto/outro produto; NÃO avança com placeholder
 *   4. troca de variante    → emite seleção completa (produto+variante+cor+foto) e preserva
 *                             cliente e logo de quem hospeda o componente
 */
import { it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import {
  MockupProductSelector,
  type MockupProductSelection,
} from '@/components/mockup/MockupProductSelector';
import type { ExternalVariantStock, Product } from '@/hooks/products';

// Estado mutável controlado por cada teste (hoisted: vi.mock é elevado acima dos imports).
const catalog = vi.hoisted(() => ({
  products: [] as unknown[],
  isLoadingProducts: false,
  fullProduct: null as unknown,
  variants: [] as unknown[],
}));

vi.mock('@/hooks/products', () => ({
  useProductsCatalog: () => ({
    data: { pages: [{ products: catalog.products }] },
    isLoading: catalog.isLoadingProducts,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  }),
  useProduct: () => ({ data: catalog.fullProduct, isLoading: false }),
  useExternalVariantStock: () => ({ data: catalog.variants, isLoading: false }),
}));

vi.mock('@/hooks/common', () => ({ useDebounce: (value: string) => value }));

// A virtualização esconderia os cards em jsdom (altura 0) — renderiza todas as linhas.
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 280,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({ index, key: index, start: index * 280 })),
  }),
}));

const CDN = {
  azul: 'https://imagedelivery.net/acct/img-azul/public',
  vermelho: 'https://imagedelivery.net/acct/img-vermelho/public',
};

const makeProduct = (o: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'Caneta Metal',
  shortDescription: 'Caneta de metal',
  price: 10,
  images: [CDN.azul],
  sku: 'CAN-001',
  stock: 100,
  colors: [],
  materials: [],
  minQuantity: 1,
  stockStatus: 'in-stock',
  featured: false,
  newArrival: false,
  onSale: false,
  isKit: false,
  category: { id: 'c1', name: 'Escrita' },
  supplier: { id: 's1', name: 'Fornecedor' },
  tags: { publicoAlvo: [], datasComemorativas: [], endomarketing: [], ramo: [], nicho: [] },
  ...o,
});

const makeVariant = (o: Partial<ExternalVariantStock> = {}): ExternalVariantStock => ({
  id: 'v1',
  product_id: 'p1',
  sku: 'CAN-001-AZ',
  supplier_sku: null,
  color_code: '1',
  color_name: 'Azul',
  color_hex: '#2563eb',
  size_code: null,
  stock_quantity: 10,
  next_entry_date: null,
  next_entry_quantity: null,
  selected_thumbnail: null,
  images: [CDN.azul],
  bitrix_product_id: null,
  ...o,
});

/** Hospeda a seleção + cliente e logo — que vivem FORA do selector (em useMockupGenerator). */
function Harness({
  initial,
  onSelectSpy,
}: {
  initial: MockupProductSelection | null;
  onSelectSpy?: (selection: MockupProductSelection | null) => void;
}) {
  const [selection, setSelection] = useState<MockupProductSelection | null>(initial);
  return (
    <>
      <span data-testid="client">Cliente Acme</span>
      <span data-testid="logo">logo-acme.png</span>
      <span data-testid="variant">{selection?.variant?.id ?? 'none'}</span>
      <span data-testid="image-url">{selection?.imageUrl ?? 'none'}</span>
      <MockupProductSelector
        selection={selection}
        onSelect={(next) => {
          onSelectSpy?.(next);
          setSelection(next);
        }}
      />
    </>
  );
}

beforeEach(() => {
  catalog.products = [];
  catalog.isLoadingProducts = false;
  catalog.fullProduct = null;
  catalog.variants = [];
});

it('sem produto: orienta a busca em vez de deixar o passo mudo', () => {
  render(<Harness initial={null} />);

  const hint = screen.getByText(/Nenhum produto selecionado/i);
  expect(hint).toHaveAttribute('id', 'mockup-product-empty-hint');
  // O gatilho de busca é descrito pela orientação.
  expect(screen.getByRole('button', { name: /Buscar produto/i })).toHaveAttribute(
    'aria-describedby',
    'mockup-product-empty-hint',
  );
});

it('carregando: anuncia o skeleton como status e não mostra opção incompleta clicável', async () => {
  catalog.isLoadingProducts = true;
  render(<Harness initial={null} />);
  fireEvent.click(screen.getByRole('button', { name: /Buscar produto/i }));

  const status = await screen.findByRole('status', { name: /Carregando produtos/i });
  expect(status).toHaveAttribute('aria-busy', 'true');
  // "sem opção incompleta": nada dentro do estado de carregamento é clicável.
  expect(within(status).queryAllByRole('button')).toHaveLength(0);
});

it('sem foto utilizável: oferece outra foto/outro produto e NÃO avança com placeholder', async () => {
  catalog.products = [makeProduct({ images: ['/placeholder.svg'] })];
  catalog.fullProduct = makeProduct({ images: [] });
  catalog.variants = [
    makeVariant({ images: [], selected_thumbnail: '/placeholder.svg', stock_quantity: 4 }),
  ];
  const onSelectSpy = vi.fn();
  render(<Harness initial={null} onSelectSpy={onSelectSpy} />);

  fireEvent.click(screen.getByRole('button', { name: /Buscar produto/i }));
  fireEvent.click(await screen.findByRole('button', { name: /Caneta Metal/ }));
  fireEvent.click(await screen.findByRole('button', { name: /Azul/ }));

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent(/Sem foto utilizável/i);
  expect(onSelectSpy).not.toHaveBeenCalled(); // nunca avança com `/placeholder.svg`
  expect(screen.getByRole('button', { name: /Escolher outra foto/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Escolher outro produto/i })).toBeInTheDocument();
});

it('troca de variante: emite seleção completa com foto original e preserva cliente e logo', async () => {
  const product = makeProduct();
  const azul = makeVariant({ id: 'v1', color_name: 'Azul' });
  const vermelho = makeVariant({ id: 'v2', color_name: 'Vermelho', images: [CDN.vermelho] });
  catalog.products = [product];
  catalog.fullProduct = product;
  catalog.variants = [azul, vermelho];
  const onSelectSpy = vi.fn();
  render(
    <Harness
      initial={{ product, variant: azul, colorName: 'Azul', imageUrl: CDN.azul }}
      onSelectSpy={onSelectSpy}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: /Trocar variante de Caneta Metal/i }));
  fireEvent.click(await screen.findByRole('button', { name: /Vermelho/ }));
  await waitFor(() => expect(screen.getByTestId('variant')).toHaveTextContent('v2'));

  expect(onSelectSpy).toHaveBeenCalledTimes(1);
  const emitted: MockupProductSelection = onSelectSpy.mock.calls[0][0];
  expect(emitted.product.id).toBe('p1'); // produto preservado: técnica/área/revisão derivam dele
  expect(emitted.variant?.id).toBe('v2'); // variante e cor trocadas
  expect(emitted.colorName).toBe('Vermelho');
  expect(emitted.imageUrl).toBe(CDN.vermelho); // foto ORIGINAL, não miniatura/placeholder
  expect(screen.getByTestId('client')).toHaveTextContent('Cliente Acme');
  expect(screen.getByTestId('logo')).toHaveTextContent('logo-acme.png');
});
