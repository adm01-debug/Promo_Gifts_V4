/**
 * Matriz de aceite do Mockup — GRUPO 6 (A14–A17): responsividade e falhas.
 * Um teste por cenário, nomeado com o ID; fixtures fixas em ./grupo6.fixtures.ts.
 * Nenhum teste desativado. Só comportamento que JÁ passa no código atual; o que
 * depende de correção não integrada está listado no relato como PENDENTE.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, renderHook, screen, act, waitFor } from '@testing-library/react';
import { toast } from 'sonner';

// Mocks de BORDA (rede, DB, draft, contextos, wizard): nunca o comportamento sob teste.
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn(), loading: vi.fn(), dismiss: vi.fn(),
  }),
  Toaster: () => null,
}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

const mocks = vi.hoisted(() => ({
  invokeEdge: vi.fn(),
  newIdempotencyKey: vi.fn(() => 'fixture-idem-key'),
  uploadLogoToStorage: vi.fn(async () => 'https://fixture.invalid/storage/logo.png'),
  downloadImageAsPdfFromUrl: vi.fn(async () => {}),
  saveDraft: vi.fn(async () => {}),
  loadDraft: vi.fn(async () => null),
  clearDraft: vi.fn(async () => {}),
  getProductById: vi.fn(),
  dbInvoke: vi.fn(),
  untypedFrom: vi.fn(),
}));

vi.mock('@/lib/edge/safeInvokeCall', () => ({ invokeEdge: mocks.invokeEdge, newIdempotencyKey: mocks.newIdempotencyKey }));
vi.mock('@/lib/mockup-storage', () => ({ uploadLogoToStorage: mocks.uploadLogoToStorage, downloadImageAsPdfFromUrl: mocks.downloadImageAsPdfFromUrl }));
vi.mock('@/lib/supabase-untyped', () => ({ untypedFrom: mocks.untypedFrom }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), storage: { from: () => ({ remove: vi.fn(async () => ({ error: null })) }) }, functions: { invoke: vi.fn() } },
}));
vi.mock('@/hooks/mockup/useMockupDraft', () => ({ useMockupDraft: () => ({ saveDraft: mocks.saveDraft, loadDraft: mocks.loadDraft, clearDraft: mocks.clearDraft, isSaving: false, isLoading: false, lastSaved: null, error: null }) }));
vi.mock('@/contexts/ProductsContext', () => ({ useProductsContext: () => ({ getProductById: mocks.getProductById, products: [] }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'fixture-user-id' } }) }));
vi.mock('@/lib/db/postgrest', () => ({ dbInvoke: mocks.dbInvoke }));
vi.mock('@/hooks/mockup/useMockupTechniques', () => ({ useFilteredTechniques: () => [], useProductCustomizationOptionsForMockup: () => ({ data: null }) }));
// Estrato de simulação do gerador: NÃO é o comportamento sob teste. O A15 usa o
// hook real pelo caminho direto '@/hooks/simulation/useLogoColorAnalysis'.
vi.mock('@/hooks/simulation', () => ({
  useLogoColorAnalysis: () => ({ colors: [], isAnalyzing: false, error: null, analyzeImage: vi.fn(), clearAnalysis: vi.fn(), updatePantone: vi.fn() }),
  usePositionHistory: () => ({ setOnApply: vi.fn(), pushState: vi.fn(), clear: vi.fn(), canRedo: false }),
}));
vi.mock('@/components/mockup/mockupWizardStep', () => ({ getMockupWizardStep: () => 'product' }));
vi.mock('@/components/mockup/MockupSuccessToast', () => ({ showMockupSuccessToast: vi.fn() }));
vi.mock('@/components/mockup/techniqueColorUtils', () => ({ classifyTechnique: () => 'other', techniqueNeedsColorConfig: () => false }));
vi.mock('@/lib/personalization/adapters', () => ({ adaptTabelaPrecoRows: (rows: unknown[]) => rows }));
vi.mock('@/utils/image-utils', () => ({ getCdnUrl: (url: string) => url }));
vi.mock('@/lib/image-converter', () => ({ needsConversion: vi.fn(() => false), ensureSupportedFormat: vi.fn(async (f: File) => f) }));

import { MockupWizard } from '@/components/mockup/MockupWizard';
import { LogoColorAnalyzer } from '@/components/mockup/LogoColorAnalyzer';
import { useLogoColorAnalysis } from '@/hooks/simulation/useLogoColorAnalysis';
import { useMockupGenerator } from '@/hooks/mockup/useMockupGenerator';
import { renderHookWithProviders } from '../../../hooks/_helpers/render-hook-providers';
import {
  CLIENTE_FIXTURE, PRODUTO_FIXTURE, TECNICA_FIXTURE, AREA_FRENTE, AREA_COSTAS,
  MOCKUP_FRENTE_URL, REGISTRO_SALVO_ID, REGISTRO_REPETIDO_ID, IMAGEM_BASE64_A,
  IMAGEM_BASE64_B, COR_VERDE, ERRO_ANALISE, ERRO_SALVAR, FK_VIOLATION,
} from './grupo6.fixtures';

interface DbResult { data: unknown; error: unknown; }

/** Fila de respostas de INSERT por tabela (consumida em ordem). */
const insertQueues: Record<string, DbResult[]> = {};

