import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import MockupGenerator from '@/pages/mockups/MockupGenerator';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HelmetProvider } from 'react-helmet-async';
import { ProductsProvider } from '@/contexts/ProductsContext';
import { AriaLiveProvider } from '@/components/a11y/AriaLive';

const { mockKeyboardShortcuts, mockTechnique } = vi.hoisted(() => ({
  mockKeyboardShortcuts: vi.fn(),
  mockTechnique: {
    handleTechniqueChange: vi.fn(),
    techniqueChangeDialogOpen: false,
    setTechniqueChangeDialogOpen: vi.fn(),
    confirmTechniqueChange: vi.fn(),
    pendingTechnique: null as { name?: string } | null,
    setColorConfigDialogOpen: vi.fn(),
    colorConfigDialogOpen: false,
  },
}));

// Mock global environment
window.scrollTo = vi.fn();

// Mock services
vi.mock('@/hooks/mockup/mockupGenerationService', () => ({
  deleteMockupFromDb: vi.fn(),
  fetchMockupHistory: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/telemetry/structuredLogger', () => ({
  createClientLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

const createMockGeneratorState = () => ({
  user: { id: 'user-123' },
  mockupHistory: [
    {
      id: 'mockup-1',
      product_name: 'Caneca 325ml',
      technique_name: 'Sublimação',
      mockup_url: 'https://example.com/mockup1.png',
      created_at: new Date().toISOString(),
      client_name: 'Cliente Teste',
    },
  ],
  isLoadingHistory: false,
  fetchHistory: vi.fn(),
  historyClients: [],
  activeTab: 'generator',
  setActiveTab: vi.fn(),
  isLoading: false,
  selectedProduct: null,
  selectedTechnique: null,
  selectedClient: null,
  hasLogo: false,
  wizardStep: 1,
  generatedMockup: null,
  setGeneratedMockup: vi.fn(),
  generatedBatchMockups: [],
  generationError: null,
  setGenerationError: vi.fn(),
  showDraftRestoredNotice: false,
  positionHistory: { canUndo: false, canRedo: false, undo: vi.fn(), redo: vi.fn() },
  updateActiveArea: vi.fn(),
  isDraftSaving: false,
  lastSaved: null,
  draftError: null,
  techniques: [],
  productSelection: null,
  isLoadingData: false,
  personalizationAreas: [],
  filteredTechniques: [],
  setProductSelection: vi.fn(),
  setSelectedClient: vi.fn(),
  resetForm: vi.fn(),
  activeAreaId: null,
  setPersonalizationAreas: vi.fn(),
  setActiveAreaId: vi.fn(),
  handleAreaLogoUpload: vi.fn(),
  logoColorAnalysis: { colors: [], clearAnalysis: vi.fn() },
  productLocations: [],
  getProductImage: vi.fn(),
  activeArea: null,
  techniqueColorConfig: null,
  setTechniqueColorConfig: vi.fn(),
  artAttachments: [],
  setArtAttachments: vi.fn(),
  beforeImage: null,
  mockupAnnotations: [],
  setMockupAnnotations: vi.fn(),
  lastSavedRecordId: null,
  setLastSavedRecordId: vi.fn(),
  lastSavedMockupUrl: null,
  setLastSavedMockupUrl: vi.fn(),
  lastSavedLayoutMode: 'static',
  setLastSavedLayoutMode: vi.fn(),
  downloadMockup: vi.fn(),
  generateMockup: vi.fn(),
  saveMockupToHistory: vi.fn(),
  // Unified delete flow now lives in the hook (G7) + rich load-from-history (G8).
  deleteDialogOpen: false,
  mockupToDelete: null as string | null,
  setDeleteDialogOpen: vi.fn(),
  setMockupToDelete: vi.fn(),
  deleteMockup: vi.fn(),
  loadFromHistory: vi.fn(),
});

const mockMg = createMockGeneratorState();

vi.mock('@/hooks/mockup', () => ({
  useMockupGenerator: () => mockMg,
}));

vi.mock('@/pages/mockups/mockup-generator/MockupTechniqueHandlers', () => ({
  useTechniqueHandlers: () => mockTechnique,
}));

vi.mock('@/components/mockup/KeyboardShortcuts', () => ({
  useKeyboardShortcuts: mockKeyboardShortcuts,
}));

vi.mock('@/lib/telemetry/bridgeCallMetrics', () => ({
  estimatePayloadBytes: vi.fn().mockReturnValue(0),
  trackBridgeCall: vi.fn(),
  recordBridgeCall: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: { user: { id: 'user-123' } } }, error: null }),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
      mfa: {
        getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
          data: { currentLevel: 'aal1', nextLevel: 'aal1' },
          error: null,
        }),
        listFactors: vi.fn().mockResolvedValue({
          data: { all: [], totp: [] },
          error: null,
        }),
        challenge: vi.fn().mockResolvedValue({ data: null, error: null }),
        verify: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn().mockReturnThis(),
    }),
  },
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'test-anon-key',
}));

