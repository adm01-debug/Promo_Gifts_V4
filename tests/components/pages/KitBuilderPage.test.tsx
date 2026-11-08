import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

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
  BoxSelector: () => <div data-testid="box-selector" />,
  ItemSelector: () => <div data-testid="item-selector" />,
  KitSummary: () => <div data-testid="kit-summary" />,
  PersonalizationConfig: () => <div data-testid="personalization-config" />,
}));

vi.mock("@/components/kit-builder/KitBuilderHeader", () => ({
  KitBuilderHeader: () => <div data-testid="kit-builder-header" />,
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
});
