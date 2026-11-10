/**
 * Guard de dimensões físicas (Q13/Q24): produto SEM largura/altura cadastradas
 * NÃO gera mockup — o hook recusa no cliente (missingDimensions=true + erro
 * tipado `missing_dimensions`, status 422) e nunca chama a edge. O editor
 * estimava 8×20 cm em silêncio; o mockup não pode inventar medida.
 *
 * Produto COM dimensões segue o caminho normal e envia as mesmas medidas (cm)
 * ao serviço de geração (WYSIWYG).
 */
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { draftApi, api, toastMock, colorAnalysis, positionHistory } = vi.hoisted(() => ({
  draftApi: {
    saveDraft: vi.fn(() => true),
    loadDraft: vi.fn(() => null),
    clearDraft: vi.fn(() => {}),
  },
  api: {
    generateMockupApi: vi.fn(),
    saveMockupToDb: vi.fn(),
  },
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
}));

// Produto SEM nenhuma medida cadastrada (nem dimensions, nem metadata.em mm).
const PRODUCT_NO_DIMS = {
  id: 'prod-sem-medidas',
  name: 'Caneca sem medidas',
  sku: 'CSM',
  images: ['p.png'],
};

// Produto COM dimensões reais em cm.
const PRODUCT_WITH_DIMS = {
  id: 'prod-8x20',
  name: 'Caneca 8x20',
  sku: 'C820',
  images: ['p.png'],
  dimensions: { width_cm: 8, height_cm: 20 },
};