/** Mock chainable de from()/untypedFrom() do Supabase. */
function makeBuilder(table: string) {
  let isInsert = false;
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'order', 'limit']) {
    builder[method] = vi.fn(() => { if (method === 'insert') isInsert = true; return builder; });
  }
  const resolveResult = (): DbResult => {
    if (isInsert) {
      const queue = insertQueues[table];
      if (queue && queue.length > 0) return queue.length > 1 ? (queue.shift() as DbResult) : queue[0];
    }
    return { data: [], error: null }; // leituras (histórico no mount) devolvem vazio
  };
  builder.single = vi.fn(() => Promise.resolve(resolveResult()));
  builder.maybeSingle = vi.fn(() => Promise.resolve(resolveResult()));
  (builder as { then?: unknown }).then = (resolve: (v: unknown) => unknown, reject: (r: unknown) => unknown) => Promise.resolve(resolveResult()).then(resolve, reject);
  return builder;
}

function seedGenerator() {
  mocks.loadDraft.mockResolvedValue(null);
  mocks.dbInvoke.mockResolvedValue({ records: [{ id: TECNICA_FIXTURE.id, nome: TECNICA_FIXTURE.name, codigo_curto: TECNICA_FIXTURE.code }], count: 1 });
  mocks.getProductById.mockImplementation((id: string) => (id === PRODUTO_FIXTURE.id ? PRODUTO_FIXTURE : null));
  mocks.untypedFrom.mockImplementation((table: string) => makeBuilder(table));
}

/** Seleciona cliente/produto/técnica e define as áreas ativas no gerador. */
function selecionarNoGerador(result: { current: ReturnType<typeof useMockupGenerator> }, areas: typeof AREA_FRENTE[]) {
  act(() => {
    result.current.setProductSelection({ product: PRODUTO_FIXTURE, variant: null, imageUrl: PRODUTO_FIXTURE.images[0] } as never);
    result.current.setSelectedClient(CLIENTE_FIXTURE);
    result.current.setSelectedTechnique({ ...TECNICA_FIXTURE } as never);
    result.current.setPersonalizationAreas(areas.map((a) => ({ ...a })));
    result.current.setActiveAreaId(areas[0].id);
  });
}

/** Monta o gerador real e espera o carregamento inicial terminar. */
async function montarGerador() {
  const { result } = renderHookWithProviders(() => useMockupGenerator());
  await waitFor(() => expect(result.current.isLoadingData).toBe(false));
  return result;
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(insertQueues)) delete insertQueues[key];
  seedGenerator();
});

// ─── A14 — 375/768/1024/1440 sem sobreposição ────────────────────────

const MD_PX = 768;

/**
 * jsdom não aplica CSS de mídia: reproduzimos SÓ a regra de visibilidade dos
 * tokens Tailwind do projeto (`hidden`, `md:block`, `md:hidden`) para provar que
 * as duas variantes responsivas do stepper nunca ficam visíveis juntas.
 */
