/**
 * F-03 — Restauração de técnica no gerador de mockup.
 *
 * A lista `techniques` (tabela_preco_gravacao_oficial) e a UI (`filteredTechniques`,
 * ids de `print_area_techniques` via RPC fn_get_product_customization_options) usam
 * espaços de id diferentes, e o id muda de um produto para outro. Sem a correção, a
 * técnica restaurada de rascunho/histórico/URL era limpa pelo efeito de reconciliação.
 *
 * Execução: npx vitest --run src/hooks/mockup/__tests__/useMockupGenerator.techniques.test.ts
 */
import { createElement, type ReactNode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MockupDraftData } from '../useMockupDraft';
import type { GeneratedMockup } from '../mockupGenerationService';
import type { MockupProductSelection } from '@/components/mockup/MockupProductSelector';
import { useMockupGenerator } from '../useMockupGenerator';

const mocks = vi.hoisted(() => ({
  dbInvoke: vi.fn(),
  invokeExternalRpc: vi.fn(),
  getProductById: vi.fn(),
  loadDraft: vi.fn(),
  saveDraft: vi.fn(),
  clearDraft: vi.fn(),
  analyzeImage: vi.fn(),
  clearAnalysis: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));

vi.mock('@/contexts/ProductsContext', () => ({
  useProductsContext: () => ({ getProductById: mocks.getProductById }),
}));

vi.mock('@/hooks/mockup/useMockupDraft', () => ({
  useMockupDraft: () => ({
    saveDraft: mocks.saveDraft,
    loadDraft: mocks.loadDraft,
    clearDraft: mocks.clearDraft,
    isSaving: false,
    isLoading: false,
    lastSaved: null,
    error: null,
  }),
}));

vi.mock('@/hooks/simulation', () => ({
  useLogoColorAnalysis: () => ({
    analyzeImage: mocks.analyzeImage,
    clearAnalysis: mocks.clearAnalysis,
  }),
  usePositionHistory: () => ({ setOnApply: vi.fn(), pushState: vi.fn(), clear: vi.fn(), canRedo: false }),
}));

vi.mock('@/lib/db/postgrest', () => ({ dbInvoke: mocks.dbInvoke }));
vi.mock('@/lib/external-rpc', () => ({ invokeExternalRpc: mocks.invokeExternalRpc }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/image-converter', () => ({ needsConversion: () => false, ensureSupportedFormat: vi.fn() }));
vi.mock('@/utils/image-utils', () => ({ getCdnUrl: (url: string | null) => url }));
vi.mock('@/components/mockup/mockupWizardStep', () => ({ getMockupWizardStep: () => 1 }));
vi.mock('@/components/mockup/MockupSuccessToast', () => ({ showMockupSuccessToast: vi.fn() }));
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn(), custom: vi.fn() },
}));