// Produto COM medidas apenas em metadata (mm) — também é medida real.
const PRODUCT_WITH_MM = {
  id: 'prod-mm',
  name: 'Copo 80x200mm',
  sku: 'CMM',
  images: ['p.png'],
  metadata: { width_mm: 80, height_mm: 200 },
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-test-001' } }),
}));
vi.mock('@/contexts/ProductsContext', () => ({
  useProductsContext: () => ({ getProductById: () => PRODUCT_WITH_DIMS }),
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
import {
  resolveProductDimensions,
  hasRealProductDimensions,
  MISSING_DIMENSIONS_ERROR_CODE,
  MISSING_DIMENSIONS_STATUS,
} from '../mockupGeneratorModel';

const AREA_WITH_LOGO = {
  id: 'area-1',
  name: 'Frente',
  positionX: 50,
  positionY: 50,
  logoWidth: 5,
  logoHeight: 3,
  logoPreview: 'data:image/png;base64,AAAA',
};

async function setup(product: unknown) {
  const hook = renderHook(() => useMockupGenerator(), { wrapper: MemoryRouter });
  await act(async () => {
    hook.result.current.setProductSelection({
      product: product as never,
      variant: null,
      imageUrl: 'p.png',
    });
    hook.result.current.setSelectedTechnique({ id: 't1', name: 'Laser', code: 'laser' } as never);
    hook.result.current.setSelectedClient({ id: 'c1', name: 'Cliente' });
    hook.result.current.setPersonalizationAreas([AREA_WITH_LOGO]);
    // deixa os efeitos de montagem (dbInvoke/fetchHistory) assentarem
    await Promise.resolve();
  });
  return hook;
}

beforeEach(() => {
  vi.clearAllMocks();
  api.generateMockupApi.mockReset();
  api.saveMockupToDb.mockReset();
});

describe('resolveProductDimensions / hasRealProductDimensions (puro)', () => {
  it('sem dimensions nem metadata ⇒ null/null', () => {
    expect(resolveProductDimensions({} as never)).toEqual({ widthCm: null, heightCm: null });
  });

  it('dimensions em cm é lido direto', () => {
    expect(
      resolveProductDimensions({ dimensions: { width_cm: 8, height_cm: 20 } } as never),
    ).toEqual({ widthCm: 8, heightCm: 20 });
  });

  it('metadata em mm é convertido para cm', () => {
    expect(
      resolveProductDimensions({ metadata: { width_mm: 80, height_mm: 200 } } as never),
    ).toEqual({ widthCm: 8, heightCm: 20 });
  });

  it('diameter_cm alimenta a largura (produto redondo)', () => {
    expect(resolveProductDimensions({ dimensions: { diameter_cm: 9 } } as never)).toEqual({
      widthCm: 9,
      heightCm: null,
    });
  });

  it('ignora zeros, negativos e valores não numéricos', () => {
    expect(
      resolveProductDimensions({ dimensions: { width_cm: 0, height_cm: -3 } } as never),
    ).toEqual({ widthCm: null, heightCm: null });
  });

  it('hasRealProductDimensions exige pelo menos uma medida', () => {
    expect(hasRealProductDimensions({ widthCm: 8, heightCm: null })).toBe(true);
    expect(hasRealProductDimensions({ widthCm: null, heightCm: 20 })).toBe(true);
    expect(hasRealProductDimensions({ widthCm: null, heightCm: null })).toBe(false);
  });
});

describe('guard de dimensões no hook — produto sem medidas', () => {
  it('missingDimensions=true e generate() recusa tipado SEM chamar a edge', async () => {
    api.generateMockupApi.mockResolvedValue({ singleUrl: 'u1', batchResults: [] });
    const { result } = await setup(PRODUCT_NO_DIMS);

    expect(result.current.missingDimensions).toBe(true);

    let outcome: Awaited<ReturnType<typeof result.current.generateMockup>> | undefined;
    await act(async () => {
      outcome = await result.current.generateMockup();
    });

    expect(api.generateMockupApi).not.toHaveBeenCalled();
    expect(api.saveMockupToDb).not.toHaveBeenCalled();
    expect(outcome).toEqual({
      ok: false,
      error: {
        code: MISSING_DIMENSIONS_ERROR_CODE,
        status: MISSING_DIMENSIONS_STATUS,
        message: expect.stringContaining('medidas'),
      },
    });
    expect(result.current.generationError).toEqual(expect.stringContaining('medidas'));
    expect(toastMock.error).toHaveBeenCalledWith(expect.stringContaining('medidas'));
  });
});

describe('produto com dimensões segue o fluxo normal', () => {
  it('missingDimensions=false e envia as medidas (cm) ao serviço de geração', async () => {
    api.generateMockupApi.mockResolvedValueOnce({ singleUrl: 'u1', batchResults: [] });
    api.saveMockupToDb.mockResolvedValueOnce('rec-1');
    const { result } = await setup(PRODUCT_WITH_DIMS);

    expect(result.current.missingDimensions).toBe(false);

    let outcome: Awaited<ReturnType<typeof result.current.generateMockup>> | undefined;
    await act(async () => {
      outcome = await result.current.generateMockup();
    });

    expect(api.generateMockupApi).toHaveBeenCalledTimes(1);
    const params = api.generateMockupApi.mock.calls[0][0] as {
      productWidthCm: number | null;
      productHeightCm: number | null;
    };
    expect(params.productWidthCm).toBe(8);
    expect(params.productHeightCm).toBe(20);
    expect(outcome).toEqual({ ok: true });
  });

  it('medidas só em metadata (mm) também liberam a geração em cm', async () => {
    api.generateMockupApi.mockResolvedValueOnce({ singleUrl: 'u1', batchResults: [] });
    api.saveMockupToDb.mockResolvedValueOnce('rec-2');
    const { result } = await setup(PRODUCT_WITH_MM);

    expect(result.current.missingDimensions).toBe(false);

    await act(async () => {
      await result.current.generateMockup();
    });

    expect(api.generateMockupApi).toHaveBeenCalledTimes(1);
    const params = api.generateMockupApi.mock.calls[0][0] as {
      productWidthCm: number | null;
      productHeightCm: number | null;
    };
    expect(params.productWidthCm).toBe(8);
    expect(params.productHeightCm).toBe(20);
  });
});
