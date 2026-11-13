/**
 * E-6 — Brand Kit do Magic Up: o efeito de sincronização NÃO pode apagar
 * edições locais nem desfazer a logo principal escolhida.
 *
 * Contrato provado aqui:
 *  1. editar o kit e depois trocar a logo → as edições permanecem;
 *  2. marcar uma logo do kit como principal persiste (isPrimary/primaryLogoUrl);
 *  3. o kit vindo do servidor entra só na carga inicial do cliente.
 *
 * Sem a correção o efeito depende de `logoPreview` e reaplica `loadedBrandKit`
 * a cada troca de logo, zerando `brandKit` para o estado do servidor.
 */
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMagicUpState } from '@/hooks/useMagicUpState';
import type { CrmCompany } from '@/types/crm';
import type { MagicUpBrandLogo } from '@/pages/magic-up/magicUpStrategy';

function company(
  overrides: Partial<CrmCompany> & Pick<CrmCompany, 'id' | 'razao_social'>,
): CrmCompany {
  return {
    nome_fantasia: null,
    title: null,
    cnpj: null,
    ramo_atividade: null,
    status: 'fixture',
    source: null,
    is_customer: false,
    is_supplier: false,
    is_carrier: false,
    is_matriz: false,
    logradouro: null,
    numero: null,
    complemento: null,
    bairro: null,
    cidade: null,
    estado: null,
    cep: null,
    pais: null,
    endereco: null,
    endereco_faturamento: null,
    inscricao_estadual: null,
    inscricao_municipal: null,
    cnae_principal: null,
    cnae_descricao: null,
    website: null,
    instagram: null,
    facebook: null,
    linkedin: null,
    logo_url: null,
    grupo_economico: null,
    grupo_economico_id: null,
    matriz_id: null,
    central_id: null,
    singular_id: null,
    tipo_cooperativa: null,
    employee_count: null,
    annual_revenue: null,
    financial_health: null,
    bitrix_company_id: null,
    bitrix_created_at: null,
    bitrix_updated_at: null,
    _deprecated_email: null,
    _deprecated_phone: null,
    _deprecated_phone_secondary: null,
    tags_array: [],
    challenges: [],
    competitors: [],
    search_vector: null,
    deleted_at: null,
    deleted_by: null,
    user_id: null,
    assigned_by_id: null,
    created_by_id: null,
    merge_notes: null,
    created_at: '2026-11-10T00:00:00Z',
    updated_at: '2026-11-10T00:00:00Z',
    ...overrides,
  };
}

const mocks = vi.hoisted(() => ({
  fromMock: vi.fn(),
  invokeMock: vi.fn().mockResolvedValue({ data: null, error: null }),
  announceStatus: vi.fn(),
  announceAlert: vi.fn(),
  userId: 'user-1',
  products: vi.fn().mockResolvedValue([]),
  db: vi.fn().mockResolvedValue({ records: [], count: 0 }),
  brandKitRow: null as Record<string, unknown> | null,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'test-anon-key',
  supabase: {
    from: mocks.fromMock,
    functions: { invoke: mocks.invokeMock },
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: mocks.userId, email: 'u@e.com' }, loading: false }),
}));

vi.mock('@/components/a11y', () => ({
  useAriaLive: () => ({ announceStatus: mocks.announceStatus, announceAlert: mocks.announceAlert }),
}));

vi.mock('@/hooks/useMockupTechniques', () => ({
  useProductCustomizationOptionsForMockup: () => ({ data: null, isLoading: false }),
}));

vi.mock('@/lib/external-db', () => ({
  fetchPromobrindProducts: mocks.products,
}));

vi.mock('@/lib/db/postgrest', () => ({ dbInvoke: mocks.db }));

vi.mock('@/lib/crm-db', () => ({
  searchCrm: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/types/crm', () => ({
  getCompanyDisplayName: () => 'ACME',
}));

/** Chain mínimo do supabase-js: métodos encadeáveis + terminais que resolvem. */
function makeBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  const chainable = [
    'select',
    'insert',
    'update',
    'delete',
    'upsert',
    'eq',
    'neq',
    'in',
    'is',
    'not',
    'or',
    'and',
    'match',
    'filter',
    'order',
    'limit',
    'range',
    'gt',
    'gte',
    'lt',
    'lte',
    'like',
    'ilike',
    'contains',
  ];
  for (const method of chainable) builder[method] = vi.fn(() => builder);
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return builder;
}

