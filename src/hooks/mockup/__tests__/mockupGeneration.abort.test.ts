/**
 * Q16 (achados B F-04/F-05) — timeout único de 30 s e geração cancelável.
 * Antes: três orçamentos empilhados (race de 60 s que não cancelava, retry local
 * de 2 s, defaults do wrapper) e resultado tardio ainda gravado no histórico.
 * Aqui o serviço REAL roda com a edge (`invokeEdge`) mockada.
 */
import { createElement, type ReactNode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMockupGenerator } from '../useMockupGenerator';

const mocks = vi.hoisted(() => ({
  invokeEdge: vi.fn(),
  dbInvoke: vi.fn(),
  getProductById: vi.fn(),
  loadDraft: vi.fn(),
  clearDraft: vi.fn(),
  insertMockup: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/contexts/ProductsContext', () => ({
  useProductsContext: () => ({ getProductById: mocks.getProductById }),
}));
vi.mock('@/hooks/mockup/useMockupDraft', () => ({
  useMockupDraft: () => ({
    saveDraft: vi.fn(),
    loadDraft: mocks.loadDraft,
    clearDraft: mocks.clearDraft,
    isSaving: false,
    isLoading: false,
    lastSaved: null,
    error: null,
  }),
}));
vi.mock('@/hooks/mockup/useMockupTechniques', () => ({
  useFilteredTechniques: () => [{ id: 'pat-1', name: 'Serigrafia', code: 'silk' }],
  useProductCustomizationOptionsForMockup: () => ({ data: null, isFetching: false }),
}));
vi.mock('@/hooks/simulation', () => ({
  useLogoColorAnalysis: () => ({ analyzeImage: vi.fn(), clearAnalysis: vi.fn() }),
  usePositionHistory: () => ({
    setOnApply: vi.fn(),
    pushState: vi.fn(),
    clear: vi.fn(),
    canRedo: false,
  }),
}));
vi.mock('@/lib/db/postgrest', () => ({ dbInvoke: mocks.dbInvoke }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

// Superfície da edge consumida pelo service REAL.
vi.mock('@/lib/edge/safeInvokeCall', () => ({
  invokeEdge: mocks.invokeEdge,
  newIdempotencyKey: () => 'idem-key',
}));

// Captura o INSERT em generated_mockups (persistência mockada).
vi.mock('@/lib/supabase-untyped', () => {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = vi.fn(chain);
  builder.order = vi.fn(chain);
  builder.limit = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.insert = vi.fn((payload: Record<string, unknown>) => {
    mocks.insertMockup(payload);
    return builder;
  });
  builder.single = vi.fn(() => Promise.resolve({ data: { id: 'rec-1' }, error: null }));
  builder.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve({ data: [], error: null }).then(resolve, reject);
  return { untypedFrom: () => builder };
});

const PRODUCT_1 = { id: 'prod-1', name: 'Caneca', images: ['p1.png'], dimensions: { width_cm: 8, height_cm: 10 } };
const PRODUCT_2 = { id: 'prod-2', name: 'Copo', images: ['p2.png'], dimensions: { width_cm: 7, height_cm: 12 } };

function selectionFor(id: string) {
  const product = id === 'prod-1' ? PRODUCT_1 : PRODUCT_2;
  return { product, variant: null, imageUrl: product.images[0] };
}

function areaWithLogo() {
  return {
    id: 'area-1',
    name: 'Frente',
    positionX: 50,
    positionY: 50,
    logoWidth: 5,
    logoHeight: 3,
    logoPreview: 'data:image/png;base64,AAAA',
  };
}

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return ({ children }: { children: ReactNode }) =>
    createElement(MemoryRouter, null, createElement(QueryClientProvider, { client }, children));
}

/** Resolve a edge mais tarde, como uma geração lenta real. */
let resolveEdge: ((value: unknown) => void) | undefined;

/** Monta o hook e deixa o formulário pronto para gerar. */
async function setupReadyToGenerate() {
  const rendered = renderHook(() => useMockupGenerator(), { wrapper: makeWrapper() });
  await waitFor(() => expect(rendered.result.current.isLoadingData).toBe(false));

  act(() => {
    rendered.result.current.setSelectedClient({ id: 'cli-1', name: 'Cliente X' });
    rendered.result.current.setProductSelection(selectionFor('prod-1'));
    rendered.result.current.setSelectedTechnique({ id: 'pat-1', name: 'Serigrafia', code: 'silk' });
    rendered.result.current.setPersonalizationAreas([areaWithLogo()]);
  });

  return rendered;
}

function edgeOptions() {
  return mocks.invokeEdge.mock.calls[0][1] as {
    signal?: AbortSignal;
    timeoutMs?: number;
    maxRetries?: number;
  };
}

function edgeSuccess(url = 'https://cdn.example.com/out.png') {
  return { data: { mockupUrl: url }, error: null, requestId: 'req-1' };
}

beforeEach(() => {
  vi.clearAllMocks();
  resolveEdge = undefined;
  mocks.dbInvoke.mockResolvedValue({ records: [] });
  mocks.loadDraft.mockResolvedValue(null);
  mocks.clearDraft.mockResolvedValue(undefined);
  mocks.getProductById.mockImplementation(
    (id: string) => ({ 'prod-1': PRODUCT_1, 'prod-2': PRODUCT_2 })[id],
  );
  mocks.invokeEdge.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveEdge = resolve;
      }),
  );
});

