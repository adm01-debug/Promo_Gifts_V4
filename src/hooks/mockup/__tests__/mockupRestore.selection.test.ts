/**
 * Restauração da seleção (produto + variante + foto) do rascunho e do histórico.
 * Defeito M07/etapa 55: reabrir remontava a seleção com `variant: null` e `product.images[0]`.
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import type { ExternalVariantStock, Product } from '@/hooks/products';
import { type MockupDraftData, useMockupDraft } from '@/hooks/mockup/useMockupDraft';
import { useMockupGenerator } from '@/hooks/mockup/useMockupGenerator';
import { mockupSelection } from '@/hooks/mockup/mockupSelectionSnapshot';
import type { GeneratedMockup } from '@/hooks/mockup/mockupGenerationService';
import type { PersonalizationArea } from '@/components/mockup/MultiAreaManager';

const FOTO_1 = 'https://cdn.test/caneca-foto-1.jpg';
const FOTO_3 = 'https://cdn.test/caneca-foto-3.jpg';
const T_OLD = '2026-06-01T10:00:00.000Z';
const T_NEW = '2026-06-01T11:00:00.000Z';
const LOCAL_KEY = 'mockup_draft_v1_user-test-001_default';

const PRODUCT = {
  id: 'prod-1',
  images: [FOTO_1, 'https://cdn.test/caneca-foto-2.jpg', FOTO_3],
} as Product;

const VARIANTE_B = {
  id: 'var-B',
  product_id: 'prod-1',
  selected_thumbnail: FOTO_3,
} as ExternalVariantStock;

const AREA = {
  id: 'area-1',
  name: 'Frente',
  logoPreview: 'https://cdn.test/logo.png',
} as PersonalizationArea;

const MOCKUP_ROW = {
  id: 'rec-B',
  product_id: 'prod-1',
  technique_name: 'Serigrafia',
  created_at: T_NEW,
} as GeneratedMockup;

const SELECAO_B = { variant: VARIANTE_B, colorName: 'Azul', imageUrl: FOTO_3 };

const DRAFT_BASE: MockupDraftData = {
  productId: 'prod-1',
  productName: 'Caneca Porcelana',
  techniqueId: null,
  techniqueName: null,
  clientId: null,
  clientName: null,
  personalizationAreas: [],
  updatedAt: T_OLD,
};

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-test-001' } }) }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));
vi.mock('@/lib/db/postgrest', () => ({
  dbInvoke: vi.fn(() => Promise.resolve({ records: [], count: 0 })),
}));

const supabaseMock = vi.hoisted(() => {
  const node = { eq: vi.fn(), maybeSingle: vi.fn() };
  node.eq.mockReturnValue(node);
  return {
    maybeSingle: node.maybeSingle,
    upsert: vi.fn(),
    select: vi.fn(() => node),
    delete: vi.fn(() => node),
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) =>
      table === 'mockup_drafts'
        ? { select: supabaseMock.select, upsert: supabaseMock.upsert, delete: supabaseMock.delete }
        : {},
  },
}));

vi.mock('@/lib/image-converter', () => ({
  needsConversion: vi.fn(() => false),
  ensureSupportedFormat: vi.fn((file: File) => Promise.resolve(file)),
}));

vi.mock('@/contexts/ProductsContext', () => ({
  useProductsContext: () => ({
    getProductById: (id: string) => (id === PRODUCT.id ? PRODUCT : undefined),
    products: [],
  }),
}));

vi.mock('@/hooks/mockup/useMockupTechniques', () => ({
  useFilteredTechniques: (list: unknown[]) => list,
  useProductCustomizationOptionsForMockup: () => ({ data: null, isLoading: false }),
}));

vi.mock('@/hooks/simulation', () => ({
  useLogoColorAnalysis: () => ({ analyzeImage: vi.fn(), clearAnalysis: vi.fn() }),
  usePositionHistory: () => ({ setOnApply: vi.fn(), clear: vi.fn(), canRedo: false }),
}));

vi.mock('@/hooks/mockup/mockupGenerationService', () => ({
  createDefaultArea: () => ({ ...AREA, logoPreview: null }),
  fetchMockupHistory: vi.fn(() => Promise.resolve([])),
  saveMockupToDb: vi.fn(() => Promise.resolve('rec-B')),
  generateMockupApi: vi.fn(() => Promise.resolve({ singleUrl: null, batchResults: [] })),
  downloadMockupAsPdf: vi.fn(() => Promise.resolve(undefined)),
  deleteMockupFromDb: vi.fn(() => Promise.resolve(undefined)),
}));

beforeEach(() => {
  localStorage.clear();
  supabaseMock.maybeSingle.mockReset();
  supabaseMock.maybeSingle.mockResolvedValue({ data: null, error: null });
  supabaseMock.upsert.mockReset();
  supabaseMock.upsert.mockResolvedValue({ error: null });
});

function seedDraft(selection: unknown) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...DRAFT_BASE, selection }));
}

describe('reabrir rascunho ou histórico restaura variante e foto exatas', () => {
  it('rascunho restaura a variante B e a foto 3 (não a primeira foto)', async () => {
    seedDraft(SELECAO_B);
    const { result } = renderHook(() => useMockupGenerator());

    await waitFor(() => expect(result.current.productSelection).not.toBeNull());
    expect(result.current.productSelection?.variant?.id).toBe('var-B');
    expect(result.current.productSelection?.colorName).toBe('Azul');
    expect(result.current.productSelection?.imageUrl).toBe(FOTO_3);
  });

  it('rascunho do backend mais recente não apaga a seleção guardada localmente', async () => {
    seedDraft(SELECAO_B);
    supabaseMock.maybeSingle.mockResolvedValue({
      data: {
        product_id: 'prod-1',
        product_name: 'Caneca Copo',
        personalization_areas: [],
        updated_at: T_NEW,
      },
      error: null,
    });

    const { result } = renderHook(() => useMockupDraft());
    const out: { draft: MockupDraftData | null } = { draft: null };
    await act(async () => {
      out.draft = await result.current.loadDraft();
    });

    expect(out.draft?.productName).toBe('Caneca Copo');
    expect(out.draft?.selection?.variant?.id).toBe('var-B');
    expect(out.draft?.selection?.imageUrl).toBe(FOTO_3);
  });

  it('histórico restaura a mesma variante B e a mesma foto 3', async () => {
    const { result } = renderHook(() => useMockupGenerator());
    await waitFor(() => expect(result.current.isLoadingData).toBe(false));

    act(() => {
      result.current.setProductSelection({
        product: PRODUCT,
        variant: VARIANTE_B,
        colorName: 'Azul',
        imageUrl: FOTO_3,
      });
      result.current.setSelectedTechnique({ id: 'tec-1', name: 'Serigrafia', code: 'silk' });
    });
    await act(async () => {
      await result.current.saveMockupToHistory('https://cdn.test/mockup-B.png', AREA);
    });
    await act(async () => {
      await result.current.loadFromHistory(MOCKUP_ROW);
    });

    expect(result.current.productSelection?.product.id).toBe('prod-1');
    expect(result.current.productSelection?.variant?.id).toBe('var-B');
    expect(result.current.productSelection?.imageUrl).toBe(FOTO_3);
  });
});

describe('falha do localStorage avisa o vendedor em vez de engolir o erro', () => {
  it('gravar e ler a seleção do histórico avisam e não quebram o fluxo', () => {
    const indisponivel = () => {
      throw new Error('localStorage indisponível');
    };
    const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation(indisponivel);
    expect(() => mockupSelection.saveForHistory('u-1', 'rec-B', SELECAO_B)).not.toThrow();
    setItem.mockRestore();

    const getItem = vi.spyOn(localStorage, 'getItem').mockImplementation(indisponivel);
    expect(mockupSelection.readForHistory('u-1', 'rec-B')).toBeNull();
    expect(toast.error).toHaveBeenCalledTimes(2);
    getItem.mockRestore();
  });
});
