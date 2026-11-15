import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type React from "react";
import { MemoryRouter } from "react-router-dom";

const captured = vi.hoisted(() => ({}) as Record<string, Record<string, unknown>>);
function capture(name: string, testId: string) {
  return (props: Record<string, unknown>) => {
    captured[name] = props;
    return <div data-testid={testId} />;
  };
}
function call(name: string, prop: string, ...args: unknown[]) {
  const fn = captured[name]?.[prop] as ((...a: unknown[]) => unknown) | undefined;
  if (!fn) throw new Error(`${name}.${prop} não foi passado`);
  return act(() => {
    fn(...args);
  });
}

vi.mock("@/components/seo/PageSEO", () => ({
  PageSEO: () => null,
}));

const mockUseKitBuilderPageState = vi.fn();

vi.mock("@/hooks/kit-builder", () => ({
  useKitBuilderPageState: () => mockUseKitBuilderPageState(),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button data-testid="button" onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

vi.mock("@/components/kit-builder", () => ({
  WizardSteps: () => <div data-testid="wizard-steps" />,
  BoxSelector: capture("BoxSelector", "box-selector"),
  ItemSelector: capture("ItemSelector", "item-selector"),
  KitSummary: capture("KitSummary", "kit-summary"),
  PersonalizationConfig: capture("PersonalizationConfig", "personalization-config"),
  KitMakerLanding: capture("KitMakerLanding", "kit-maker-landing"),
}));

vi.mock("@/components/kit-builder/KitBuilderHeader", () => ({
  KitBuilderHeader: capture("KitBuilderHeader", "kit-builder-header"),
}));

vi.mock("@/components/kit-builder/KitHeroPricingCard", () => ({
  KitHeroPricingCard: () => <div data-testid="kit-pricing-card" />,
}));

vi.mock("@/components/kit-builder/KitIsometricPreview", () => ({
  KitIsometricPreview: () => <div data-testid="kit-isometric-preview" />,
}));

vi.mock("@/components/kit-builder/KitMakerGuideDrawer", () => ({
  KitMakerGuideDrawer: () => <div data-testid="kit-maker-guide-drawer" />,
}));

vi.mock("@/components/kit-builder/KitBuilderTour", () => ({
  KitBuilderTour: () => <div data-testid="kit-builder-tour" />,
}));

vi.mock("@/hooks/kit-builder/useKitWizardShortcuts", () => ({
  useKitWizardShortcuts: vi.fn(),
}));

function makeState(currentStep: string, overrides: Record<string, unknown> = {}) {
  return {
    state: {
      kitState: {
        name: "Kit Teste",
        isValid: true,
        identity: null,
        box: null,
        items: [],
        personalization: { box: null, items: [] },
        notes: "",
        volumeUsagePercent: 0,
      },
      wizardState: {
        currentStep,
        completedSteps: [],
        canProceed: true,
        flow: "default",
      },
      availableBoxes: [],
      availableItems: [],
      allAvailableBoxes: [],
      allAvailableItems: [],
      isLoadingBoxes: false,
      isLoadingItems: false,
      boxFilters: {},
      itemFilters: {},
      setBoxFilters: vi.fn(),
      setItemFilters: vi.fn(),
      kitQuantity: 1,
      currentKitId: null,
      autoSavedKitId: null,
      isLanding: false,
      boxError: undefined,
      itemError: undefined,
      quoteClient: null,
      setQuoteClient: vi.fn(),
      refetchBoxes: vi.fn().mockResolvedValue(undefined),
      refetchItems: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    },
    actions: {
      setKitName: vi.fn(),
      setIdentity: vi.fn(),
      handleSaveKit: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      resetKit: vi.fn(),
      goToStep: vi.fn(),
      selectBox: vi.fn(),
      clearBox: vi.fn(),
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateItemQuantity: vi.fn(),
      updateItemVariant: vi.fn(),
      setKitQuantity: vi.fn(),
      handleAddToQuote: vi.fn().mockResolvedValue(undefined),
      prevStep: vi.fn(),
      nextStep: vi.fn(),
      clearItems: vi.fn(),
      reorderItems: vi.fn(),
      setBoxPersonalization: vi.fn(),
      setItemPersonalization: vi.fn(),
      setNotes: vi.fn(),
      retryAutoSave: vi.fn().mockResolvedValue(undefined),
      startFlow: vi.fn(),
      selectOccasion: vi.fn(),
      applyAISuggestion: vi.fn(),
      consumeUnloadBackup: vi.fn().mockReturnValue(null),
      canUndo: false,
      canRedo: false,
    },
    meta: {
      isSaving: false,
      isAutoSaving: false,
      lastSavedAt: null,
      isCreatingQuote: false,
      pricing: {
        unitPrice: 10,
        total: 10,
      },
    },
  };
}

describe("KitBuilderPage", () => {
  let KitBuilderPage: React.ComponentType;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/pages/kit-builder/KitBuilderPage");
    KitBuilderPage = mod.default;
  });

  it("renderiza o passo box (padrão)", async () => {
    mockUseKitBuilderPageState.mockReturnValue(makeState("box"));

    render(<KitBuilderPage />);

    expect(screen.getByTestId("kit-builder-header")).toBeInTheDocument();
    expect(screen.getByTestId("wizard-steps")).toBeInTheDocument();
    expect(screen.getByTestId("box-selector")).toBeInTheDocument();
    expect(screen.getByTestId("kit-pricing-card")).toBeInTheDocument();
    expect(await screen.findByTestId("kit-isometric-preview")).toBeInTheDocument();
  });

  it("renderiza o passo items", async () => {
    mockUseKitBuilderPageState.mockReturnValue(makeState("items"));

    render(<KitBuilderPage />);

    expect(screen.getByTestId("kit-builder-header")).toBeInTheDocument();
    expect(screen.getByTestId("item-selector")).toBeInTheDocument();
  });

  it("renderiza o passo personalization", async () => {
    mockUseKitBuilderPageState.mockReturnValue(makeState("personalization"));

    render(<KitBuilderPage />);

    expect(screen.getByTestId("kit-builder-header")).toBeInTheDocument();
    expect(screen.getByTestId("personalization-config")).toBeInTheDocument();
  });

  it("renderiza o passo summary com KitSummary", async () => {
    mockUseKitBuilderPageState.mockReturnValue(makeState("summary"));

    render(<KitBuilderPage />);

    expect(screen.getByTestId("kit-builder-header")).toBeInTheDocument();
    expect(screen.getByTestId("kit-summary")).toBeInTheDocument();
  });

  it("renderiza com isLoading ativo para boxes", async () => {
    mockUseKitBuilderPageState.mockReturnValue(
      makeState("box", { isLoadingBoxes: true }),
    );

    render(<KitBuilderPage />);

    expect(screen.getByTestId("box-selector")).toBeInTheDocument();
  });

  it("renderiza com isLoading ativo para items", async () => {
    mockUseKitBuilderPageState.mockReturnValue(
      makeState("items", { isLoadingItems: true }),
    );

    render(<KitBuilderPage />);

    expect(screen.getByTestId("item-selector")).toBeInTheDocument();
  });

  it("renderiza com kit salvo (currentKitId definido)", async () => {
    mockUseKitBuilderPageState.mockReturnValue(
      makeState("summary", { currentKitId: "kit-abc-123" }),
    );

    render(<KitBuilderPage />);

    expect(screen.getByTestId("kit-summary")).toBeInTheDocument();
  });

  it("renderiza com isCreatingQuote ativo", async () => {
    const s = makeState("summary");
    s.meta.isCreatingQuote = true;
    mockUseKitBuilderPageState.mockReturnValue(s);

    render(<KitBuilderPage />);

    expect(screen.getByTestId("kit-summary")).toBeInTheDocument();
  });

  describe("callbacks repassadas aos passos", () => {
    it("box: retry recarrega caixas, editar itens e guia", async () => {
      const s = makeState("box");
      mockUseKitBuilderPageState.mockReturnValue(s);
      render(<KitBuilderPage />);

      await call("BoxSelector", "onRetry");
      expect(s.state.refetchBoxes).toHaveBeenCalledTimes(1);
      await call("BoxSelector", "onEditItems");
      expect(s.actions.goToStep).toHaveBeenCalledWith("items");
      await call("BoxSelector", "onOpenGuide");
    });

    it("box: falha no retry não propaga erro", async () => {
      const s = makeState("box", { refetchBoxes: vi.fn().mockRejectedValue(new Error("x")) });
      mockUseKitBuilderPageState.mockReturnValue(s);
      render(<KitBuilderPage />);

      await call("BoxSelector", "onRetry");
      expect(s.state.refetchBoxes).toHaveBeenCalledTimes(1);
    });

    it("items: retry recarrega itens", async () => {
      const s = makeState("items", { refetchItems: vi.fn().mockRejectedValue(new Error("x")) });
      mockUseKitBuilderPageState.mockReturnValue(s);
      render(<KitBuilderPage />);

      await call("ItemSelector", "onRetry");
      expect(s.state.refetchItems).toHaveBeenCalledTimes(1);
    });

    it("personalization: editar itens volta para o passo items", async () => {
      const s = makeState("personalization");
      mockUseKitBuilderPageState.mockReturnValue(s);
      render(<KitBuilderPage />);

      await call("PersonalizationConfig", "onEditItems");
      expect(s.actions.goToStep).toHaveBeenCalledWith("items");
      expect(screen.getByRole("button", { name: "Revisar kit" })).toBeInTheDocument();
      await call("PersonalizationConfig", "onOpenGuide");
    });

    it("summary: adicionar ao orçamento, editar caixa, salvar rascunho e exportar PDF", async () => {
      const s = makeState("summary", { currentKitId: "kit-1", quoteClient: { id: "c1" } });
      mockUseKitBuilderPageState.mockReturnValue(s);
      const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
      render(<KitBuilderPage />);

      await call("KitSummary", "onAddToQuote");
      expect(s.actions.handleAddToQuote).toHaveBeenCalledWith(
        s.state.kitState,
        1,
        { id: "c1" },
        "kit-1",
      );
      await call("KitSummary", "onEditBox");
      expect(s.actions.goToStep).toHaveBeenCalledWith("box");
      await call("KitSummary", "onSaveDraft");
      expect(s.actions.handleSaveKit).toHaveBeenCalledTimes(1);
      await call("KitSummary", "onExportPDF");
      expect(print).toHaveBeenCalledTimes(1);
      print.mockRestore();
    });

    it("header: tentar autosave de novo chama retryAutoSave", async () => {
      const s = makeState("box");
      mockUseKitBuilderPageState.mockReturnValue(s);
      render(<KitBuilderPage />);

      await call("KitBuilderHeader", "onRetryAutoSave");
      expect(s.actions.retryAutoSave).toHaveBeenCalledTimes(1);
    });

    it("botões Voltar e Continuar navegam no wizard", () => {
      const s = makeState("box");
      mockUseKitBuilderPageState.mockReturnValue(s);
      render(<KitBuilderPage />);

      fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
      expect(s.actions.prevStep).toHaveBeenCalledTimes(1);
      expect(s.actions.nextStep).toHaveBeenCalledTimes(1);
    });
  });

  describe("landing", () => {
    it("aplicar sugestão de IA inicia o fluxo items-first e aplica a sugestão", async () => {
      const s = makeState("box", { isLanding: true });
      mockUseKitBuilderPageState.mockReturnValue(s);
      render(<KitBuilderPage />);

      expect(screen.getByTestId("kit-maker-landing")).toBeInTheDocument();
      expect(screen.queryByTestId("kit-builder-header")).not.toBeInTheDocument();
      await call("KitMakerLanding", "onApplyAISuggestion", "sug", "comp", 50);
      expect(s.actions.startFlow).toHaveBeenCalledWith("items-first", "ai");
      expect(s.actions.applyAISuggestion).toHaveBeenCalledWith("sug", "comp", 50);
      await call("KitMakerLanding", "onOpenTutorial");
    });

    it("atalhos de edição ficam desligados na landing", () => {
      const s = makeState("box", { isLanding: true });
      mockUseKitBuilderPageState.mockReturnValue(s);
      render(<KitBuilderPage />);

      fireEvent.keyDown(window, { key: "s", ctrlKey: true });
      expect(s.actions.handleSaveKit).not.toHaveBeenCalled();
    });
  });

  describe("atalhos de teclado do editor", () => {
    it("Ctrl+S salva, Ctrl+Z desfaz, Ctrl+Shift+Z e Ctrl+Y refazem", () => {
      const s = makeState("box");
      mockUseKitBuilderPageState.mockReturnValue(s);
      render(<KitBuilderPage />);

      fireEvent.keyDown(window, { key: "s", ctrlKey: true });
      expect(s.actions.handleSaveKit).toHaveBeenCalledTimes(1);
      fireEvent.keyDown(window, { key: "z", metaKey: true });
      expect(s.actions.undo).toHaveBeenCalledTimes(1);
      fireEvent.keyDown(window, { key: "Z", ctrlKey: true, shiftKey: true });
      fireEvent.keyDown(window, { key: "y", ctrlKey: true });
      expect(s.actions.redo).toHaveBeenCalledTimes(2);
    });

    it("sem Ctrl/Cmd nada acontece", () => {
      const s = makeState("box");
      mockUseKitBuilderPageState.mockReturnValue(s);
      render(<KitBuilderPage />);

      fireEvent.keyDown(window, { key: "s" });
      fireEvent.keyDown(window, { key: "z" });
      expect(s.actions.handleSaveKit).not.toHaveBeenCalled();
      expect(s.actions.undo).not.toHaveBeenCalled();
    });

    it("em campo de texto só Ctrl+S funciona", () => {
      const s = makeState("box");
      mockUseKitBuilderPageState.mockReturnValue(s);
      render(
        <>
          <KitBuilderPage />
          <input data-testid="campo" />
        </>,
      );
      const input = screen.getByTestId("campo");

      fireEvent.keyDown(input, { key: "z", ctrlKey: true });
      expect(s.actions.undo).not.toHaveBeenCalled();
      fireEvent.keyDown(input, { key: "s", ctrlKey: true });
      expect(s.actions.handleSaveKit).toHaveBeenCalledTimes(1);
    });

    it("remove o listener ao desmontar", () => {
      const s = makeState("box");
      mockUseKitBuilderPageState.mockReturnValue(s);
      const { unmount } = render(<KitBuilderPage />);
      unmount();

      fireEvent.keyDown(window, { key: "s", ctrlKey: true });
      expect(s.actions.handleSaveKit).not.toHaveBeenCalled();
    });
  });

  it('preserva a tela existente para quantidade já verificada', async () => {
    mockUseKitBuilderPageState.mockReturnValue(makeState('summary'));
    const view = render(<KitBuilderPage />);
    await screen.findByTestId('kit-summary');
    const originalMarkup = view.container.innerHTML;
    mockUseKitBuilderPageState.mockReturnValue(
      makeState('summary', {
        quantityNeedsConfirmation: false,
        isHydrating: false,
        hydrationError: null,
      }),
    );
    view.rerender(<KitBuilderPage />);
    expect(view.container.innerHTML).toBe(originalMarkup);
    expect(screen.queryByText(/Quantidade não informada/)).not.toBeInTheDocument();
  });

  it('pede confirmação explícita do preset para quantidade histórica ausente sem chamar salvar', () => {
    const model = makeState('summary', { quantityNeedsConfirmation: true, kitQuantity: 1 });
    mockUseKitBuilderPageState.mockReturnValue(model);
    render(<KitBuilderPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Quantidade não informada');
    expect(model.actions.setKitQuantity).not.toHaveBeenCalled();
    expect(model.actions.handleSaveKit).not.toHaveBeenCalled();
    screen.getByRole('button', { name: 'Confirmar 1 kit' }).click();
    expect(model.actions.setKitQuantity).toHaveBeenCalledExactlyOnceWith(1);
    expect(model.actions.handleSaveKit).not.toHaveBeenCalled();
  });

  it('bloqueia a edição durante a hidratação do snapshot', () => {
    mockUseKitBuilderPageState.mockReturnValue(makeState('summary', { isHydrating: true }));
    render(<KitBuilderPage />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando kit salvo');
    expect(screen.queryByTestId('kit-builder-header')).not.toBeInTheDocument();
  });

  it('mantém o erro original e a biblioteca acessível sem regravar rascunho inválido', () => {
    const model = makeState('summary', { hydrationError: 'Snapshot histórico incompatível' });
    mockUseKitBuilderPageState.mockReturnValue(model);
    render(
      <MemoryRouter>
        <KitBuilderPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Snapshot histórico incompatível');
    expect(screen.getByRole('link', { name: 'Voltar à biblioteca de kits' })).toHaveAttribute(
      'href',
      '/meus-kits',
    );
    expect(model.actions.handleSaveKit).not.toHaveBeenCalled();
  });
});