const SERVER_KIT_LOGO_A: MagicUpBrandLogo = {
  id: 'srv-1',
  label: 'Logo A',
  url: 'https://cdn.example.com/a.png',
  variant: 'principal',
  isPrimary: true,
};
const SERVER_KIT_LOGO_B: MagicUpBrandLogo = {
  id: 'srv-2',
  label: 'Logo B',
  url: 'https://cdn.example.com/b.png',
  variant: 'colorida',
  isPrimary: false,
};

function serverKitRow(): Record<string, unknown> {
  return {
    id: 'kit-1',
    client_id: 'client-1',
    client_name: 'ACME',
    logo_urls: [SERVER_KIT_LOGO_A, SERVER_KIT_LOGO_B],
    primary_color: '#123456',
    secondary_color: '#654321',
    tone_of_voice: 'premium-consultivo',
    visual_style: 'limpo-corporativo',
    required_words: ['promo'],
    forbidden_words: [],
    notes: 'kit do servidor',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.brandKitRow = null;
  mocks.userId = 'user-1';
  mocks.products.mockReset().mockResolvedValue([]);
  mocks.db.mockReset().mockResolvedValue({ records: [], count: 0 });
  mocks.fromMock.mockImplementation((table: string) =>
    table === 'magic_up_brand_kits'
      ? makeBuilder({ data: mocks.brandKitRow, error: null })
      : makeBuilder({ data: [], error: null }),
  );
});

describe('useMagicUpState — Brand Kit não apaga edições nem desfaz a logo principal (E-6)', () => {
  it('editar o kit e trocar a logo mantém as edições locais e a logo principal escolhida', async () => {
    mocks.brandKitRow = serverKitRow();
    const { result } = renderHook(() => useMagicUpState(), { wrapper });

    act(() => {
      result.current.handleSelectClient(company({ id: 'client-1', razao_social: 'ACME LTDA' }));
    });

    // Kit do servidor entra na carga inicial.
    await waitFor(() => expect(result.current.brandKit.id).toBe('kit-1'));
    expect(result.current.brandKit.toneOfVoice).toBe('premium-consultivo');

    // Usuário edita o kit (edição ainda não salva).
    act(() => {
      result.current.handleUpdateBrandKit({ toneOfVoice: 'editorial', notes: 'minha edição' });
    });
    expect(result.current.brandKit.toneOfVoice).toBe('editorial');

    // Usuário escolhe outra logo do kit como principal.
    act(() => {
      result.current.handleUseBrandLogo(SERVER_KIT_LOGO_B);
    });

    // As edições permanecem (não são resetadas ao kit do servidor).
    expect(result.current.brandKit.toneOfVoice).toBe('editorial');
    expect(result.current.brandKit.notes).toBe('minha edição');
    // A logo principal escolhida persiste.
    expect(result.current.brandKit.primaryLogoUrl).toBe(SERVER_KIT_LOGO_B.url);
    expect(result.current.brandKit.logoUrls.find((l) => l.id === 'srv-2')?.isPrimary).toBe(true);
    expect(result.current.brandKit.logoUrls.find((l) => l.id === 'srv-1')?.isPrimary).toBe(false);
    expect(result.current.logoPreview).toBe(SERVER_KIT_LOGO_B.url);
    // E o kit do servidor não foi reaplicado (logo principal não voltou para srv-1).
    expect(result.current.brandKit.primaryLogoUrl).not.toBe(SERVER_KIT_LOGO_A.url);
  });

  it('sem kit salvo, editar o kit e trocar a logo preserva as edições locais', async () => {
    mocks.brandKitRow = null;
    const { result } = renderHook(() => useMagicUpState(), { wrapper });

    act(() => {
      result.current.handleSelectClient(
        company({
          id: 'client-2',
          razao_social: 'Sem Kit LTDA',
          logo_url: 'https://crm.example.com/sem-kit.png',
        }),
      );
    });

    await waitFor(() => expect(result.current.brandKit.clientId).toBe('client-2'));
    expect(result.current.brandKit.id).toBeNull();

    act(() => {
      result.current.handleUpdateBrandKit({
        toneOfVoice: 'editorial',
        notes: 'edição sem kit salvo',
      });
    });

    act(() => {
      result.current.handleUseBrandLogo({
        id: 'avulsa-1',
        label: 'Logo avulsa',
        url: 'https://cdn.example.com/avulsa.png',
        variant: 'icone',
        isPrimary: true,
      });
    });

    // A edição local sobrevive à troca de logo (o fallback do CRM não é reaplicado).
    expect(result.current.brandKit.toneOfVoice).toBe('editorial');
    expect(result.current.brandKit.notes).toBe('edição sem kit salvo');
    expect(result.current.brandKit.primaryLogoUrl).toBe('https://cdn.example.com/avulsa.png');
  });
});