function visivelNaLargura(el: Element, width: number): boolean {
  const tokens = (el.getAttribute('class') ?? '').split(/\s+/);
  if (width >= MD_PX) {
    if (tokens.includes('md:hidden')) return false;
    if (tokens.includes('md:block')) return true;
    return !tokens.includes('hidden');
  }
  return !tokens.includes('hidden');
}

describe('A14 — responsividade 375/768/1024/1440 sem sobreposição', () => {
  it('o stepper troca de variante por breakpoint e nunca deixa duas visíveis juntas', () => {
    const { container } = render(
      <MockupWizard currentStep={1} hasClient={false} hasProduct={false} hasTechnique={false} hasLogo={false} hasPositioned={false} hasGenerated={false} />,
    );
    const variantes = Array.from(container.firstElementChild!.children) as HTMLElement[];
    expect(variantes).toHaveLength(2); // nav desktop (md:hidden) + barra mobile
    const desktop = variantes.find((el) => el.tagName === 'NAV');
    const mobile = variantes.find((el) => el !== desktop);
    expect(desktop).toBeDefined();
    expect(mobile).toBeDefined();
    // Desktop: 6 passos; mobile: 1 (compacto) — os 6 rótulos não colidem a 375px.
    expect(desktop!.querySelectorAll('svg')).toHaveLength(6);
    expect(mobile!.querySelectorAll('svg')).toHaveLength(1);
    for (const width of [375, 768, 1024, 1440]) {
      const visiveis = variantes.filter((el) => visivelNaLargura(el, width));
      expect(visiveis, `largura ${width}`).toHaveLength(1);
      expect(visiveis[0], `largura ${width}`).toBe(width >= MD_PX ? desktop : mobile);
    }
  });
});

// ─── A15 — erro de análise e resposta antiga ─────────────────────────

describe('A15 — erro de análise e resposta antiga', () => {
  let getContextOriginal: typeof HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    getContextOriginal = HTMLCanvasElement.prototype.getContext;
    // jsdom não carrega imagens/pinta canvas: stubamos SÓ o ambiente, não o comportamento.
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      width = 120;
      height = 60;
      set src(_v: string) { queueMicrotask(() => this.onload?.()); }
    }
    vi.stubGlobal('Image', FakeImage);
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    HTMLCanvasElement.prototype.getContext = getContextOriginal;
  });

  it('erro da análise vira estado de erro e uma nova análise descarta a resposta antiga', async () => {
    mocks.invokeEdge.mockResolvedValueOnce({ data: { colors: [COR_VERDE] }, error: null, requestId: 'r-verde' });
    const { result } = renderHook(() => useLogoColorAnalysis());
    await act(async () => { await result.current.analyzeImage(IMAGEM_BASE64_A); });
    expect(result.current.colors[0].name).toBe(COR_VERDE.name);

    // Nova análise falha: a resposta ANTIGA (verde) não pode permanecer exibida.
    mocks.invokeEdge.mockResolvedValueOnce({ data: null, error: { message: ERRO_ANALISE, name: 'server', status: 500, request_id: 'r-erro' }, requestId: 'r-erro' });
    await act(async () => { await result.current.analyzeImage(IMAGEM_BASE64_B); });

    expect(result.current.colors).toEqual([]);
    expect(result.current.error).toBe(ERRO_ANALISE);
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith(ERRO_ANALISE);

    // Resultado visível: o alerta com a mensagem da análise.
    render(<LogoColorAnalyzer colors={result.current.colors} isAnalyzing={false} error={result.current.error} onPantoneChange={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent(ERRO_ANALISE);
  });
});

// ─── A16 — falha de salvar e repetir ─────────────────────────────────