vi.mock('@/hooks/mockup/mockupGenerationService', () => ({
  createDefaultArea: () => ({
    id: 'area-default',
    name: 'Área 1',
    positionX: 50,
    positionY: 50,
    logoWidth: 10,
    logoHeight: 5,
    logoPreview: null,
  }),
  fetchMockupHistory: vi.fn().mockResolvedValue([]),
  saveMockupToDb: vi.fn().mockResolvedValue(null),
  generateMockupApi: vi.fn(),
  downloadMockupAsPdf: vi.fn(),
  deleteMockupFromDb: vi.fn(),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PRODUCT_1 = { id: 'prod-1', name: 'Caneca', images: ['p1.png'] };
const PRODUCT_2 = { id: 'prod-2', name: 'Copo', images: ['p2.png'] };
const PRODUCT_3 = { id: 'prod-3', name: 'Camiseta', images: ['p3.png'] };

function product(id: string) {
  return { id, name: 'Produto', images: [`${id}.png`] };
}

function selectionFor(id: string): MockupProductSelection {
  return { product: product(id) as never, variant: null, imageUrl: `${id}.png` };
}

/** Payload do RPC: o id canônico da técnica é o `print_area_techniques.id` (por produto). */
function rpcOptions(productId: string, techniqueId: string, name: string, code: string) {
  return {
    product_id: productId,
    locations: [
      {
        location_code: 'frente',
        location_name: 'Frente',
        location_order: 1,
        options: [
          { technique_id: techniqueId, tecnica_nome: name, codigo_tabela: code, max_width: 10, max_height: 5 },
        ],
      },
    ],
  };
}

function makeDraft(overrides: Partial<MockupDraftData> = {}): MockupDraftData {
  return {
    productId: 'prod-1',
    productName: 'Caneca',
    techniqueId: null,
    techniqueName: null,
    clientId: null,
    clientName: null,
    personalizationAreas: [],
    updatedAt: '2026-06-01T10:00:00.000Z',
    ...overrides,
  };
}

function makeHistoryMockup(overrides: Partial<GeneratedMockup> = {}): GeneratedMockup {
  return {
    id: 'mock-1',
    product_id: 'prod-1',
    product_name: 'Caneca',
    product_sku: null,
    technique_id: null,
    technique_name: 'Serigrafia',
    mockup_url: 'mock.png',
    logo_url: null,
    position_x: 50,
    position_y: 50,
    logo_width_cm: 5,
    logo_height_cm: 3,
    created_at: '2026-06-01T10:00:00.000Z',
    client_id: null,
    ...overrides,
  };
}

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return ({ children }: { children: ReactNode }) =>
    createElement(MemoryRouter, null, createElement(QueryClientProvider, { client }, children));
}

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, '', '/');

  mocks.dbInvoke.mockResolvedValue({
    records: [{ id: 'tabela-1', codigo_tabela: 'silk', nome: 'Serigrafia' }],
  });
  mocks.getProductById.mockImplementation((id: string) =>
    ({ 'prod-1': PRODUCT_1, 'prod-2': PRODUCT_2, 'prod-3': PRODUCT_3 })[id],
  );
  mocks.loadDraft.mockResolvedValue(null);
  mocks.saveDraft.mockResolvedValue(undefined);
  mocks.clearDraft.mockResolvedValue(undefined);
  mocks.invokeExternalRpc.mockImplementation((_fn: string, params: { p_product_id: string }) => {
    const byProduct: Record<string, unknown> = {
      'prod-1': rpcOptions('prod-1', 'pat-1', 'Serigrafia', 'silk'),
      'prod-2': rpcOptions('prod-2', 'pat-9', 'Serigrafia', 'silk'),
      'prod-3': rpcOptions('prod-3', 'pat-laser', 'Laser', 'laser'),
    };
    return Promise.resolve(byProduct[params.p_product_id] ?? null);
  });
});

// ── Testes ────────────────────────────────────────────────────────────────────

describe('restauração de técnica (F-03)', () => {
  it('rascunho: mantém a técnica e usa o id canônico de filteredTechniques', async () => {
    mocks.loadDraft.mockResolvedValue(makeDraft({ techniqueId: 'pat-1', techniqueName: 'Serigrafia' }));

    const { result } = renderHook(() => useMockupGenerator(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.selectedTechnique).not.toBeNull());
    await waitFor(() => expect(result.current.selectedTechnique?.id).toBe('pat-1'));
    expect(result.current.filteredTechniques.some((t) => t.id === 'pat-1')).toBe(true);
  });

  it('?technique= na URL: mantém a técnica e usa o id canônico', async () => {
    window.history.replaceState({}, '', '/?product_id=prod-1&technique=Serigrafia');

    const { result } = renderHook(() => useMockupGenerator(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.selectedTechnique?.id).toBe('pat-1'));
    expect(result.current.filteredTechniques.some((t) => t.id === 'pat-1')).toBe(true);
  });

  it('histórico com technique_id nulo: resolve por nome e usa o id canônico', async () => {
    const { result } = renderHook(() => useMockupGenerator(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoadingData).toBe(false));

    await act(async () => {
      await result.current.loadFromHistory(makeHistoryMockup({ technique_id: null }));
    });

    await waitFor(() => expect(result.current.selectedTechnique?.id).toBe('pat-1'));
  });

  it('trocar de produto remapeia a técnica e só limpa quando ela não existe no novo produto', async () => {
    mocks.loadDraft.mockResolvedValue(makeDraft({ techniqueId: 'pat-1', techniqueName: 'Serigrafia' }));

    const { result } = renderHook(() => useMockupGenerator(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.selectedTechnique?.id).toBe('pat-1'));

    // prod-2 oferece a mesma técnica com id diferente (id é por produto).
    act(() => result.current.setProductSelection(selectionFor('prod-2')));
    await waitFor(() => expect(result.current.selectedTechnique?.id).toBe('pat-9'));

    // prod-3 não oferece Serigrafia → seleção limpa.
    act(() => result.current.setProductSelection(selectionFor('prod-3')));
    await waitFor(() => expect(result.current.selectedTechnique).toBeNull());
  });
});
