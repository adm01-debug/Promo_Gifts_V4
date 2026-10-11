/**
 * MockupProductSelector — grade responsiva (2/3/4 colunas), estoque/preço visíveis
 * e rótulo de ordenação honesto quanto ao alcance.
 *
 * O defeito-alvo: a virtualização fatiava as linhas com 4 colunas FIXAS, mesmo quando o
 * grid renderizava 2 (`grid-cols-2`) ou 3 (`sm:grid-cols-3`) colunas. Cada linha virtual
 * virava 2 sub-linhas de cards dentro de 280 px e as linhas se sobrepunham.
 *
 * jsdom não faz layout (`offsetWidth/offsetHeight` = 0) e o `@tanstack/react-virtual` não
 * renderiza NADA quando a viewport medida é 0 (`calculateRange` devolve `null`:
 * `if (measurements.length === 0 || outerSize === 0) return null`). Por isso o harness
 * define dimensões de layout logo abaixo — sem isso a grade nem aparece no teste.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { renderWithProviders } from '../render-helpers';
import {
  MockupProductSelector,
  getMockupGridColumnCount,
  MOCKUP_GRID_BREAKPOINT_LG,
  MOCKUP_GRID_BREAKPOINT_SM,
} from '@/components/mockup/MockupProductSelector';

// Catálogo controlado pelo teste (holder hoisted: o factory do vi.mock roda no import).
const { catalog } = vi.hoisted(() => ({
  catalog: { products: [] as Array<Record<string, unknown>> },
}));

vi.mock('@/hooks/products', () => ({
  useProductsCatalog: () => ({
    data: {
      pages: [
        { products: catalog.products, nextOffset: null, totalEstimate: catalog.products.length },
      ],
    },
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
  }),
  useProduct: () => ({ data: null, isLoading: false }),
  useExternalVariantStock: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/common', () => ({
  useDebounce: <T,>(value: T) => value,
}));

// renderWithProviders monta o SellerCartProvider, que puxa `useSellerCarts` do barrel
// `@/hooks/products` (mockado acima). Substituímos o provider por um passthrough.
vi.mock('@/contexts/SellerCartContext', () => ({
  SellerCartProvider: ({ children }: { children: React.ReactNode }) => children,
  useSellerCart: () => ({}),
}));

// Stub do Dialog (Radix). O `@radix-ui/react-portal` só monta o conteúdo no SEGUNDO commit
// (`useState(false)` + `useLayoutEffect(setMounted(true))`), então o `getScrollElement()` do
// virtualizador enxerga `null` no commit em que o diálogo abre — a grade só aparece num
// re-render posterior. Esse comportamento do portal é pré-existente e alheio a este cartão;
// aqui ele só tornaria o teste dependente de um re-render artificial. O stub mantém o foco
// no que o cartão prova: a fatia das linhas por colunas reais, o estoque/preço e a ordenação.
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

/** Altura "medida" de uma linha da grade — distinta da estimativa fixa de 280 px. */
const MEASURED_ROW_HEIGHT = 512;
/** Altura da janela de scroll. */
const SCROLL_VIEWPORT_HEIGHT = 640;

const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');

function makeProduct(index: number, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: `p${index}`,
    name: `Produto ${index}`,
    sku: `SKU-${index}`,
    price: index * 10,
    image_url: `https://cdn.example.com/p${index}.jpg`,
    images: [`https://cdn.example.com/p${index}.jpg`],
    stock: 10,
    ...overrides,
  };
}

async function renderAndOpenDialog(onSelect = vi.fn()) {
  renderWithProviders(<MockupProductSelector selection={null} onSelect={onSelect} />);
  await waitFor(() =>
    expect(screen.getAllByTestId('mockup-product-row').length).toBeGreaterThan(0),
  );
}

const rowCards = (row: HTMLElement) => within(row).queryAllByRole('button');

describe('getMockupGridColumnCount', () => {
  it('devolve 2, 3 ou 4 colunas conforme a largura (mesmos breakpoints do CSS)', () => {
    expect(getMockupGridColumnCount(320)).toBe(2);
    expect(getMockupGridColumnCount(MOCKUP_GRID_BREAKPOINT_SM - 1)).toBe(2);
    expect(getMockupGridColumnCount(MOCKUP_GRID_BREAKPOINT_SM)).toBe(3);
    expect(getMockupGridColumnCount(MOCKUP_GRID_BREAKPOINT_LG - 1)).toBe(3);
    expect(getMockupGridColumnCount(MOCKUP_GRID_BREAKPOINT_LG)).toBe(4);
    expect(getMockupGridColumnCount(1440)).toBe(4);
  });
});