vi.mock('@/components/layout/MainLayout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="main-layout">{children}</div>
  ),
}));

vi.mock('@/components/seo/PageSEO', () => ({
  PageSEO: () => null,
}));

vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    profile: { full_name: 'Vendedora Teste', email: 'vendedora@example.com' },
  }),
}));

vi.mock('@/components/dev/DiagnosticProfiler', () => ({
  DiagnosticProfiler: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/mockup/MockupWizard', () => ({
  MockupWizard: ({ onStepClick }: { onStepClick: (step: number) => void }) => (
    <button type="button" data-testid="wizard-step" onClick={() => onStepClick(2)}>
      Ir para produto
    </button>
  ),
}));

vi.mock('@/components/mockup/MockupConfigPanel', () => ({
  MockupConfigPanel: ({
    onProductSelect,
    onTechniqueSelect,
    onClientSelect,
    onReset,
    onAreasChange,
    onActiveAreaChange,
    onLogoUpload,
    onLogoRemove,
    onArtAttachmentsChange,
  }: {
    onProductSelect: (selection: { productId: string }) => void;
    onTechniqueSelect: (technique: { id: string; name: string; code: string } | null) => void;
    onClientSelect: (client: { id: string; name: string }) => void;
    onReset: () => void;
    onAreasChange: (areas: Array<{ id: string }>) => void;
    onActiveAreaChange: (id: string) => void;
    onLogoUpload: (file: File) => void;
    onLogoRemove: () => void;
    onArtAttachmentsChange: (items: Array<{ id: string }>) => void;
  }) => (
    <div data-testid="config-panel">
      <button type="button" onClick={() => onProductSelect({ productId: 'product-2' })}>
        Selecionar produto
      </button>
      <button
        type="button"
        onClick={() => onTechniqueSelect({ id: 'technique-2', name: 'Laser', code: 'LASER' })}
      >
        Selecionar técnica
      </button>
      <button type="button" onClick={() => onTechniqueSelect(null)}>
        Limpar técnica
      </button>
      <button
        type="button"
        onClick={() => onClientSelect({ id: 'client-2', name: 'Cliente alternativo' })}
      >
        Selecionar cliente
      </button>
      <button type="button" onClick={onReset}>
        Resetar
      </button>
      <button type="button" onClick={() => onAreasChange([{ id: 'area-2' }])}>
        Alterar áreas
      </button>
      <button type="button" onClick={() => onActiveAreaChange('area-2')}>
        Alterar área ativa
      </button>
      <button
        type="button"
        onClick={() => onLogoUpload(new File(['logo'], 'logo.svg', { type: 'image/svg+xml' }))}
      >
        Enviar logo
      </button>
      <button type="button" onClick={onLogoRemove}>
        Remover logo
      </button>
      <button type="button" onClick={() => onArtAttachmentsChange([{ id: 'art-2' }])}>
        Alterar anexos
      </button>
    </div>
  ),
}));

