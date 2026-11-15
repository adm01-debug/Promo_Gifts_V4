/**
 * Painel do gerador de mockup — estado de ERRO de carga do catálogo de produtos (A-estados).
 *
 * O que este arquivo prova: quando a lista de produtos não carrega, o bloco "Produto" do painel
 * avisa com mensagem + "Tentar novamente" (que refaz a MESMA consulta), e o aviso não se
 * confunde com o estado vazio. Antes da correção a falha de carga era invisível: o painel
 * mostrava só o botão "Buscar produto" e, aberta a busca, o texto de vazio ("Nenhum resultado")
 * — como se o produto não existisse.
 *
 * Quem carrega o catálogo é o próprio MockupProductSelector (useProductsCatalog, react-query),
 * por isso o erro/retry vêm da consulta e não de prop nova: o teste controla a consulta.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within, fireEvent } from '@testing-library/react';
import React from 'react';
import { renderWithProviders } from '../render-helpers';
import { MockupConfigPanel } from '@/components/mockup/MockupConfigPanel';
import { MockupProductSelector } from '@/components/mockup/MockupProductSelector';

const CATALOG_ERROR = 'Falha ao consultar o catálogo externo (502).';

// Consulta do catálogo controlada pelo teste (holder hoisted: o factory do vi.mock roda no import).
const { catalog } = vi.hoisted(() => ({
  catalog: {
    products: [] as Array<Record<string, unknown>>,
    isError: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
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
    isError: catalog.isError,
    error: catalog.error,
    refetch: catalog.refetch,
  }),
  useProduct: () => ({ data: null, isLoading: false }),
  useExternalVariantStock: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/common', () => ({ useDebounce: <T,>(value: T) => value }));

// renderWithProviders monta o SellerCartProvider, que puxa `useSellerCarts` do barrel
// `@/hooks/products` (mockado acima) — substituímos o provider por um passthrough.
vi.mock('@/contexts/SellerCartContext', () => ({
  SellerCartProvider: ({ children }: { children: React.ReactNode }) => children,
  useSellerCart: () => ({}),
}));

// Irmãos do bloco "Produto" fazem I/O próprio (CRM, upload, áreas) e não são o alvo aqui.
vi.mock('@/components/mockup/MockupClientSelector', () => ({
  MockupClientSelector: () => <div data-testid="child-client-selector" />,
}));
vi.mock('@/components/mockup/MultiAreaManager', () => ({
  MultiAreaManager: () => <div data-testid="child-areas" />,
}));
vi.mock('@/components/mockup/ArtFileUpload', () => ({
  ArtFileUpload: () => <div data-testid="child-art-upload" />,
}));

// O conteúdo do Radix Dialog só monta no segundo commit do portal (ver
// MockupProductSelector.test.tsx). O stub renderiza a busca inline para que o teste possa
// comparar, no mesmo render, o aviso de erro e o texto de vazio.
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({ index, key: index, start: 0, size: 280 })),
    getTotalSize: () => count * 280,
    measure: () => undefined,
  }),
}));

function panelProps() {
  return {
    techniques: [],
    productSelection: null,
    selectedTechnique: null,
    selectedClient: null,
    isLoadingData: false,
    personalizationAreas: [],
    onProductSelect: vi.fn(),
    onTechniqueSelect: vi.fn(),
    onClientSelect: vi.fn(),
    onReset: vi.fn(),
    filteredTechniques: [],
    activeAreaId: null,
    onAreasChange: vi.fn(),
    onActiveAreaChange: vi.fn(),
    onLogoUpload: vi.fn(),
    productLocations: null,
    artAttachments: [],
    onArtAttachmentsChange: vi.fn(),
    userId: 'user-1',
  };
}

/** Bloco "Produto" do painel (wrapper com id `step-product`). */
function productSection(): HTMLElement {
  const section = document.querySelector<HTMLElement>('[id="step-product"]');
  if (!section) throw new Error('seção step-product não encontrada');
  return section;
}