describe('MockupProductSelector — grade responsiva e honestidade', () => {
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    vi.clearAllMocks();
    catalog.products = Array.from({ length: 5 }, (_, i) => makeProduct(i + 1));

    // "Layout" de jsdom: dá dimensões não-zero ao elemento de scroll (senão a virtualização
    // não renderiza nada) e uma altura mensurável às linhas (senão a medição retorna 0).
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get(this: HTMLElement) {
        // Guarda: a getter também pode ser lida em receptores que não são Element.
        const isRow =
          typeof (this as Element)?.getAttribute === 'function' &&
          this.getAttribute('data-testid') === 'mockup-product-row';
        return isRow ? MEASURED_ROW_HEIGHT : SCROLL_VIEWPORT_HEIGHT;
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get: () => 800,
    });
  });

  afterEach(() => {
    window.innerWidth = originalInnerWidth;
    if (originalOffsetHeight) {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
    }
    if (originalOffsetWidth) {
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth);
    }
    vi.restoreAllMocks();
  });

  it('em viewport estreito fatia as linhas em 2 colunas (sem sub-linha sobreposta)', async () => {
    window.innerWidth = 375;
    await renderAndOpenDialog();

    const rows = screen.getAllByTestId('mockup-product-row');
    // 5 produtos em 2 colunas => 3 linhas virtuais, cada uma UMA linha visual.
    expect(rows).toHaveLength(3);
    expect(rows[0].style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
    expect(rowCards(rows[0])).toHaveLength(2);
    expect(rowCards(rows[1])).toHaveLength(2);
    expect(rowCards(rows[2])).toHaveLength(1);

    // Cada produto aparece em exatamente uma linha (partição, sem repetição).
    const names = screen.getAllByText(/^Produto \d$/).map((el) => el.textContent);
    expect(names.sort()).toEqual(['Produto 1', 'Produto 2', 'Produto 3', 'Produto 4', 'Produto 5']);
  });

  it('em viewport largo fatia as linhas em 4 colunas', async () => {
    window.innerWidth = 1280;
    await renderAndOpenDialog();

    const rows = screen.getAllByTestId('mockup-product-row');
    expect(rows).toHaveLength(2); // 5 produtos em 4 colunas
    expect(rows[0].style.gridTemplateColumns).toBe('repeat(4, minmax(0, 1fr))');
    expect(rowCards(rows[0])).toHaveLength(4);
    expect(rowCards(rows[1])).toHaveLength(1);
  });

  it('em viewport médio fatia as linhas em 3 colunas', async () => {
    window.innerWidth = 800;
    await renderAndOpenDialog();

    const rows = screen.getAllByTestId('mockup-product-row');
    expect(rows[0].style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');
    expect(rowCards(rows[0])).toHaveLength(3);
  });

  it('espaça as linhas pela altura REAL medida no DOM (não pelos 280 px fixos)', async () => {
    window.innerWidth = 375;
    await renderAndOpenDialog();

    const rows = screen.getAllByTestId('mockup-product-row');
    expect(rows[0].style.transform).toBe('translateY(0px)');
    // Sem `measureElement` a linha 2 começaria em 280 px (estimativa) e cobriria o
    // conteúdo da linha 1 (512 px). Com a medição, o offset é a altura real da linha.
    expect(rows[1].style.transform).toBe(`translateY(${MEASURED_ROW_HEIGHT}px)`);
  });

  it('mostra estoque e preço no card, sem esconder o item sem estoque', async () => {
    catalog.products = [
      makeProduct(1, { stock: 0 }),
      makeProduct(2, { stock: 42 }),
      makeProduct(3, { price: 0 }),
      makeProduct(4),
      makeProduct(5),
    ];
    await renderAndOpenDialog();

    expect(screen.getByText('Esgotado')).toBeInTheDocument();
    expect(screen.getByText(/^42\s*un$/)).toBeInTheDocument();
    expect(screen.getByText('R$ 10,00')).toBeInTheDocument();
  });

  it('item sem estoque continua selecionável (não impede avançar)', async () => {
    catalog.products = [makeProduct(1, { stock: 0 }), makeProduct(2), makeProduct(3)];
    await renderAndOpenDialog();

    const esgotadoCard = screen.getByText('Esgotado').closest('[role="button"]');
    expect(esgotadoCard).not.toBeNull();
    fireEvent.click(esgotadoCard as HTMLElement);

    // Avançou para o carregamento de detalhes do produto (grade saiu de cena).
    await waitFor(() => expect(screen.queryAllByTestId('mockup-product-row')).toHaveLength(0));
    expect(screen.getByRole('button', { name: /voltar/i })).toBeInTheDocument();
  });

  it('rótulo da ordenação diz o alcance (apenas itens carregados)', async () => {
    await renderAndOpenDialog();

    expect(
      screen.getByRole('combobox', { name: /apenas itens já carregados/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('sort-scope')).toHaveTextContent(/apenas carregados/i);
  });
});
