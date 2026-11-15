/**
 * Restauração da seleção (produto + variante + foto) do rascunho e do histórico.
 *
 * Defeito M07/etapa 55: reabrir remontava a seleção com `variant: null` e
 * `product.images[0]` — devolvia a PRIMEIRA foto do produto no lugar da foto (e
 * da variante) que o vendedor havia escolhido. `mockup_drafts` e
 * `generated_mockups` não têm coluna para isso (schema congelado), então o
 * snapshot viaja na cópia local do rascunho e num registro local por mockup.
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExternalVariantStock, Product } from '@/hooks/products';
import { type MockupDraftData, useMockupDraft } from '@/hooks/mockup/useMockupDraft';
import { useMockupGenerator } from '@/hooks/mockup/useMockupGenerator';
import type { GeneratedMockup } from '@/hooks/mockup/mockupGenerationService';
import type { PersonalizationArea } from '@/components/mockup/MultiAreaManager';

const FOTO_1 = 'https://cdn.test/caneca-foto-1.jpg';
const FOTO_P2 = 'https://cdn.test/copo-foto-1.jpg';
const FOTO_3 = 'https://cdn.test/caneca-foto-3.jpg';
const T_OLD = '2026-06-01T10:00:00.000Z';
const T_NEW = '2026-06-01T11:00:00.000Z';
const LOCAL_KEY = 'mockup_draft_v1_user-test-001_default';

const PRODUCT = {
  id: 'prod-1',
  name: 'Caneca Porcelana',
  images: [FOTO_1, 'https://cdn.test/caneca-foto-2.jpg', FOTO_3],
  largura_cm: 8,
  altura_cm: 10,
} as unknown as Product;

/** Outro produto, escolhido em outro dispositivo (rascunho do backend mais novo). */
const PRODUCT_2 = {
  id: 'prod-2',
  name: 'Copo Térmico',
  images: [FOTO_P2],
  largura_cm: 8,
  altura_cm: 10,
} as unknown as Product;

/** Variante B: a foto 3 é a foto original escolhida pelo vendedor. */
const VARIANTE_B = {
  id: 'var-B',
  product_id: 'prod-1',
  color_name: 'Azul',
  color_hex: '#0000ff',
  selected_thumbnail: FOTO_3,
} as unknown as ExternalVariantStock;

const AREA = {
  id: 'area-1',
  name: 'Frente',
  positionX: 50,
  positionY: 50,
  logoWidth: 5,
  logoHeight: 3,
  logoPreview: 'https://cdn.test/logo.png',
} as PersonalizationArea;

const MOCKUP_ROW = {
  id: 'rec-B',
  product_id: 'prod-1',
  product_name: 'Caneca Porcelana',
  technique_id: null,
  technique_name: 'Serigrafia',
  mockup_url: 'https://cdn.test/mockup-B.png',
  logo_url: null,
  created_at: T_NEW,
} as unknown as GeneratedMockup;

const SELECAO_B = {
  productId: 'prod-1',
  variant: VARIANTE_B,
  colorName: 'Azul',
  colorHex: '#0000ff',
  imageUrl: FOTO_3,
};

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

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-test-001' } }),
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
    auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
    from: (table: string) =>
      table === 'mockup_drafts'
        ? { select: supabaseMock.select, upsert: supabaseMock.upsert, delete: supabaseMock.delete }
        : {},
  },
}));

