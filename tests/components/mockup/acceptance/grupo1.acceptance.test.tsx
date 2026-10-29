/**
 * Matriz de aceite do Mockup — GRUPO 1 (A01–A02): marca do cliente e upload/PNG salvo.
 *
 * Um teste por cenário, nomeado com o ID. Fixtures fixas em `./grupo1.fixtures.ts`
 * (nunca marca/cliente real). Nenhum teste desativado.
 *
 * COBERTO (passa no código atual, com o `useMockupGenerator` REAL; só as
 * dependências de dados — rascunho, catálogo, serviço — são substituídas):
 * A01 — reabrir o rascunho restaura, sem novo upload, a logo (marca) JÁ HOSPEDADA
 *       (http), o cliente, o produto e a técnica: exercita o `restoreDraft`.
 * A02 — recarregar do histórico o mockup salvo com PNG restaura a logo, o cliente,
 *       o produto, a técnica e a geometria: exercita o `loadFromHistory`.
 *
 * PENDENTE (depende de correção ainda não integrada; por isso NÃO vira teste agora):
 * A01 "marca do cliente APLICADA": hoje o `logo_url` que o CRM (Singu) devolve só
 *       vira avatar e cabeçalho da ficha, nunca logo do mockup. A ação "Usar logo do
 *       cliente" (plano Mockup, etapa 54) está na branch v2/s54-2610081948, ainda não
 *       integrada; quando entrar, este item vira teste. O teste acima prova só o
 *       "reaberta sem upload".
 * A01 com logo recém-enviada (data URL): `useMockupDraft` descarta logo que não
 *       seja http ao gravar o rascunho (etapa 11, branch v2/refazer-ac17539c) — por
 *       isso a marca do rascunho da fixture já está hospedada. (O salvamento do PNG
 *       enviado é coberto em `src/hooks/mockup/__tests__/mockupGenerationService.test.ts`.)
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
// Só os dois hooks de dados são trocados; o resto do módulo (ex.: `resolveTechnique`) segue real.
vi.mock('@/hooks/mockup/useMockupTechniques', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/mockup/useMockupTechniques')>()),
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
const { mockLoadDraft, mockSaveDraft, mockClearDraft, mockGetProductById, mockDbInvoke } =
  vi.hoisted(() => ({
    mockLoadDraft: vi.fn(),
    mockSaveDraft: vi.fn(),
    mockClearDraft: vi.fn(),
    mockGetProductById: vi.fn(),
    mockDbInvoke: vi.fn(),
  }));

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
  it('rascunho reaberto restaura a marca (logo já hospedada), o cliente, o produto e a técnica, sem novo upload', async () => {
    mockLoadDraft.mockResolvedValue(RASCUNHO_MARCA_CLIENTE);

    const { result } = renderHookWithProviders(() => useMockupGenerator());

    await waitFor(() => expect(result.current.selectedClient?.id).toBe(CLIENTE_FIXTURE.id));

    // A marca veio do rascunho reaberto — nenhum upload foi disparado neste teste.
    expect(result.current.personalizationAreas).toHaveLength(1);
    expect(result.current.activeArea.id).toBe(RASCUNHO_MARCA_CLIENTE.personalizationAreas[0].id);
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
  it('recarregar o mockup salvo do histórico restaura a logo (PNG), o cliente, o produto, a técnica e a geometria', async () => {
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
    // Posição e medida gravadas no registro voltam para a área (não os padrões).
    const area = result.current.personalizationAreas[0];
    expect(area.name).toBe(MOCKUP_SALVO_PNG.location_name);
    expect(area.positionX).toBe(MOCKUP_SALVO_PNG.position_x);
    expect(area.positionY).toBe(MOCKUP_SALVO_PNG.position_y);
    expect(area.logoWidth).toBe(MOCKUP_SALVO_PNG.logo_width_cm);
    expect(area.logoHeight).toBe(MOCKUP_SALVO_PNG.logo_height_cm);
    // Rascunho antigo limpo (não re-persiste o PNG carregado por cima) + feedback ao usuário.
    expect(mockClearDraft).toHaveBeenCalledTimes(1);
    expect(
      (toast as unknown as { success: ReturnType<typeof vi.fn> }).success,
    ).toHaveBeenCalledWith('Configurações carregadas!');
  });
});