describe('Original MagicUp search and asynchronous navigation', () => {
  it('first load failure finishes initial skeleton and exposes no fabricated products', async () => {
    mocks.products.mockRejectedValue(Error('offline'));
    const { result } = renderHook(() => useMagicUpState(), { wrapper });
    await waitFor(() => expect(result.current.initialProductsLoaded).toBe(true));
    expect(result.current.loadingProducts).toBe(false);
    expect(result.current.products).toEqual([]);
  });
  it('debounces real search, keeps selection and accepts only the latest server response', async () => {
    const { result } = renderHook(() => useMagicUpState(), { wrapper });
    await waitFor(() => expect(result.current.initialProductsLoaded).toBe(true));
    let resolveOld: (value: unknown) => void = () => {};
    mocks.products.mockImplementation(({ search }) =>
      search === 'old'
        ? new Promise((resolve) => {
            resolveOld = resolve;
          })
        : Promise.resolve([{ id: 'new', name: 'Novo', sku: 'NEW', images: [] }]),
    );
    act(() => {
      result.current.handleSelectProduct({
        id: 'selected',
        name: 'Selecionado',
        sku: 'SEL',
        images: [],
      });
      result.current.setProductSearch('old');
    });
    expect(mocks.products).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mocks.products).toHaveBeenCalledWith({ search: 'old', limit: 150 }));
    act(() => result.current.setProductSearch('new'));
    await waitFor(() => expect(result.current.products[0]?.id).toBe('new'));
    await act(async () => resolveOld([{ id: 'old', name: 'Antigo', sku: 'OLD', images: [] }]));
    expect(result.current.products[0].id).toBe('new');
    expect(result.current.selectedProduct?.id).toBe('selected');
    expect(result.current.initialProductsLoaded).toBe(true);
  });
  it('clears selected-product loading state and suppresses stale images/colors after navigation', async () => {
    let resolveOld: (value: unknown) => void = () => {};
    mocks.db.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    );
    const { result } = renderHook(() => useMagicUpState(), { wrapper });
    act(() =>
      result.current.handleSelectProduct({ id: 'p-old', name: 'Antigo', sku: 'OLD', images: [] }),
    );
    await waitFor(() => expect(mocks.db).toHaveBeenCalledTimes(2));
    const signals = mocks.db.mock.calls.map(([o]) => o.signal);
    act(() => result.current.handleSelectProduct(null));
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    await act(async () => resolveOld({ records: [{ id: 'late', url_cdn: 'late.png' }], count: 1 }));
    expect(result.current.productImages).toEqual([]);
    expect(result.current.loadingColors).toBe(false);
  });
  it('hydrates a changed brand-kit version and preserves local edits across a same-version refetch', async () => {
    mocks.brandKitRow = serverKitRow();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const stable = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useMagicUpState(), { wrapper: stable });
    act(() => result.current.handleSelectClient(company({ id: 'client-1', razao_social: 'ACME' })));
    await waitFor(() => expect(result.current.brandKit.id).toBe('kit-1'));
    act(() => result.current.handleUpdateBrandKit({ notes: 'local changes' }));
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['magic-up-brand-kit', 'user-1', 'client-1'] });
    });
    expect(result.current.brandKit.notes).toBe('local changes');
    mocks.brandKitRow = {
      ...serverKitRow(),
      updated_at: '2026-11-10T03:00:00Z',
      notes: 'new server version',
    };
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['magic-up-brand-kit', 'user-1', 'client-1'] });
    });
    await waitFor(() => expect(result.current.brandKit.notes).toBe('new server version'));
  });
  it('hydrates the same client for a changed authenticated user scope', async () => {
    mocks.brandKitRow = serverKitRow();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const stable = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result, rerender } = renderHook(() => useMagicUpState(), { wrapper: stable });
    act(() => result.current.handleSelectClient(company({ id: 'client-1', razao_social: 'ACME' })));
    await waitFor(() => expect(result.current.brandKit.id).toBe('kit-1'));
    act(() => result.current.handleUpdateBrandKit({ notes: 'user1 edits' }));
    mocks.userId = 'user-2';
    mocks.brandKitRow = { ...serverKitRow(), notes: 'user2 kit' };
    rerender();
    await waitFor(() => expect(result.current.brandKit.notes).toBe('user2 kit'));
  });
});