describe('A16 — falha de salvar e repetir', () => {
  it('gravação que falha (FK 23503) é repetida com product_id nulo e o mockup fica persistido', async () => {
    mocks.invokeEdge.mockResolvedValue({ data: { mockupUrl: MOCKUP_FRENTE_URL }, error: null, requestId: 'r-gen' });
    insertQueues.generated_mockups = [{ data: null, error: FK_VIOLATION }, { data: { id: REGISTRO_SALVO_ID }, error: null }];

    const result = await montarGerador();
    selecionarNoGerador(result, [AREA_FRENTE]);
    await act(async () => { await result.current.generateMockup(); });

    expect(result.current.generatedMockup).toBe(MOCKUP_FRENTE_URL);
    expect(result.current.lastSavedRecordId).toBe(REGISTRO_SALVO_ID);
    expect(vi.mocked(toast.error)).not.toHaveBeenCalledWith(ERRO_SALVAR);
  });

  it('falha dura avisa o erro, mantém o mockup visível e repetir o salvar persiste de novo', async () => {
    mocks.invokeEdge.mockResolvedValue({ data: { mockupUrl: MOCKUP_FRENTE_URL }, error: null, requestId: 'r-gen' });
    insertQueues.generated_mockups = [{ data: null, error: { code: 'P0001', message: 'boom' } }];

    const result = await montarGerador();
    selecionarNoGerador(result, [AREA_FRENTE]);
    await act(async () => { await result.current.generateMockup(); });

    expect(result.current.generatedMockup).toBe(MOCKUP_FRENTE_URL);
    expect(result.current.lastSavedRecordId).toBeNull();
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith(ERRO_SALVAR);

    // "Repetir": com o banco saudável, salvar de novo devolve o id persistido.
    insertQueues.generated_mockups = [{ data: { id: REGISTRO_REPETIDO_ID }, error: null }];
    let id: string | null = null;
    await act(async () => { id = await result.current.saveMockupToHistory(MOCKUP_FRENTE_URL, AREA_FRENTE); });
    expect(id).toBe(REGISTRO_REPETIDO_ID);
  });
});

// ─── A17 — falha parcial de lote ─────────────────────────────────────

describe('A17 — falha parcial de lote', () => {
  it('com uma área falhando, mostra só a que deu certo e avisa a falha parcial (sem erro fatal)', async () => {
    mocks.invokeEdge.mockImplementation((_fn: string, options: { body?: { areaName?: string } }) =>
      options.body?.areaName === AREA_FRENTE.name
        ? Promise.resolve({ data: { mockupUrl: MOCKUP_FRENTE_URL }, error: null, requestId: 'r-front' })
        : Promise.resolve({ data: null, error: { message: 'FIXTURE: composição falhou na área', name: 'server', status: 500, request_id: 'r-back' }, requestId: 'r-back' }),
    );
    insertQueues.generated_mockups = [{ data: { id: 'fixture-batch-id' }, error: null }];

    const result = await montarGerador();
    selecionarNoGerador(result, [AREA_FRENTE, AREA_COSTAS]);
    await act(async () => { await result.current.generateMockup(); });

    expect(result.current.generationError).toBeNull();
    expect(result.current.generatedBatchMockups).toHaveLength(1);
    expect(result.current.generatedBatchMockups[0].areaName).toBe(AREA_FRENTE.name);
    expect(result.current.generatedMockup).toBe(MOCKUP_FRENTE_URL);
    expect(vi.mocked(toast.warning)).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(toast.warning).mock.calls[0][0])).toContain('1 área');
  });

  it('com todas as áreas falhando, nenhum mockup é exibido e o erro fica visível', async () => {
    mocks.invokeEdge.mockResolvedValue({ data: null, error: { message: 'FIXTURE: composição falhou', name: 'server', status: 500, request_id: 'r' }, requestId: 'r' });

    const result = await montarGerador();
    selecionarNoGerador(result, [AREA_FRENTE, AREA_COSTAS]);
    await act(async () => { await result.current.generateMockup(); });

    expect(result.current.generatedMockup).toBeNull();
    expect(result.current.generatedBatchMockups).toEqual([]);
    expect(result.current.generationError).toContain('Nenhum mockup gerado');
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith(expect.stringContaining('Nenhum mockup gerado'));
  });
});
