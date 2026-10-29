/**
 * A-7 — entrada de produto no gerador de mockup (etapa 30).
 *
 * O gerador é aberto por três caminhos diferentes e cada um entrega o produto
 * de um jeito:
 *   1. `?product_id=`  — deep link legado;
 *   2. `?productId=`   — botão flutuante QuickQuoteFAB;
 *   3. `state.preSelectedProduct.id` do router — badge "Visualizar com Logo"
 *      (ProductCategoryBadges).
 * Antes só o formato (1) era lido: nos outros dois o produto não era
 * pré-selecionado. Contrato provado aqui: os TRÊS formatos selecionam o mesmo
 * produto, e entrada inválida (id inexistente, vazio ou tipo errado) é ignorada
 * sem erro.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React, { type ReactNode } from 'react';

const { toastMock, colorAnalysis, positionHistory, draftApi, api } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  colorAnalysis: { analyzeImage: vi.fn(), clearAnalysis: vi.fn() },
  positionHistory: {
    setOnApply: vi.fn(),
    canRedo: false,
    canUndo: false,
    canApply: false,
    clear: vi.fn(),
    pushState: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
  },
  draftApi: {
    saveDraft: vi.fn(() => true),
    loadDraft: vi.fn(() => null),
    clearDraft: vi.fn(() => {}),
  },
  api: {
    generateMockupApi: vi.fn(),
    saveMockupToDb: vi.fn(),
  },
}));

// Produto do catálogo que os três formatos devem pré-selecionar.
const PRODUCT = {
  id: 'prod-1',
  name: 'Caneca 300ml',
  sku: 'CNC-300',
  images: ['caneca.png'],
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-test-001' } }),
}));
vi.mock('@/contexts/ProductsContext', () => ({
  useProductsContext: () => ({
    // Catálogo do contexto: só 'prod-1' existe — qualquer outro id é inválido.
    getProductById: (id: string) => (id === PRODUCT.id ? PRODUCT : undefined),
  }),
}));
vi.mock('@/lib/db/postgrest', () => ({ dbInvoke: vi.fn(() => ({ records: [] })) }));
vi.mock('@/hooks/mockup/mockupGenerationService', () => ({
  createDefaultArea: () => ({
    id: 'default',
    name: 'Área 1',
    positionX: 50,
    positionY: 50,
    logoWidth: 10,
    logoHeight: 5,
    logoPreview: null,
  }),
  fetchMockupHistory: vi.fn(() => []),
  saveMockupToDb: api.saveMockupToDb,
  generateMockupApi: api.generateMockupApi,
  downloadMockupAsPdf: vi.fn(() => {}),
  deleteMockupFromDb: vi.fn(() => {}),
}));
vi.mock('@/hooks/mockup/useMockupDraft', () => ({
  useMockupDraft: () => ({
    ...draftApi,
    isSaving: false,
    isLoading: false,
    lastSaved: null,
    error: null,
  }),
}));
vi.mock('@/hooks/mockup/useMockupTechniques', () => ({
  useFilteredTechniques: () => [],
  useProductCustomizationOptionsForMockup: () => ({ data: undefined }),
}));
vi.mock('@/hooks/simulation', () => ({
  useLogoColorAnalysis: () => colorAnalysis,
  usePositionHistory: () => positionHistory,
}));
vi.mock('@/components/mockup/mockupWizardStep', () => ({ getMockupWizardStep: () => 1 }));
vi.mock('@/components/mockup/MockupSuccessToast', () => ({ showMockupSuccessToast: vi.fn() }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), toastMock) }));

import { useMockupGenerator } from '../useMockupGenerator';
import { resolveEntryProductId } from '../mockupGeneratorModel';

interface Entry {
  /** query string do deep link (formato 1 e 2) */
  search?: string;
  /** state da navegação (formato 3) */
  state?: unknown;
}