vi.mock('@/components/mockup/LogoPositionEditor', () => ({
  LogoPositionEditor: ({
    onPositionChange,
    onSizeChange,
    onRotationChange,
    onLogoScaleChange,
    onColorConfigClick,
    headerActions,
  }: {
    onPositionChange: (x: number, y: number) => void;
    onSizeChange: (width: number, height: number) => void;
    onRotationChange: (rotation: number) => void;
    onLogoScaleChange: (scale: number) => void;
    onColorConfigClick: () => void;
    headerActions: React.ReactNode;
  }) => (
    <div data-testid="logo-editor">
      <button type="button" onClick={() => onPositionChange(12, 34)}>
        Mover logo
      </button>
      <button type="button" onClick={() => onSizeChange(7, 8)}>
        Redimensionar logo
      </button>
      <button type="button" onClick={() => onRotationChange(15)}>
        Girar logo
      </button>
      <button type="button" onClick={() => onLogoScaleChange(120)}>
        Escalar logo
      </button>
      <button type="button" onClick={onColorConfigClick}>
        Configurar cores
      </button>
      {headerActions}
    </div>
  ),
}));

vi.mock('@/components/mockup/approval/MockupLayoutButtons', () => ({
  MockupLayoutButtons: ({
    onStaticGenerated,
    onGenerateMockup,
  }: {
    onStaticGenerated: (dataUrl: string, extra: { width: number; height: number }) => Promise<void>;
    onGenerateMockup: () => void;
  }) => (
    <div data-testid="layout-buttons">
      <button
        type="button"
        onClick={() => {
          Promise.resolve(
            onStaticGenerated('data:image/png;base64,static', { width: 1200, height: 900 }),
          ).catch(() => undefined);
        }}
      >
        Salvar layout estático
      </button>
      <button type="button" onClick={onGenerateMockup}>
        Gerar pelo layout
      </button>
    </div>
  ),
}));

vi.mock('@/components/mockup/approval/OffscreenLayoutCapture', () => ({
  OffscreenLayoutCapture: ({
    request,
    onCaptured,
  }: {
    request: {
      data: { documentNumber: string; client: { name: string } };
      recordId: string;
    } | null;
    onCaptured: () => void;
  }) => (
    <div data-testid="layout-capture">
      <span>
        {request
          ? `${request.recordId}:${request.data.documentNumber}:${request.data.client.name}`
          : 'sem-captura'}
      </span>
      {request && (
        <button type="button" onClick={onCaptured}>
          Captura concluída
        </button>
      )}
    </div>
  ),
}));

vi.mock('@/components/mockup/MockupResultCard', () => ({
  MockupResultCard: ({
    onDownload,
    onReset,
    onAnnotationsChange,
  }: {
    onDownload: () => void;
    onReset: () => void;
    onAnnotationsChange: (annotations: Array<{ text: string }>) => void;
  }) => (
    <div data-testid="result-card">
      <button type="button" onClick={onDownload}>
        Baixar resultado
      </button>
      <button type="button" onClick={onReset}>
        Resetar resultado
      </button>
      <button type="button" onClick={() => onAnnotationsChange([{ text: 'Revisar margem' }])}>
        Anotar resultado
      </button>
    </div>
  ),
}));

vi.mock('@/components/mockup/MockupHistoryPanel', () => ({
  MockupHistoryPanel: ({
    mockupHistory,
    onDelete,
    onDownload,
    onLoadFromHistory,
  }: {
    mockupHistory: Array<{ id: string }>;
    onDelete: (id: string) => void;
    onDownload: (mockup: { id: string }) => void;
    onLoadFromHistory: (mockup: { id: string }) => void;
  }) => {
    const first = mockupHistory[0];
    if (!first) return <div>Nenhum histórico</div>;
    return (
      <div data-testid="history-panel">
        <button type="button" data-testid="delete-mockup-button" onClick={() => onDelete(first.id)}>
          Excluir histórico
        </button>
        <button type="button" aria-label="Baixar histórico" onClick={() => onDownload(first)}>
          Baixar histórico
        </button>
        <button type="button" aria-label="Regenerar" onClick={() => onLoadFromHistory(first)}>
          Regenerar
        </button>
      </div>
    );
  },
}));

