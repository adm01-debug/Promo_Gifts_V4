/**
 * Varredura de acessibilidade da PÁGINA do gerador de mockups (axe-core / WCAG 2.1 AA).
 *
 * Cobre os TRÊS estados da página — vazio, configurando e resultado — em 375px e 1280px, com o axe
 * rodando sobre a composição inteira (`baseElement` = `document.body`, incluindo os diálogos reais
 * em portal), e não sobre componentes isolados. Contrato protegido: nenhuma violação axe nos três
 * estados nas duas larguras; diálogo sem nome acessível (título do ConfirmDialog) reprova; botão de
 * ícone sem rótulo (`button-name`) reprova.
 *
 * REAIS: MockupGenerator, MockupWizard, MockupEmptyState, MockupToolbar, MockupResultCard e os
 * diálogos (TechniqueChangeDialog/DeleteMockupDialog sobre o ConfirmDialog). DUBLÊS: só os painéis
 * que buscam dados no mount (catálogo, CRM, canvas de logo, IA) — a a11y deles é coberta pelos
 * testes de componente das respectivas pastas. O hook `useMockupGenerator` é mockado: aqui se mede
 * a renderização da página, não o data-layer.
 *
 * jsdom não carrega o CSS do Tailwind: o harness aplica `display:none` inline onde o Tailwind
 * esconderia por breakpoint (senão o markup `md:hidden` viraria falso positivo em 1280px) e faz o
 * `matchMedia` responder `min-width`/`max-width` do viewport corrente. Nenhuma regra do runner é
 * desativada; contraste real por breakpoint segue coberto pelo e2e (Playwright).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { axe } from '../a11y/axe-helper';
import MockupGenerator from '@/pages/mockups/MockupGenerator';

const { mockMg, mockTechnique, makeGeneratorState, makeTechniqueState } = vi.hoisted(() => {
  // Setters/handlers do hook — mesmas chaves do retorno real, todos vi.fn().
  const HANDLER_KEYS =
    'fetchHistory setActiveTab setGeneratedMockup setGenerationError updateActiveArea ' +
    'setProductSelection setSelectedTechnique setSelectedClient resetForm setPersonalizationAreas ' +
    'setActiveAreaId handleAreaLogoUpload getProductImage setTechniqueColorConfig setArtAttachments ' +
    'setMockupAnnotations setLastSavedRecordId setLastSavedMockupUrl setLastSavedLayoutMode ' +
    'downloadMockup generateMockup saveMockupToHistory setDeleteDialogOpen setMockupToDelete ' +
    'deleteMockup loadFromHistory';

  // Estado espelha o retorno de useMockupGenerator (ver tests/hooks/useMockupGenerator.test.ts).
  const makeGeneratorState = (): Record<string, unknown> => {
    const state: Record<string, unknown> = {
      user: { id: 'user-123' },
      mockupHistory: [],
      historyClients: [],
      activeTab: 'generator',
      isLoading: false,
      isLoadingHistory: false,
      isLoadingData: false,
      selectedProduct: null,
      selectedTechnique: null,
      selectedClient: null,
      productSelection: null,
      techniques: [],
      filteredTechniques: [],
      personalizationAreas: [],
      productLocations: [],
      artAttachments: [],
      hasLogo: false,
      hasUserInteractedPosition: false,
      wizardStep: 1,
      generatedMockup: null,
      generatedBatchMockups: [],
      generationError: null,
      showDraftRestoredNotice: false,
      positionHistory: { canUndo: false, canRedo: false, undo: vi.fn(), redo: vi.fn() },
      isDraftSaving: false,
      lastSaved: null,
      draftError: null,
      activeAreaId: null,
      activeArea: null,
      techniqueColorConfig: null,
      logoColorAnalysis: { colors: [], clearAnalysis: vi.fn() },
      beforeImage: null,
      mockupAnnotations: [],
      lastSavedRecordId: null,
      lastSavedMockupUrl: null,
      lastSavedLayoutMode: 'static',
      deleteDialogOpen: false,
      mockupToDelete: null,
    };
    for (const key of HANDLER_KEYS.split(' ')) state[key] = vi.fn();
    return state;
  };

  const makeTechniqueState = () => ({
    handleTechniqueChange: vi.fn(),
    techniqueChangeDialogOpen: false,
    setTechniqueChangeDialogOpen: vi.fn(),
    confirmTechniqueChange: vi.fn(),
    pendingTechnique: null,
    setColorConfigDialogOpen: vi.fn(),
    colorConfigDialogOpen: false,
  });

  return {
    mockMg: makeGeneratorState(),
    mockTechnique: makeTechniqueState(),
    makeGeneratorState,
    makeTechniqueState,
  };
});

vi.mock('@/hooks/mockup', () => ({ useMockupGenerator: () => mockMg }));
vi.mock('@/pages/mockups/mockup-generator/MockupTechniqueHandlers', () => ({
  useTechniqueHandlers: () => mockTechnique,
}));
vi.mock('@/components/mockup/KeyboardShortcuts', () => ({ useKeyboardShortcuts: vi.fn() }));
vi.mock('@/components/seo/PageSEO', () => ({ PageSEO: () => null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/telemetry/structuredLogger', () => ({
  createClientLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));
// canvas-confetti exige canvas 2D, que o jsdom não implementa (e ele loga via console.error).
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-123' }, profile: { full_name: 'Vendedora Teste' } }),
}));

/** Query builder do client Supabase: encadeável e sempre sem dado. */
function supabaseQuery() {
  const node: Record<string, unknown> = {};
  for (const method of 'select order limit eq insert delete'.split(' ')) {
    node[method] = vi.fn().mockReturnValue(node);
  }
  node.single = vi.fn().mockResolvedValue({ data: null, error: null });
  node.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  return node;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn().mockImplementation(supabaseQuery),
  },
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'test-anon-key',
}));