vi.mock('@/lib/mockup-storage', () => ({
  uploadLogoToStorage: vi.fn(() => Promise.resolve('https://cdn.test/logo.png')),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock('@/lib/image-converter', () => ({
  needsConversion: vi.fn(() => false),
  ensureSupportedFormat: vi.fn((file: File) => Promise.resolve(file)),
}));

vi.mock('@/lib/db/postgrest', () => ({
  dbInvoke: vi.fn(() => Promise.resolve({ records: [], count: 0 })),
}));

vi.mock('@/contexts/ProductsContext', () => ({
  useProductsContext: () => ({
    getProductById: (id: string) =>
      id === PRODUCT.id ? PRODUCT : id === PRODUCT_2.id ? PRODUCT_2 : undefined,
    products: [],
  }),
}));

// `resolveTechnique` vem do modulo real: e funcao pura e o gerador depende dela
// para resolver a tecnica do rascunho/historico (so os hooks de rede sao substituidos).
vi.mock('@/hooks/mockup/useMockupTechniques', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useFilteredTechniques: (list: unknown[]) => list,
  useProductCustomizationOptionsForMockup: () => ({ data: null, isLoading: false }),
}));

vi.mock('@/hooks/simulation', () => ({
  useLogoColorAnalysis: () => ({ analyzeImage: vi.fn(), clearAnalysis: vi.fn() }),
  usePositionHistory: () => ({
    setOnApply: vi.fn(),
    pushState: vi.fn(),
    clear: vi.fn(),
    canRedo: false,
    canUndo: false,
    canApply: false,
    undo: vi.fn(),
    redo: vi.fn(),
  }),
}));

vi.mock('@/hooks/mockup/mockupGenerationService', () => ({
  createDefaultArea: () => ({ ...AREA, logoPreview: null }),
  fetchMockupHistory: vi.fn(() => Promise.resolve([])),
  saveMockupToDb: vi.fn(() => Promise.resolve('rec-B')),
  generateMockupApi: vi.fn(() => Promise.resolve({ singleUrl: null, batchResults: [] })),
  downloadMockupAsPdf: vi.fn(() => Promise.resolve(undefined)),
  deleteMockupFromDb: vi.fn(() => Promise.resolve(undefined)),
}));

// ── Setup ────────────────────────────────────────────────────────────────────

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

// ── Rascunho e histórico ─────────────────────────────────────────────────────

describe('reabrir rascunho ou histórico restaura variante e foto exatas', () => {
  it('rascunho restaura a variante B e a foto 3 (não a primeira foto)', async () => {
    seedDraft(SELECAO_B);
    const { result } = renderHook(() => useMockupGenerator(), { wrapper: MemoryRouter });

    await waitFor(() => expect(result.current.productSelection).not.toBeNull());
    expect(result.current.productSelection?.variant?.id).toBe('var-B');
    expect(result.current.productSelection?.colorName).toBe('Azul');
    expect(result.current.productSelection?.imageUrl).toBe(FOTO_3);
  });

  it('rascunho sem snapshot cai para a primeira foto do produto (compatibilidade)', async () => {
    seedDraft(undefined);
    const { result } = renderHook(() => useMockupGenerator(), { wrapper: MemoryRouter });

    await waitFor(() => expect(result.current.productSelection).not.toBeNull());
    expect(result.current.productSelection?.variant).toBeNull();
    expect(result.current.productSelection?.imageUrl).toBe(FOTO_1);
  });

  it('rascunho do backend mais recente não apaga a seleção guardada localmente', async () => {
    seedDraft(SELECAO_B);
    supabaseMock.maybeSingle.mockResolvedValue({
      data: {
        product_id: 'prod-1',
        product_name: 'Caneca Copo',
        personalization_areas: [],
        logo_data: null,
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

  // ── Contaminação entre produtos (auditoria 2026-11-14) ───────────────────
  // O snapshot local é de prod-1; o backend, mais novo, já está em prod-2 (o
  // vendedor trocou de produto em outro dispositivo). Colar a seleção antiga
  // no produto novo não é só exibição: `getProductImage()` manda essa imageUrl
  // para `generateMockupApi`, então o mockup sairia GERADO sobre a foto do
  // produto errado.
  it('backend mais novo com OUTRO produto descarta a seleção local', async () => {
    seedDraft(SELECAO_B);
    supabaseMock.maybeSingle.mockResolvedValue({
      data: {
        product_id: 'prod-2',
        product_name: 'Copo Térmico',
        personalization_areas: [],
        logo_data: null,
        updated_at: T_NEW,
      },
      error: null,
    });

    const { result } = renderHook(() => useMockupDraft());
    const out: { draft: MockupDraftData | null } = { draft: null };
    await act(async () => {
      out.draft = await result.current.loadDraft();
    });

    expect(out.draft?.productId).toBe('prod-2');
    expect(out.draft?.selection ?? null).toBeNull();
  });

  it('gerador: produto do backend (prod-2) não herda a foto nem a variante do prod-1', async () => {
    seedDraft(SELECAO_B);
    supabaseMock.maybeSingle.mockResolvedValue({
      data: {
        product_id: 'prod-2',
        product_name: 'Copo Térmico',
        personalization_areas: [],
        logo_data: null,
        updated_at: T_NEW,
      },
      error: null,
    });

    const { result } = renderHook(() => useMockupGenerator(), { wrapper: MemoryRouter });

    await waitFor(() => expect(result.current.productSelection).not.toBeNull());
    expect(result.current.productSelection?.product.id).toBe('prod-2');
    expect(result.current.productSelection?.variant).toBeNull();
    expect(result.current.productSelection?.colorName).toBeUndefined();
    expect(result.current.productSelection?.imageUrl).toBe(FOTO_P2);
  });

  it('updatedAt do backend inválido mantém a cópia local (desempate do main)', async () => {
    seedDraft(SELECAO_B);
    supabaseMock.maybeSingle.mockResolvedValue({
      data: {
        product_id: 'prod-2',
        product_name: 'Copo Térmico',
        personalization_areas: [],
        logo_data: null,
        updated_at: 'nao-e-data',
      },
      error: null,
    });

    const { result } = renderHook(() => useMockupDraft());
    const out: { draft: MockupDraftData | null } = { draft: null };
    await act(async () => {
      out.draft = await result.current.loadDraft();
    });

    expect(out.draft?.productId).toBe('prod-1');
    expect(out.draft?.productName).toBe('Caneca Porcelana');
    expect(out.draft?.selection?.variant?.id).toBe('var-B');
  });

  it('histórico restaura a mesma variante B e a mesma foto 3', async () => {
    const { result } = renderHook(() => useMockupGenerator(), { wrapper: MemoryRouter });
    await waitFor(() => expect(result.current.isLoadingData).toBe(false));

    act(() => {
      result.current.setProductSelection({
        product: PRODUCT,
        variant: VARIANTE_B,
        colorName: 'Azul',
        colorHex: '#0000ff',
        imageUrl: FOTO_3,
      });
      result.current.setSelectedTechnique({ id: 'tec-1', name: 'Serigrafia', code: 'silk' });
    });
    await act(async () => {
      await result.current.saveMockupToHistory('https://cdn.test/mockup-B.png', AREA);
    });

    // Volta ao estado "em branco" antes de recarregar do histórico, para que a
    // seleção observada venha do registro salvo e não do estado que ficou.
    await act(async () => {
      await result.current.resetForm();
    });
    expect(result.current.productSelection).toBeNull();

    await act(async () => {
      await result.current.loadFromHistory(MOCKUP_ROW);
    });

    expect(result.current.productSelection?.product.id).toBe('prod-1');
    expect(result.current.productSelection?.variant?.id).toBe('var-B');
    expect(result.current.productSelection?.imageUrl).toBe(FOTO_3);
  });

  it('excluir o mockup descarta a seleção guardada do registro', async () => {
    const { result } = renderHook(() => useMockupGenerator(), { wrapper: MemoryRouter });
    await waitFor(() => expect(result.current.isLoadingData).toBe(false));

    act(() => {
      result.current.setProductSelection({
        product: PRODUCT,
        variant: VARIANTE_B,
        colorName: 'Azul',
        colorHex: '#0000ff',
        imageUrl: FOTO_3,
      });
      result.current.setSelectedTechnique({ id: 'tec-1', name: 'Serigrafia', code: 'silk' });
    });
    await act(async () => {
      await result.current.saveMockupToHistory('https://cdn.test/mockup-B.png', AREA);
    });
    expect(localStorage.getItem('mockup_selection_v1_user-test-001_rec-B')).not.toBeNull();

    act(() => {
      result.current.setMockupToDelete('rec-B');
    });
    await act(async () => {
      await result.current.deleteMockup();
    });

    expect(localStorage.getItem('mockup_selection_v1_user-test-001_rec-B')).toBeNull();
  });
});