describe('MagicUp active Gold colors/images', () => {
  it('queries real product IDs/order/limits and preserves image/color behavior', async () => {
    mocks.db.mockImplementation(async (o) => ({
      records:
        o.table === 'product_variants'
          ? [
              { color_name: 'Azul', color_hex: '#0000ff', color_code: 'AZ', stock_quantity: 7 },
              { color_name: 'Azul', color_hex: '#0000ff', stock_quantity: 1 },
            ]
          : [
              { url_cdn: 'box.png', image_type: 'box' },
              { url_cdn: 'front.png', is_primary: true, is_og_image: true, supplier_code: 'S1' },
              { url_original: 'back.png', is_primary: false },
            ],
      count: 2,
    }));
    const { result } = renderHook(() => useMagicUpState(), { wrapper });
    act(() =>
      result.current.handleSelectProduct({
        id: 'actual-id',
        name: 'Real',
        sku: 'REAL',
        images: [],
      }),
    );
    await waitFor(() => expect(result.current.productImages).toHaveLength(2));
    expect(result.current.productImages).toEqual([
      { url: 'front.png', supplierCode: 'S1', isPrimary: true, isOgImage: true },
      { url: 'back.png', supplierCode: null, isPrimary: false, isOgImage: false },
    ]);
    expect(result.current.colors).toEqual([{ name: 'Azul', hex: '#0000ff', code: 'AZ', stock: 7 }]);
    expect(mocks.db.mock.calls.map(([o]) => o)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'product_variants',
          filters: { product_id: 'actual-id' },
          limit: 100,
          orderBy: { column: 'color_name', ascending: true },
        }),
        expect.objectContaining({
          table: 'product_images',
          filters: { product_id: 'actual-id' },
          limit: 100,
          orderBy: { column: 'display_order', ascending: true },
        }),
      ]),
    );
  });
  it('a late color/gallery response from the previous product cannot replace current assets', async () => {
    const pending: Record<string, (value: unknown) => void> = {};
    mocks.db.mockImplementation((o) =>
      o.filters.product_id === 'old'
        ? new Promise((resolve) => {
            pending[o.table] = resolve;
          })
        : Promise.resolve({
            records:
              o.table === 'product_images'
                ? [{ url_cdn: 'new.png', is_primary: true }]
                : [{ color_name: 'Verde', stock_quantity: 2 }],
            count: 1,
          }),
    );
    const { result } = renderHook(() => useMagicUpState(), { wrapper });
    act(() =>
      result.current.handleSelectProduct({ id: 'old', name: 'Old', sku: 'OLD', images: [] }),
    );
    await waitFor(() => expect(Object.keys(pending)).toHaveLength(2));
    act(() =>
      result.current.handleSelectProduct({ id: 'new', name: 'New', sku: 'NEW', images: [] }),
    );
    await waitFor(() => expect(result.current.productImages[0]?.url).toBe('new.png'));
    await act(async () => {
      pending.product_images({ records: [{ url_cdn: 'old.png' }], count: 1 });
      pending.product_variants({ records: [{ color_name: 'Antigo' }], count: 1 });
    });
    expect(result.current.productImages[0].url).toBe('new.png');
    expect(result.current.colors[0].name).toBe('Verde');
  });
});
