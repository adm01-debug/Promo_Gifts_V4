/**
 * Matriz de aceite do Mockup — GRUPO 1 (A01–A02): marca do cliente e upload/PNG salvo.
 *
 * Um teste por cenário, nomeado com o ID. Fixtures fixas em `./grupo1.fixtures.ts`
 * (nunca marca/cliente real). Nenhum teste desativado.
 *
 * A01 — marca do cliente aplicada e reaberta sem upload manual: exercita o
 *       `restoreDraft` de `useMockupGenerator` (rascunho com logo http + cliente
 *       + produto) e assere que a marca volta aplicada sem novo upload.
 * A02 — PNG válido salvo e recarregado restaura logo, cliente e produto: exercita
 *       `loadFromHistory` (logoPreview = `logo_url` do mockup persistido).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor, act } from '@testing-library/react';
import { toast } from 'sonner';

// Observação (não é o comportamento testado): sonner com `warning`, ausente no helper global.
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  }),
  Toaster: () => null,
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/image-converter', () => ({
  needsConversion: vi.fn(() => false),
  ensureSupportedFormat: vi.fn(async (f: File) => f),
}));
vi.mock('@/utils/image-utils', () => ({ getCdnUrl: (url: string) => url }));
vi.mock('@/lib/personalization/adapters', () => ({
  adaptTabelaPrecoRows: (rows: unknown[]) => rows,
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'fixture-user-id' } }) }));
vi.mock('@/components/mockup/mockupWizardStep', () => ({ getMockupWizardStep: () => 'product' }));
vi.mock('@/components/mockup/MockupSuccessToast', () => ({ showMockupSuccessToast: vi.fn() }));
vi.mock('@/components/mockup/techniqueColorUtils', () => ({
  classifyTechnique: () => 'other',
  techniqueNeedsColorConfig: () => false,
}));
// Dependências do hook — não é o comportamento sob teste.
vi.mock('@/hooks/mockup/useMockupTechniques', () => ({
  useFilteredTechniques: () => [],
  useProductCustomizationOptionsForMockup: () => ({ data: null }),
}));
vi.mock('@/hooks/simulation', () => ({
  useLogoColorAnalysis: () => ({
    colors: [],
    isAnalyzing: false,
    error: null,
    analyzeImage: vi.fn(),
    clearAnalysis: vi.fn(),
    updatePantone: vi.fn(),
  }),
  usePositionHistory: () => ({
    setOnApply: vi.fn(),
    pushState: vi.fn(),
    clear: vi.fn(),
    canRedo: false,
  }),
}));
vi.mock('@/hooks/mockup/mockupGenerationService', () => ({
  createDefaultArea: () => ({
    id: 'fixture-default-area',
    name: 'FIXTURE-AREA',
    positionX: 50,
    positionY: 50,
    logoWidth: 5,
    logoHeight: 3,
    logoPreview: null,
  }),
  fetchMockupHistory: vi.fn().mockResolvedValue([]),
  saveMockupToDb: vi.fn().mockResolvedValue('fixture-record-id'),
  generateMockupApi: vi.fn().mockResolvedValue({
    singleUrl: 'https://fixture.invalid/mockup.png',
    batchResults: [],
  }),
  downloadMockupAsPdf: vi.fn().mockResolvedValue(undefined),
  deleteMockupFromDb: vi.fn().mockResolvedValue(undefined),
}));

// Pontos controláveis: rascunho, catálogo de técnicas e produto do CRM.
const { mockLoadDraft, mockSaveDraft, mockClearDraft, mockGetProductById, mockDbInvoke } = vi.hoisted(
  () => ({
    mockLoadDraft: vi.fn(),
    mockSaveDraft: vi.fn(),
    mockClearDraft: vi.fn(),
    mockGetProductById: vi.fn(),
    mockDbInvoke: vi.fn(),
  }),
);

vi.mock('@/hooks/mockup/useMockupDraft', () => ({
  useMockupDraft: () => ({
    saveDraft: mockSaveDraft,
    loadDraft: mockLoadDraft,
    clearDraft: mockClearDraft,
    isSaving: false,
    isLoading: false,
    lastSaved: null,
    error: null,
  }),
}));
vi.mock('@/contexts/ProductsContext', () => ({
  useProductsContext: () => ({ getProductById: mockGetProductById, products: [] }),
}));
vi.mock('@/lib/db/postgrest', () => ({ dbInvoke: mockDbInvoke }));

import { renderHookWithProviders } from '../../../hooks/_helpers/render-hook-providers';
import { useMockupGenerator } from '@/hooks/mockup/useMockupGenerator';
import {
  CLIENTE_FIXTURE,
  PRODUTO_FIXTURE,
  TECNICA_FIXTURE,
  MARCA_CLIENTE_URL,
  LOGO_PNG_URL,
  RASCUNHO_MARCA_CLIENTE,
  MOCKUP_SALVO_PNG,
} from './grupo1.fixtures';

beforeEach(() => {
  vi.clearAllMocks();
  mockLoadDraft.mockResolvedValue(null);
  mockSaveDraft.mockResolvedValue(undefined);
  mockClearDraft.mockResolvedValue(undefined);
  // Catálogo de técnicas: só a técnica da fixture (campo cru do adaptador).
  mockDbInvoke.mockResolvedValue({
    records: [
      { id: TECNICA_FIXTURE.id, nome: TECNICA_FIXTURE.name, codigo_curto: TECNICA_FIXTURE.code },
    ],
    count: 1,
  });
  mockGetProductById.mockImplementation((id: string) =>
    id === PRODUTO_FIXTURE.id ? PRODUTO_FIXTURE : null,
  );
});

describe('A01 — marca do cliente aplicada e reaberta sem upload manual', () => {
  it('rascunho reaberto reaplica a marca (logo) do cliente, o cliente e o produto, sem novo upload', async () => {
    mockLoadDraft.mockResolvedValue(RASCUNHO_MARCA_CLIENTE);

    const { result } = renderHookWithProviders(() => useMockupGenerator());

    await waitFor(() => expect(result.current.selectedClient?.id).toBe(CLIENTE_FIXTURE.id));

    // Marca do cliente veio do rascunho reaberto — nenhum upload foi disparado neste teste.
    expect(result.current.personalizationAreas).toHaveLength(1);
    expect(result.current.personalizationAreas[0].logoPreview).toBe(MARCA_CLIENTE_URL);
    expect(result.current.personalizationAreas[0].logoWidth).toBe(
      RASCUNHO_MARCA_CLIENTE.personalizationAreas[0].logoWidth,
    );
    expect(result.current.personalizationAreas[0].positionX).toBe(
      RASCUNHO_MARCA_CLIENTE.personalizationAreas[0].positionX,
    );
    // Cliente e produto também reabertos, sem intervenção manual.
    expect(result.current.selectedClient?.name).toBe(CLIENTE_FIXTURE.name);
    expect(result.current.selectedProduct?.id).toBe(PRODUTO_FIXTURE.id);
    expect(result.current.selectedTechnique?.id).toBe(TECNICA_FIXTURE.id);
    // Feedback de rascunho restaurado fica visível.
    expect(result.current.showDraftRestoredNotice).toBe(true);
  });
});

describe('A02 — PNG válido salvo e recarregado restaura logo, cliente e produto', () => {
  it('recarregar o mockup salvo do histórico reaplica a logo (PNG), o cliente e o produto', async () => {
    const { result } = renderHookWithProviders(() => useMockupGenerator());

    // Espera o carregamento de montagem (catálogo de técnicas) para o histórico casar a técnica.
    await waitFor(() => expect(result.current.isLoadingData).toBe(false));

    await act(async () => {
      await result.current.loadFromHistory(MOCKUP_SALVO_PNG);
    });

    // Logo (PNG salvo) reaplicada como preview da área, sem upload.
    expect(result.current.personalizationAreas).toHaveLength(1);
    expect(result.current.personalizationAreas[0].logoPreview).toBe(LOGO_PNG_URL);
    // Cliente e produto restaurados do registro salvo.
    expect(result.current.selectedClient?.id).toBe(CLIENTE_FIXTURE.id);
    expect(result.current.selectedClient?.name).toBe(CLIENTE_FIXTURE.name);
    expect(result.current.selectedProduct?.id).toBe(PRODUTO_FIXTURE.id);
    expect(result.current.selectedTechnique?.name).toBe(TECNICA_FIXTURE.name);
    // Rascunho antigo limpo (não re-persiste o PNG carregado por cima) + feedback ao usuário.
    expect(mockClearDraft).toHaveBeenCalledTimes(1);
    expect((toast as unknown as { success: ReturnType<typeof vi.fn> }).success).toHaveBeenCalledWith(
      'Configurações carregadas!',
    );
  });
});