/**
 * Dublê mínimo e acessível dos painéis que buscam dados no mount (ver cabeçalho).
 * Declarado como `function` para ser referenciado pelas factories hoisted do vi.mock.
 */
function panelStub(testId: string, ariaLabel: string, buttonLabel: string): () => ReactElement {
  return () => (
    <section aria-label={ariaLabel} data-testid={testId}>
      <button type="button">{buttonLabel}</button>
    </section>
  );
}

vi.mock('@/components/mockup/MockupConfigPanel', () => ({
  MockupConfigPanel: panelStub('config-panel-stub', 'Configuração do mockup', 'Selecionar produto'),
}));
vi.mock('@/components/mockup/LogoPositionEditor', () => ({
  LogoPositionEditor: panelStub('logo-editor-stub', 'Editor de posição da logo', 'Mover logo'),
}));
vi.mock('@/components/ai', () => ({
  AIMockupAssistant: panelStub('ai-assistant-stub', 'Assistente de IA', 'Pedir sugestão'),
}));
vi.mock('@/components/mockup/approval/MockupLayoutButtons', () => ({
  MockupLayoutButtons: panelStub('layout-buttons-stub', 'Layouts do mockup', 'Gerar pelo layout'),
}));
vi.mock('@/components/mockup/approval/OffscreenLayoutCapture', () => ({
  OffscreenLayoutCapture: () => <div data-testid="layout-capture-stub" />,
}));
vi.mock('@/components/mockup/TechniqueColorConfigDialog', () => ({
  TechniqueColorConfigDialog: () => null,
}));

const VIEWPORTS = [{ width: 375 }, { width: 1280 }];

/** Breakpoints do Tailwind usados pelos `hidden`/`md:*` desta árvore. */
const BREAKPOINTS: Record<string, number> = { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 };
const BREAKPOINT_VISIBILITY = /^(sm|md|lg|xl|2xl):(hidden|block|flex|grid|inline|table)$/;

/**
 * Compensa o jsdom não carregar Tailwind: aplica `display:none` inline (o axe respeita) nos
 * elementos que o Tailwind esconderia neste viewport, lendo só tokens exatos de classe
 * (`hidden` / `md:hidden` / `md:block`). Sem isso o stepper mobile (`md:hidden`) apareceria
 * visível em 1280px e viraria falso positivo.
 */
function applyResponsiveVisibility(root: HTMLElement, width: number): void {
  root.querySelectorAll<HTMLElement>('*').forEach((element) => {
    let hidden = false;
    for (const token of (element.getAttribute('class') ?? '').split(/\s+/)) {
      if (token === 'hidden') hidden = true;
      const match = BREAKPOINT_VISIBILITY.exec(token);
      if (!match || width < BREAKPOINTS[match[1]]) continue;
      hidden = match[2] === 'hidden';
    }
    if (hidden) element.style.display = 'none';
  });
}

/** Emula o viewport corrente para o axe e para o `matchMedia` do harness. */
function setViewport(width: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 800 });
  const media = (query: string): MediaQueryList => {
    const min = /\(\s*min-width:\s*(\d+)px\s*\)/.exec(query);
    const max = /\(\s*max-width:\s*(\d+)px\s*\)/.exec(query);
    let matches = true;
    if (min) matches = matches && width >= Number(min[1]);
    if (max) matches = matches && width <= Number(max[1]);
    return {
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    } as MediaQueryList;
  };
  window.matchMedia = media as unknown as typeof window.matchMedia;
  window.dispatchEvent(new Event('resize'));
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MemoryRouter>
          <MockupGenerator />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