vi.mock('@/components/mockup/TechniqueColorConfigDialog', () => ({
  TechniqueColorConfigDialog: ({
    open,
    onOpenChange,
    onConfirm,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (config: { colorCount: number }) => void;
  }) =>
    open ? (
      <div data-testid="color-dialog">
        <button type="button" onClick={() => onOpenChange(false)}>
          Fechar cores
        </button>
        <button type="button" onClick={() => onConfirm({ colorCount: 2 })}>
          Confirmar cores
        </button>
      </div>
    ) : null,
}));

vi.mock('@/components/ai', () => ({
  AIMockupAssistant: ({
    onApplySuggestion,
  }: {
    onApplySuggestion: (suggestion: {
      techniqueId?: string;
      position?: { x: number; y: number };
    }) => void;
  }) => (
    <div data-testid="ai-assistant">
      <button
        type="button"
        onClick={() =>
          onApplySuggestion({ techniqueId: 'technique-1', position: { x: 44, y: 55 } })
        }
      >
        Aplicar sugestão completa
      </button>
      <button type="button" onClick={() => onApplySuggestion({ techniqueId: 'inexistente' })}>
        Aplicar técnica inexistente
      </button>
      <button type="button" onClick={() => onApplySuggestion({})}>
        Aplicar sugestão vazia
      </button>
    </div>
  ),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <HelmetProvider>
      <TooltipProvider>
        <AriaLiveProvider>
          <QueryClientProvider client={queryClient}>
            <ProductsProvider>
              <MemoryRouter>
                <ThemeProvider>
                  <AuthProvider>{ui}</AuthProvider>
                </ThemeProvider>
              </MemoryRouter>
            </ProductsProvider>
          </QueryClientProvider>
        </AriaLiveProvider>
      </TooltipProvider>
    </HelmetProvider>,
  );
};

describe('Mockup Deletion Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(mockMg, createMockGeneratorState());
    Object.assign(mockTechnique, {
      techniqueChangeDialogOpen: false,
      pendingTechnique: null,
      colorConfigDialogOpen: false,
    });
    queryClient.clear();
  });

  it('opens the delete flow (selects the mockup + opens the dialog) when clicking delete', async () => {
    mockMg.activeTab = 'history';
    renderWithProviders(<MockupGenerator />);

    const deleteButton = await screen.findByTestId('delete-mockup-button', {}, { timeout: 8000 });
    fireEvent.click(deleteButton);

    // G7: the page no longer owns delete state — it delegates to the hook.
    expect(mockMg.setMockupToDelete).toHaveBeenCalledWith('mockup-1');
    expect(mockMg.setDeleteDialogOpen).toHaveBeenCalledWith(true);
  });

  it('delegates confirmation to the hook deleteMockup', async () => {
    mockMg.activeTab = 'history';
    mockMg.deleteDialogOpen = true;
    renderWithProviders(<MockupGenerator />);

    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /excluir/i }));

    await waitFor(() => {
      expect(mockMg.deleteMockup).toHaveBeenCalledTimes(1);
    });
  });

  it('loads a full configuration from history via loadFromHistory (G8)', async () => {
    mockMg.activeTab = 'history';
    renderWithProviders(<MockupGenerator />);

    const regenerate = (await screen.findAllByLabelText(/Regenerar/))[0];
    fireEvent.click(regenerate);

    expect(mockMg.loadFromHistory).toHaveBeenCalledTimes(1);
    expect(mockMg.loadFromHistory).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'mockup-1' }),
    );
  });

  it('routes history downloads through the generator hook', async () => {
    mockMg.activeTab = 'history';
    renderWithProviders(<MockupGenerator />);

    fireEvent.click(await screen.findByRole('button', { name: 'Baixar histórico' }));

    expect(mockMg.downloadMockup).toHaveBeenCalledWith(expect.objectContaining({ id: 'mockup-1' }));
  });

  it('delegates empty-state configuration actions and exposes recoverable notices', async () => {
    Object.assign(mockMg, {
      showDraftRestoredNotice: true,
      generationError: 'Falha temporária do provedor',
    });

    renderWithProviders(<MockupGenerator />);

    expect(screen.getByText('Rascunho restaurado')).toBeInTheDocument();
    expect(screen.getByText('Falha temporária do provedor')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dispensar' }));
    expect(mockMg.setGenerationError).toHaveBeenCalledWith(null);

    await screen.findByTestId('config-panel');
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar produto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar técnica' }));
    fireEvent.click(screen.getByRole('button', { name: 'Limpar técnica' }));
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar cliente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Resetar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Alterar áreas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Alterar área ativa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar logo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remover logo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Alterar anexos' }));

    expect(mockMg.setProductSelection).toHaveBeenCalledWith({ productId: 'product-2' });
    expect(mockMg.setGeneratedMockup).toHaveBeenCalledWith(null);
    expect(mockTechnique.handleTechniqueChange).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: 'technique-2' }),
    );
    expect(mockTechnique.handleTechniqueChange).toHaveBeenNthCalledWith(2, null);
    expect(mockMg.setSelectedClient).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'client-2' }),
    );
    expect(mockMg.resetForm).toHaveBeenCalled();
    expect(mockMg.setPersonalizationAreas).toHaveBeenCalledWith([{ id: 'area-2' }]);
    expect(mockMg.setActiveAreaId).toHaveBeenCalledWith('area-2');
    expect(mockMg.handleAreaLogoUpload).toHaveBeenCalledWith(expect.any(File));
    expect(mockMg.logoColorAnalysis.clearAnalysis).toHaveBeenCalled();
    expect(mockMg.updateActiveArea).not.toHaveBeenCalled();
    expect(mockMg.setArtAttachments).toHaveBeenCalledWith([{ id: 'art-2' }]);

    fireEvent.click(screen.getByRole('button', { name: 'Baixar resultado' }));
    fireEvent.click(screen.getByRole('button', { name: 'Resetar resultado' }));
    fireEvent.click(screen.getByRole('button', { name: 'Anotar resultado' }));
    expect(mockMg.downloadMockup).toHaveBeenCalledWith();
    expect(mockMg.setMockupAnnotations).toHaveBeenCalledWith([{ text: 'Revisar margem' }]);
  });

  it('executes the complete positioned-logo workflow and persists a static layout', async () => {
    const undoState = { positionX: 20, positionY: 30 };
    const redoState = { positionX: 40, positionY: 50 };
    const selectedTechnique = {
      id: 'technique-1',
      name: 'Gravação a laser',
      code: 'LASER',
      maxWidth: 9,
      maxHeight: 7,
      locationName: 'Frente',
    };
    Object.assign(mockMg, {
      selectedProduct: {
        id: 'product-1',
        name: 'Garrafa térmica',
        sku: 'GF-001',
        materials: ['Aço inox'],
        dimensions: {
          height_cm: 24,
          width_cm: 7,
          diameter_cm: 6.5,
          length_cm: 7.2,
          capacity_ml: 500,
          weight_g: 310,
        },
        metadata: { height_mm: 240, width_mm: 70 },
      },
      selectedTechnique,
      techniques: [selectedTechnique],
      selectedClient: {
        id: 'client-1',
        nome_fantasia: 'Empresa Exemplo',
        razao_social: 'Empresa Exemplo Ltda.',
        cnpj: '00.000.000/0001-00',
        logo_url: 'https://example.com/client-logo.png',
      },
      hasLogo: true,
      hasUserInteractedPosition: true,
      wizardStep: 6,
      generatedMockup: 'https://example.com/generated.png',
      generatedBatchMockups: [
        { url: 'https://example.com/front.png', areaName: 'Frente' },
        { url: 'https://example.com/back.png', areaName: 'Verso' },
      ],
      productSelection: {
        colorName: 'Azul',
        colorHex: '#0047AB',
        imageUrl: 'https://example.com/product.png',
      },
      activeAreaId: 'area-1',
      activeArea: {
        id: 'area-1',
        name: 'Frente',
        logoPreview: 'data:image/svg+xml;base64,logo',
        logoFile: new File(['logo'], 'logo.svg', { type: 'image/svg+xml' }),
        positionX: 50,
        positionY: 50,
        logoWidth: 6,
        logoHeight: 4,
        logoRotation: 5,
        logoScale: 110,
      },
      techniqueColorConfig: { colorCount: 2 },
      logoColorAnalysis: {
        colors: [
          {
            name: 'Azul institucional',
            hex: '#0047AB',
            selectedPantone: 'PANTONE 2945 C',
          },
          { name: 'Branco', hex: '#FFFFFF', pantoneMatch: { pantoneCode: 'PANTONE White' } },
        ],
        clearAnalysis: vi.fn(),
      },
      positionHistory: {
        canUndo: true,
        canRedo: true,
        undo: vi.fn().mockReturnValue(undoState),
        redo: vi.fn().mockReturnValue(redoState),
      },
      lastSavedRecordId: '65f0e100abcdef123456',
      lastSavedMockupUrl: 'https://example.com/saved.png',
      getProductImage: vi.fn().mockReturnValue('https://example.com/product.png'),
      saveMockupToHistory: vi.fn().mockResolvedValue('record-static-1'),
    });

    renderWithProviders(<MockupGenerator />);

    await screen.findByTestId('logo-editor');
    expect(screen.getByText('Verso')).toBeInTheDocument();
    expect(screen.getByTestId('layout-capture')).toHaveTextContent(
      '65f0e100abcdef123456:MK-65F0E100ABCD:Empresa Exemplo',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Refazer' }));
    expect(mockMg.updateActiveArea).toHaveBeenCalledWith(undoState);
    expect(mockMg.updateActiveArea).toHaveBeenCalledWith(redoState);

    fireEvent.click(screen.getByRole('button', { name: 'Mover logo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Redimensionar logo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Girar logo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Escalar logo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Configurar cores' }));
    expect(mockMg.updateActiveArea).toHaveBeenCalledWith({ positionX: 12, positionY: 34 });
    expect(mockMg.updateActiveArea).toHaveBeenCalledWith({ logoWidth: 7, logoHeight: 8 });
    expect(mockMg.updateActiveArea).toHaveBeenCalledWith({ logoRotation: 15 });
    expect(mockMg.updateActiveArea).toHaveBeenCalledWith({ logoScale: 120 });
    expect(mockTechnique.setColorConfigDialogOpen).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole('button', { name: 'Remover logo' }));
    expect(mockMg.logoColorAnalysis.clearAnalysis).toHaveBeenCalled();
    expect(mockMg.updateActiveArea).toHaveBeenCalledWith({ logoPreview: null, logoFile: null });

    fireEvent.click(screen.getByRole('button', { name: 'Aplicar sugestão completa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar técnica inexistente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar sugestão vazia' }));
    expect(mockTechnique.handleTechniqueChange).toHaveBeenCalledWith(selectedTechnique);
    expect(mockMg.updateActiveArea).toHaveBeenCalledWith({ positionX: 44, positionY: 55 });

    fireEvent.click(screen.getByRole('button', { name: 'Gerar pelo layout' }));
    expect(mockMg.generateMockup).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar layout estático' }));
    await waitFor(() => {
      expect(mockMg.saveMockupToHistory).toHaveBeenCalledWith(
        'data:image/png;base64,static',
        expect.objectContaining({ id: 'area-1' }),
        { width: 1200, height: 900 },
      );
      expect(mockMg.setLastSavedMockupUrl).toHaveBeenCalledWith('data:image/png;base64,static');
      expect(mockMg.setLastSavedLayoutMode).toHaveBeenCalledWith('static');
      expect(mockMg.setLastSavedRecordId).toHaveBeenCalledWith('record-static-1');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Captura concluída' }));
    expect(mockMg.setLastSavedRecordId).toHaveBeenCalledWith(null);
    expect(mockMg.setLastSavedMockupUrl).toHaveBeenCalledWith(null);
    expect(mockMg.fetchHistory).toHaveBeenCalled();

    const keyboardConfig = mockKeyboardShortcuts.mock.calls.at(-1)?.[0] as {
      onGenerate: () => void;
      onReset: () => void;
      onDownload: () => void;
      onStepChange: (step: number) => void;
      canGenerate: boolean;
      canDownload: boolean;
    };
    expect(keyboardConfig.canGenerate).toBe(true);
    expect(keyboardConfig.canDownload).toBe(true);
    keyboardConfig.onGenerate();
    keyboardConfig.onReset();
    keyboardConfig.onDownload();
    keyboardConfig.onStepChange(99);
    expect(mockMg.setActiveTab).toHaveBeenCalledWith('generator');
  });

  it('keeps failed or empty static saves recoverable and closes owned dialogs cleanly', async () => {
    const selectedTechnique = {
      id: 'technique-1',
      name: 'Silk screen',
      code: 'SILK',
    };
    Object.assign(mockMg, {
      selectedProduct: {
        id: 'product-1',
        name: 'Ecobag',
        sku: 'ECO-1',
        materials: [],
        dimensions: {},
        metadata: { height_mm: 300, width_mm: 250 },
      },
      selectedTechnique,
      techniques: [selectedTechnique],
      selectedClient: { id: 'client-1', name: 'Cliente sem cadastro completo' },
      activeAreaId: 'area-1',
      activeArea: {
        id: 'area-1',
        name: 'Frente',
        logoPreview: null,
        positionX: 50,
        positionY: 50,
        logoWidth: 5,
        logoHeight: 5,
      },
      getProductImage: vi.fn().mockReturnValue('https://example.com/ecobag.png'),
      generatedMockup: 'https://example.com/ecobag-generated.png',
      saveMockupToHistory: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error('Banco indisponível')),
      deleteDialogOpen: true,
    });
    Object.assign(mockTechnique, {
      techniqueChangeDialogOpen: true,
      pendingTechnique: { name: 'Transfer' },
      colorConfigDialogOpen: true,
    });

    renderWithProviders(<MockupGenerator />);
    await screen.findByTestId('logo-editor');

    const staticSave = within(screen.getByTestId('layout-buttons')).getByText(
      'Salvar layout estático',
    );
    fireEvent.click(staticSave);
    await waitFor(() => expect(mockMg.saveMockupToHistory).toHaveBeenCalledTimes(1));
    expect(mockMg.setLastSavedRecordId).not.toHaveBeenCalled();

    fireEvent.click(staticSave);
    await waitFor(() => expect(mockMg.saveMockupToHistory).toHaveBeenCalledTimes(2));
    expect(mockMg.setLastSavedRecordId).not.toHaveBeenCalled();

    const colorDialog = screen.getByTestId('color-dialog');
    fireEvent.click(within(colorDialog).getByText('Confirmar cores'));
    fireEvent.click(within(colorDialog).getByText('Fechar cores'));
    expect(mockMg.setTechniqueColorConfig).toHaveBeenCalledWith({ colorCount: 2 });
    expect(mockTechnique.setColorConfigDialogOpen).toHaveBeenCalledWith(false);

    const techniqueDialog = screen.getByTestId('mockup-technique-change-dialog');
    fireEvent.click(within(techniqueDialog).getByTestId('mockup-technique-change-dialog-yes'));
    expect(mockTechnique.confirmTechniqueChange).toHaveBeenCalled();

    const deleteDialog = screen.getByTestId('mockup-delete-dialog');
    fireEvent.click(within(deleteDialog).getByTestId('mockup-delete-dialog-no'));
    await waitFor(() => {
      expect(mockMg.setDeleteDialogOpen).toHaveBeenCalledWith(false);
      expect(mockMg.setMockupToDelete).toHaveBeenCalledWith(null);
    });
  });
});
