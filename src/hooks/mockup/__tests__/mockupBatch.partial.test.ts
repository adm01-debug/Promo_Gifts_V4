/**
 * Lote multi-área (Q14/Q29): entrega as áreas boas, mostra erro próprio da que falhou e
 * permite regerar só ela (máx. 6 áreas). Resultados associados por id estável da área.
 */
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { draftApi, api, toastMock, colorAnalysis, positionHistory } = vi.hoisted(() => ({
  draftApi: {
    saveDraft: vi.fn(async () => true),
    loadDraft: vi.fn(async () => null),
    clearDraft: vi.fn(async () => {}),
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

const PRODUCT = {
  id: 'prod-x',
  name: 'Caneca X',
  sku: 'CX',
  images: ['x.png'],
  // Medidas reais: sem elas a trava Q13 recusa a geração antes da edge.
  dimensions: { width_cm: 8, height_cm: 10 },
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-test-001' } }),
}));
vi.mock('@/contexts/ProductsContext', () => ({
  useProductsContext: () => ({ getProductById: () => PRODUCT }),
}));
vi.mock('@/lib/db/postgrest', () => ({ dbInvoke: vi.fn(async () => ({ records: [] })) }));
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
  fetchMockupHistory: vi.fn(async () => []),
  saveMockupToDb: api.saveMockupToDb,
  generateMockupApi: api.generateMockupApi,
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
  useProductCustomizationOptionsForMockup: () => ({ data: undefined }),
}));
vi.mock('@/hooks/simulation', () => ({
  useLogoColorAnalysis: () => colorAnalysis,
  usePositionHistory: () => positionHistory,
}));
vi.mock('@/components/mockup/mockupWizardStep', () => ({ getMockupWizardStep: () => 1 }));
vi.mock('@/components/mockup/MockupSuccessToast', () => ({ showMockupSuccessToast: vi.fn() }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), toastMock) }));

import { useMockupGenerator, MAX_BATCH_AREAS } from '../useMockupGenerator';

const makeArea = (id: string, name: string) => ({
  id,
  name,
  positionX: 50,
  positionY: 50,
  logoWidth: 5,
  logoHeight: 5,
  logoPreview: 'data:image/png;base64,AAAA',
});

async function setup(areas: ReturnType<typeof makeArea>[]) {
  const hook = renderHook(() => useMockupGenerator(), { wrapper: MemoryRouter });
  await act(async () => {
    hook.result.current.setProductSelection({
      product: PRODUCT as never,
      variant: null,
      imageUrl: 'x.png',
    });
    hook.result.current.setSelectedTechnique({ id: 't1', name: 'Laser', code: 'LAS' } as never);
    hook.result.current.setSelectedClient({ id: 'c1', name: 'Cliente' });
    hook.result.current.setPersonalizationAreas(areas);
  });
  return hook;
}

describe('lote multi-área — falha parcial e id estável', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.saveMockupToDb.mockImplementation(
      async (p: { area: { id: string } }) => `rec-${p.area.id}`,
    );
  });

  it('3 áreas com a 2ª falhando: 2 salvas, 1 erro próprio e regerar só ela', async () => {
    const areas = [makeArea('a1', 'Frente'), makeArea('a2', 'Costas'), makeArea('a3', 'Lado')];
    api.generateMockupApi.mockResolvedValueOnce({
      singleUrl: 'u1',
      batchResults: [
        { url: 'u1', areaName: 'Frente', areaId: 'a1' },
        { url: 'u3', areaName: 'Lado', areaId: 'a3' },
      ],
    });
    const { result } = await setup(areas);

    await act(async () => {
      await result.current.generateMockup();
    });

    const savedIds = api.saveMockupToDb.mock.calls.map((c) => c[0].area.id).sort();
    expect(savedIds).toEqual(['a1', 'a3']);
    expect(Object.keys(result.current.areaErrors)).toEqual(['a2']);
    expect(result.current.generatedBatchMockups.map((b) => b.areaId)).toEqual(['a1', 'a3']);

    // regerar SÓ a 2ª: chamada com uma única área, as outras não são tocadas
    api.generateMockupApi.mockClear();
    api.saveMockupToDb.mockClear();
    api.generateMockupApi.mockResolvedValueOnce({ singleUrl: 'u2', batchResults: [] });
    await act(async () => {
      await result.current.retryArea('a2');
    });

    expect(api.generateMockupApi).toHaveBeenCalledTimes(1);
    expect(api.generateMockupApi.mock.calls[0][0].areas.map((a: { id: string }) => a.id)).toEqual([
      'a2',
    ]);
    expect(api.saveMockupToDb.mock.calls.map((c) => c[0].area.id)).toEqual(['a2']);
    expect(result.current.areaErrors).toEqual({});
    expect(result.current.generatedBatchMockups.map((b) => b.areaId).sort()).toEqual([
      'a1',
      'a2',
      'a3',
    ]);
  });

  it('falha na regeração individual mantém o erro próprio da área', async () => {
    const areas = [makeArea('a1', 'Frente'), makeArea('a2', 'Costas')];
    api.generateMockupApi.mockResolvedValueOnce({
      singleUrl: 'u1',
      batchResults: [{ url: 'u1', areaName: 'Frente', areaId: 'a1' }],
    });
    const { result } = await setup(areas);
    await act(async () => {
      await result.current.generateMockup();
    });
    api.generateMockupApi.mockRejectedValueOnce(new Error('edge fora do ar'));
    await act(async () => {
      await result.current.retryArea('a2');
    });
    expect(result.current.areaErrors.a2).toBe('edge fora do ar');
    expect(result.current.retryingAreaIds).toEqual([]);
  });

  it(`${MAX_BATCH_AREAS + 1} áreas: lote recusado com mensagem, sem chamar a geração`, async () => {
    const areas = Array.from({ length: MAX_BATCH_AREAS + 1 }, (_, i) =>
      makeArea(`a${i}`, `Área ${i}`),
    );
    const { result } = await setup(areas);
    await act(async () => {
      await result.current.generateMockup();
    });
    expect(api.generateMockupApi).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalledWith(expect.stringContaining('Máximo de 6 áreas'));
    expect(result.current.generatedBatchMockups).toEqual([]);
  });

  it('nomes de área repetidos não colidem: cada resultado salva na SUA área (por id)', async () => {
    const areas = [makeArea('a1', 'Frente'), makeArea('a2', 'Frente')];
    api.generateMockupApi.mockResolvedValueOnce({
      singleUrl: 'u2',
      batchResults: [
        { url: 'u2', areaName: 'Frente', areaId: 'a2' },
        { url: 'u1', areaName: 'Frente', areaId: 'a1' },
      ],
    });
    const { result } = await setup(areas);
    await act(async () => {
      await result.current.generateMockup();
    });
    const byUrl = Object.fromEntries(
      api.saveMockupToDb.mock.calls.map((c) => [c[0].mockupUrl, c[0].area.id]),
    );
    expect(byUrl).toEqual({ u2: 'a2', u1: 'a1' });
    expect(result.current.areaErrors).toEqual({});
  });
});