describe('MockupConfigPanel — erro de carga do catálogo de produtos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    catalog.products = [];
    catalog.isError = false;
    catalog.error = null;
  });

  it('sem erro de carga, nenhum aviso aparece (guarda de regressão)', () => {
    renderWithProviders(<MockupConfigPanel {...panelProps()} />);

    expect(screen.queryByTestId('mockup-products-error')).toBeNull();
    expect(screen.queryByText(/tentar novamente/i)).toBeNull();
  });

  it('erro de carga: mensagem + "Tentar novamente" no bloco do produto', () => {
    catalog.isError = true;
    catalog.error = new Error(CATALOG_ERROR);
    renderWithProviders(<MockupConfigPanel {...panelProps()} />);

    const avisos = within(productSection()).getAllByTestId('mockup-products-error');
    expect(avisos).not.toHaveLength(0);
    // Todo aviso montado no bloco diz o que falhou E a mensagem de quem carrega o catálogo.
    expect(
      avisos.every((aviso) => aviso.textContent?.includes('Não foi possível carregar produtos')),
    ).toBe(true);
    expect(avisos.every((aviso) => aviso.textContent?.includes(CATALOG_ERROR))).toBe(true);
    expect(
      within(productSection()).getAllByRole('button', { name: /tentar novamente/i }).length,
    ).toBeGreaterThan(0);
  });

  it('o erro não esconde o resto do painel (empresa, técnica e áreas continuam de pé)', () => {
    catalog.isError = true;
    catalog.error = new Error(CATALOG_ERROR);
    renderWithProviders(<MockupConfigPanel {...panelProps()} />);

    expect(screen.getAllByTestId('child-client-selector').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('child-areas').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('mockup-technique-select-trigger').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /limpar formulário/i }).length).toBeGreaterThan(0);
  });

  it('"Tentar novamente" refaz a consulta que falhou (refetch do react-query)', () => {
    catalog.isError = true;
    catalog.error = new Error(CATALOG_ERROR);
    renderWithProviders(<MockupConfigPanel {...panelProps()} />);

    const [botao] = within(productSection()).getAllByRole('button', {
      name: /tentar novamente/i,
    });
    fireEvent.click(botao);
    expect(catalog.refetch).toHaveBeenCalledTimes(1);
  });
});

describe('MockupProductSelector — erro de carga x catálogo vazio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    catalog.products = [];
    catalog.isError = false;
    catalog.error = null;
  });

  it('erro de carga: avisa a falha e NÃO diz "Nenhum resultado"', () => {
    catalog.isError = true;
    catalog.error = new Error(CATALOG_ERROR);
    renderWithProviders(<MockupProductSelector selection={null} onSelect={vi.fn()} />);

    expect(screen.getAllByTestId('mockup-products-error').length).toBeGreaterThan(0);
    expect(screen.queryByText('Nenhum resultado')).toBeNull();
  });

  it('catálogo vazio sem erro: diz "Nenhum resultado" e nenhum aviso de falha', () => {
    renderWithProviders(<MockupProductSelector selection={null} onSelect={vi.fn()} />);

    expect(screen.getByText('Nenhum resultado')).toBeInTheDocument();
    expect(screen.queryByTestId('mockup-products-error')).toBeNull();
  });

  it('erro sem mensagem utilizável cai na mensagem padrão (nunca texto vazio)', () => {
    catalog.isError = true;
    catalog.error = null;
    renderWithProviders(<MockupProductSelector selection={null} onSelect={vi.fn()} />);

    const [aviso] = screen.getAllByTestId('mockup-products-error');
    expect(aviso).toHaveTextContent('Não foi possível carregar o catálogo de produtos agora.');
  });
});

describe('MockupProductSelector — erro de paginação não apaga o que já carregou', () => {
  beforeEach(() => {
    catalog.products = [];
    catalog.isError = false;
    catalog.error = null;
    catalog.refetch.mockReset();
  });

  it('isError com produtos já carregados: a grade continua e nenhum aviso aparece', () => {
    // `useProductsCatalog` é useInfiniteQuery: uma falha de `fetchNextPage`
    // liga `isError` MANTENDO as páginas já carregadas. Sem exigir lista vazia,
    // o aviso substituía a grade e o vendedor perdia os produtos clicáveis.
    catalog.products = [
      {
        id: 'p-1',
        name: 'Caneca Inox 500ml',
        sku: 'SKU-1',
        price: 10,
        images: [],
        category_name: 'Canecas',
      },
    ];
    catalog.isError = true;
    catalog.error = new Error(CATALOG_ERROR);

    renderWithProviders(<MockupConfigPanel {...panelProps()} />);

    expect(screen.queryByTestId('mockup-products-error')).toBeNull();
    expect(screen.queryByText('Não foi possível carregar produtos')).toBeNull();
  });

  it('isError sem nenhum produto: o aviso aparece, como deve', () => {
    catalog.products = [];
    catalog.isError = true;
    catalog.error = new Error(CATALOG_ERROR);

    renderWithProviders(<MockupConfigPanel {...panelProps()} />);

    expect(within(productSection()).getAllByTestId('mockup-products-error')).not.toHaveLength(0);
  });
});