function renderGenerator(entry: Entry = {}) {
  // O deep link é lido de window.location (mesma URL que o BrowserRouter usa em produção).
  window.history.replaceState({}, '', `/mockup-generator${entry.search ?? ''}`);
  // Arquivo .ts (sem JSX): o router entra por createElement.
  const wrapper = ({ children }: { children: ReactNode }) =>
    React.createElement(
      MemoryRouter,
      {
        initialEntries: [{ pathname: '/mockup-generator', state: entry.state ?? null }],
        future: { v7_startTransition: true, v7_relativePathSplatPath: true },
      },
      children,
    );
  return renderHook(() => useMockupGenerator(), { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, '', '/mockup-generator');
});

describe('A-7 — os três formatos de entrada pré-selecionam o mesmo produto', () => {
  it('formato 1: ?product_id= (deep link) pré-seleciona o produto', async () => {
    const { result } = renderGenerator({ search: '?product_id=prod-1' });
    await waitFor(() => expect(result.current.selectedProduct?.id).toBe('prod-1'));
    expect(result.current.productSelection?.imageUrl).toBe('caneca.png');
  });

  it('formato 2: ?productId= (QuickQuoteFAB) pré-seleciona o mesmo produto', async () => {
    const { result } = renderGenerator({ search: '?productId=prod-1' });
    await waitFor(() => expect(result.current.selectedProduct?.id).toBe('prod-1'));
  });

  it('formato 3: state.preSelectedProduct.id (Visualizar com Logo) pré-seleciona o produto', async () => {
    const { result } = renderGenerator({
      state: {
        preSelectedProduct: { id: 'prod-1', name: 'Caneca 300ml', sku: 'CNC-300' },
      },
    });
    await waitFor(() => expect(result.current.selectedProduct?.id).toBe('prod-1'));
  });

  it('limpa só as chaves de entrada e preserva os outros params da URL', async () => {
    const { result } = renderGenerator({ search: '?productId=prod-1&foo=bar' });
    await waitFor(() => expect(result.current.selectedProduct?.id).toBe('prod-1'));
    await waitFor(() => expect(window.location.search).toBe('?foo=bar'));
  });
});

describe('A-7 — entrada inválida é ignorada sem erro', () => {
  it('id inexistente no catálogo não seleciona nada e não dispara toast de erro', async () => {
    const { result } = renderGenerator({ search: '?product_id=nao-existe' });
    await waitFor(() => expect(result.current.isLoadingData).toBe(false));
    expect(result.current.productSelection).toBeNull();
    expect(result.current.selectedProduct).toBeNull();
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it('state.preSelectedProduct.id de tipo errado (número) é ignorado', async () => {
    const { result } = renderGenerator({ state: { preSelectedProduct: { id: 42 } } });
    await waitFor(() => expect(result.current.isLoadingData).toBe(false));
    expect(result.current.productSelection).toBeNull();
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it('state do router sem preSelectedProduct é ignorado', async () => {
    const { result } = renderGenerator({ state: { algumaCoisa: true } });
    await waitFor(() => expect(result.current.isLoadingData).toBe(false));
    expect(result.current.productSelection).toBeNull();
  });

  it('param vazio cai para o próximo formato disponível', async () => {
    const { result } = renderGenerator({ search: '?productId=&product_id=prod-1' });
    await waitFor(() => expect(result.current.selectedProduct?.id).toBe('prod-1'));
  });
});

describe('A-7 — resolveEntryProductId (resolvedor puro)', () => {
  it('null quando não há nenhuma das três entradas', () => {
    expect(resolveEntryProductId({})).toBeNull();
    expect(resolveEntryProductId({ search: '?foo=bar' })).toBeNull();
    expect(resolveEntryProductId({ routerState: null })).toBeNull();
  });

  it('aceita search com ou sem "?" e faz trim do id', () => {
    expect(resolveEntryProductId({ search: 'productId=prod-1' })).toBe('prod-1');
    expect(resolveEntryProductId({ search: '?product_id=%20prod-1%20' })).toBe('prod-1');
  });

  it('prioriza a query string sobre o state do router', () => {
    expect(
      resolveEntryProductId({
        search: '?product_id=prod-1',
        routerState: { preSelectedProduct: { id: 'outro' } },
      }),
    ).toBe('prod-1');
  });
});
