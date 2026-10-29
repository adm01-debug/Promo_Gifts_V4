/**
 * B F-02 — Recarregar os locais do produto NAO pode recriar as areas.
 *
 * Bug: o efeito que materializa `productLocations` recriava as areas sempre que a lista
 * de locations chegava (ou era recalculada), descartando logo, posicao (x/y) e tamanho
 * apos restaurar rascunho/historico. O comportamento correto:
 *   - mesmo produto + locations chegando tarde -> preserva as areas ja preenchidas;
 *   - trocar para OUTRO produto -> recria as areas a partir das locations;
 *   - mesmo produto re-renderizado -> nao recria (nao troca os ids das areas).
 *
 * A prova e pelo contrato observavel do hook (o que o chamador ve em `personalizationAreas`).
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Estado compartilhado com os mocks (hoisted antes dos imports) ─────────────
const {
  draftState,
  draftApi,
  locationsByProduct,
  productsById,
  customizationCache,
  colorAnalysis,
  positionHistory,
} = vi.hoisted(() => {
  const draftState = { current: null as null | Record<string, unknown> };
  return {
    draftState,
    // Identidade estavel: o hook real usa useCallback; um mock que devolve um objeto novo
    // a cada render re-dispara os efeitos e (no comportamento com bug) entra em loop.
    draftApi: {
      saveDraft: vi.fn(async () => true),
      loadDraft: vi.fn(async () => draftState.current),
      clearDraft: vi.fn(async () => {}),
    },
    locationsByProduct: {} as Record<string, Array<Record<string, unknown>>>,
    productsById: {} as Record<string, Record<string, unknown>>,
    // Cache por identidade da fonte -> `data` do react-query estavel entre renders.
    customizationCache: {
      source: {} as Record<string, unknown>,
      data: {} as Record<string, unknown>,
    },
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
  };
});

const getProductById = (id: string) => productsById[id] ?? null;

function getCustomizationData(productId?: string) {
  if (!productId) return undefined;
  const source = locationsByProduct[productId];
  if (!source) return undefined;
  if (customizationCache.source[productId] !== source) {
    customizationCache.source[productId] = source;
    customizationCache.data[productId] = { product_id: productId, locations: source };
  }
  return customizationCache.data[productId];
}

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-test-001' } }),
}));

vi.mock('@/contexts/ProductsContext', () => ({
  useProductsContext: () => ({ getProductById }),
}));

vi.mock('@/lib/db/postgrest', () => ({
  dbInvoke: vi.fn(async () => ({ records: [] })),
}));

// O service real so e usado por `createDefaultArea`; o resto e mockado para isolar o efeito.
vi.mock('@/hooks/mockup/mockupGenerationService', () => ({
  createDefaultArea: () => ({
    id: crypto.randomUUID(),
    name: 'Área 1',
    positionX: 50,
    positionY: 50,
    logoWidth: 10,
    logoHeight: 5,
    logoPreview: null,
  }),
  fetchMockupHistory: vi.fn(async () => []),
  saveMockupToDb: vi.fn(async () => null),
  generateMockupApi: vi.fn(async () => ({ singleUrl: null, batchResults: [] })),
  downloadMockupAsPdf: vi.fn(async () => {}),
  deleteMockupFromDb: vi.fn(async () => {}),
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
  useProductCustomizationOptionsForMockup: (productId?: string) => ({
    data: getCustomizationData(productId),
  }),
}));

vi.mock('@/hooks/simulation', () => ({
  useLogoColorAnalysis: () => colorAnalysis,
  usePositionHistory: () => positionHistory,
}));

vi.mock('@/components/mockup/mockupWizardStep', () => ({
  getMockupWizardStep: () => 1,
}));

vi.mock('@/components/mockup/MockupSuccessToast', () => ({
  showMockupSuccessToast: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

import { useMockupGenerator } from '../useMockupGenerator';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PRODUCT_X = { id: 'prod-x', name: 'Caneca X', sku: 'CX', images: ['x.png'] };
const PRODUCT_Y = { id: 'prod-y', name: 'Copo Y', sku: 'CY', images: ['y.png'] };

const LOCATIONS_X = [
  {
    location_code: 'frente',
    location_name: 'Frente',
    location_order: 1,
    options: [
      { efetiva_largura_max: 10, efetiva_altura_max: 6, max_cores: 4, is_curved: false },
    ],
  },
  {
    location_code: 'costas',
    location_name: 'Costas',
    location_order: 2,
    options: [{ efetiva_largura_max: 8, efetiva_altura_max: 5, max_cores: 3, is_curved: false }],
  },
];

const LOCATIONS_Y = [
  {
    location_code: 'gargalo',
    location_name: 'Gargalo',
    location_order: 1,
    options: [{ efetiva_largura_max: 12, efetiva_altura_max: 7, max_cores: 2, is_curved: true }],
  },
];

const RESTORED_AREA = {
  id: 'draft-area-1',
  name: 'Frente',
  positionX: 37,
  positionY: 12,
  logoWidth: 8,
  logoHeight: 4,
  logoScale: 80,
  logoPreview: 'data:image/png;base64,AAAA',
};

const RESTORED_DRAFT = {
  productId: 'prod-x',
  productName: 'Caneca X',
  techniqueId: null,
  techniqueName: null,
  clientId: null,
  clientName: null,
  personalizationAreas: [RESTORED_AREA],
  updatedAt: new Date().toISOString(),
};

describe('B F-02 — locations nao recriam areas ja preenchidas', () => {
  beforeEach(() => {
    draftState.current = null;
    for (const key of Object.keys(locationsByProduct)) delete locationsByProduct[key];
    for (const key of Object.keys(customizationCache.source)) delete customizationCache.source[key];
    for (const key of Object.keys(customizationCache.data)) delete customizationCache.data[key];
    for (const key of Object.keys(productsById)) delete productsById[key];
    productsById['prod-x'] = PRODUCT_X;
    productsById['prod-y'] = PRODUCT_Y;
  });

  it('preserva logo/posicao/tamanho quando a lista de locations chega tarde (mesmo produto)', async () => {
    draftState.current = RESTORED_DRAFT;

    const { result, rerender } = renderHook(() => useMockupGenerator());

    // rascunho restaurado (com logo/posicao/tamanho)
    await waitFor(() =>
      expect(result.current.personalizationAreas[0]?.logoPreview).toBe(
        'data:image/png;base64,AAAA',
      ),
    );

    // chegada tardia das locations do MESMO produto
    await act(async () => {
      locationsByProduct['prod-x'] = LOCATIONS_X;
      rerender();
    });

    await waitFor(() => expect(result.current.productLocations).not.toBeNull());
    expect(result.current.personalizationAreas).toHaveLength(1);
    expect(result.current.personalizationAreas[0]).toMatchObject({
      id: 'draft-area-1',
      positionX: 37,
      positionY: 12,
      logoWidth: 8,
      logoHeight: 4,
      logoPreview: 'data:image/png;base64,AAAA',
    });
  });

  it('recria as areas ao trocar para OUTRO produto', async () => {
    draftState.current = RESTORED_DRAFT;
    locationsByProduct['prod-y'] = LOCATIONS_Y;

    const { result } = renderHook(() => useMockupGenerator());
    await waitFor(() =>
      expect(result.current.personalizationAreas[0]?.logoPreview).toBe(
        'data:image/png;base64,AAAA',
      ),
    );

    await act(async () => {
      result.current.setProductSelection({
        product: PRODUCT_Y as never,
        variant: null,
        imageUrl: 'y.png',
      });
    });

    await waitFor(() => expect(result.current.personalizationAreas[0]?.name).toBe('Gargalo'));
    const area = result.current.personalizationAreas[0];
    expect(result.current.personalizationAreas).toHaveLength(1);
    expect(area.positionX).toBe(50);
    expect(area.logoWidth).toBe(5);
    expect(area.logoPreview).toBeNull();
    expect(area.id).not.toBe('draft-area-1');
  });

  it('nao recria as areas ao re-renderizar o MESMO produto', async () => {
    locationsByProduct['prod-y'] = LOCATIONS_Y;

    const { result, rerender } = renderHook(() => useMockupGenerator());
    await waitFor(() => expect(result.current.productLocations).toBeNull());

    await act(async () => {
      result.current.setProductSelection({
        product: PRODUCT_Y as never,
        variant: null,
        imageUrl: 'y.png',
      });
    });
    await waitFor(() => expect(result.current.personalizationAreas[0]?.name).toBe('Gargalo'));

    const areaId = result.current.personalizationAreas[0].id;

    // novo objeto de locations (identidade nova) para o MESMO produto
    await act(async () => {
      locationsByProduct['prod-y'] = LOCATIONS_Y.map((l) => ({ ...l }));
      rerender();
    });

    expect(result.current.personalizationAreas).toHaveLength(1);
    expect(result.current.personalizationAreas[0].id).toBe(areaId);
  });
});