describe('Q16 — timeout único e cancelamento da geração de mockup', () => {
  it('(1) passa signal à edge e limita a chamada a 30 s em uma única tentativa', async () => {
    const { result } = await setupReadyToGenerate();

    let generation: Promise<void> = Promise.resolve();
    act(() => {
      generation = result.current.generateMockup();
    });
    await waitFor(() => expect(mocks.invokeEdge).toHaveBeenCalledTimes(1));

    const opts = edgeOptions();
    expect(opts.timeoutMs).toBe(30000);
    // Em safeAuthCall a opção conta tentativas totais — 1 = sem retry empilhado.
    expect(opts.maxRetries).toBe(1);
    expect(opts.signal?.aborted).toBe(false);

    await act(async () => {
      resolveEdge?.(edgeSuccess());
      await generation;
    });

    // Caminho não cancelado segue gravando no histórico (contraste com (2)/(4)).
    expect(mocks.insertMockup).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(false);
  });

  it('(2) resetForm durante a geração aborta a chamada e nada é inserido', async () => {
    const { result } = await setupReadyToGenerate();

    let generation: Promise<void> = Promise.resolve();
    act(() => {
      generation = result.current.generateMockup();
    });
    await waitFor(() => expect(mocks.invokeEdge).toHaveBeenCalledTimes(1));

    const signal = edgeOptions().signal;
    expect(signal?.aborted).toBe(false);

    await act(async () => {
      await result.current.resetForm();
    });
    expect(signal?.aborted).toBe(true);

    // Mesmo que a edge responda depois do cancelamento, o resultado é descartado.
    await act(async () => {
      resolveEdge?.(edgeSuccess());
      await generation;
    });

    expect(mocks.insertMockup).not.toHaveBeenCalled();
    expect(result.current.generatedMockup).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('(3) erro de rede tenta uma única vez e vira erro visível (sem retry empilhado)', async () => {
    const { result } = await setupReadyToGenerate();

    mocks.invokeEdge.mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch', name: 'network', status: 0, request_id: 'req-1' },
    });

    await act(async () => {
      await result.current.generateMockup();
    });

    expect(mocks.invokeEdge).toHaveBeenCalledTimes(1);
    expect(result.current.generationError).toMatch(/Failed to fetch/);
    expect(mocks.insertMockup).not.toHaveBeenCalled();
  });

  it('(4) trocar de produto cancela a geração anterior e nada é inserido', async () => {
    const { result } = await setupReadyToGenerate();

    let generation: Promise<void> = Promise.resolve();
    act(() => {
      generation = result.current.generateMockup();
    });
    await waitFor(() => expect(mocks.invokeEdge).toHaveBeenCalledTimes(1));

    const signal = edgeOptions().signal;
    expect(signal?.aborted).toBe(false);

    act(() => {
      result.current.setProductSelection(selectionFor('prod-2'));
    });
    expect(signal?.aborted).toBe(true);

    await act(async () => {
      resolveEdge?.(edgeSuccess());
      await generation;
    });

    expect(mocks.insertMockup).not.toHaveBeenCalled();
  });
});