/** Roda o axe sobre a página inteira (`document.body`, inclui os portais dos diálogos). */
async function auditPage(baseElement: HTMLElement, width: number): Promise<void> {
  applyResponsiveVisibility(baseElement, width);
  expect(await axe(baseElement)).toHaveNoViolations();
}

/** Estado 2 (configurando): produto + técnica + cliente + área ativa com logo posicionável. */
function applyConfiguringState(): void {
  Object.assign(mockMg, {
    selectedProduct: { id: 'product-1', name: 'Garrafa térmica', sku: 'GF-001' },
    selectedTechnique: { id: 'technique-1', name: 'Gravação a laser', code: 'LASER' },
    selectedClient: { id: 'client-1', nome_fantasia: 'Empresa Exemplo' },
    productSelection: { colorName: 'Azul', colorHex: '#0047AB' },
    activeAreaId: 'area-1',
    activeArea: { id: 'area-1', name: 'Frente', positionX: 50, positionY: 50 },
    hasLogo: true,
    hasUserInteractedPosition: true,
    wizardStep: 5,
    getProductImage: vi.fn().mockReturnValue('https://example.com/product.png'),
  });
}

/** Estado 3 (resultado): mockup gerado nas duas áreas. */
function applyResultState(): void {
  applyConfiguringState();
  Object.assign(mockMg, {
    wizardStep: 6,
    generatedMockup: 'https://example.com/generated.png',
    generatedBatchMockups: [
      { url: 'https://example.com/front.png', areaName: 'Frente' },
      { url: 'https://example.com/back.png', areaName: 'Verso' },
    ],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(mockMg, makeGeneratorState());
  Object.assign(mockTechnique, makeTechniqueState());
  setViewport(1280);
  document.documentElement.lang = 'pt-BR';
  document.title = 'Gerador de Mockups';
});

describe.each(VIEWPORTS)('MockupGenerator — acessibilidade da página ($width px)', ({ width }) => {
  beforeEach(() => setViewport(width));

  it('estado vazio (nada selecionado): axe sem violações e chrome nomeado', async () => {
    const { baseElement } = renderPage();

    // Empty state REAL + dublê do painel de configuração.
    expect(await screen.findByText('Selecione a empresa')).toBeInTheDocument();
    await screen.findByTestId('config-panel-stub');
    expect(screen.queryByTestId('logo-editor-stub')).toBeNull();

    // Guardas estruturais: título, wizard e botões de ícone da toolbar com nome acessível.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Gerador de Mockups' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /etapas do processo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desfazer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refazer' })).toBeInTheDocument();

    await auditPage(baseElement, width);
  });

  it('estado configurando (produto + técnica + logo): axe sem violações', async () => {
    applyConfiguringState();
    const { baseElement } = renderPage();

    await screen.findByTestId('logo-editor-stub');
    expect(screen.getByTestId('config-panel-stub')).toBeInTheDocument();
    expect(screen.queryByText('Selecione a empresa')).toBeNull();

    await auditPage(baseElement, width);
  });

  it('estado resultado (mockup gerado): axe sem violações', async () => {
    applyResultState();
    const { baseElement } = renderPage();

    // MockupResultCard é o componente REAL do resultado; o grid de áreas é código da página.
    expect(await screen.findByTestId('mockup-result-card')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Mockup gerado com IA' })).toBeInTheDocument();
    expect(screen.getAllByAltText('Frente').length).toBeGreaterThan(0);

    await auditPage(baseElement, width);
  });
});

describe('MockupGenerator — diálogos da página (portal)', () => {
  it('diálogo de troca de técnica mantém nome/descrição acessíveis e axe limpo', async () => {
    Object.assign(mockTechnique, {
      techniqueChangeDialogOpen: true,
      pendingTechnique: { name: 'Sublimação' },
    });
    Object.assign(mockMg, { selectedTechnique: { id: 't1', name: 'Laser', code: 'LASER' } });

    const { baseElement } = renderPage();

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveAccessibleName('Alterar técnica de personalização?');
    expect(dialog).toHaveAccessibleDescription(/Laser/);
    expect(dialog).toHaveAccessibleDescription(/Sublimação/);

    await auditPage(baseElement, 1280);
  });

  it('diálogo de exclusão de mockup mantém nome acessível e botões nomeados', async () => {
    Object.assign(mockMg, { deleteDialogOpen: true });

    const { baseElement } = renderPage();

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveAccessibleName('Excluir mockup?');
    // Se um dos botões perder o rótulo, o axe acusa button-name.
    expect(screen.getByTestId('mockup-delete-dialog-yes')).toHaveAccessibleName('Excluir');
    expect(screen.getByTestId('mockup-delete-dialog-no')).toHaveAccessibleName('Cancelar');

    await auditPage(baseElement, 1280);
  });
});
