import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("@/components/seo/PageSEO", () => ({
  PageSEO: () => null,
}));

vi.mock("@/hooks/kit-builder", () => ({
  useKitBuilderPageState: () => ({
    state: {
      kitState: {
        name: "Kit Teste",
        isValid: true,
        identity: null,
        box: null,
        items: [],
      },
      wizardState: {
        currentStep: "box",
        completedSteps: [],
      },
      availableBoxes: [],
      availableItems: [],
      isLoadingBoxes: false,
      isLoadingItems: false,
      boxFilters: {},
      itemFilters: {},
      setBoxFilters: vi.fn(),
      setItemFilters: vi.fn(),
      kitQuantity: 1,
      currentKitId: null,
      autoSavedKitId: null,
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
      handleAddToQuote: vi.fn(),
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
  }),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
}));

vi.mock("@/components/kit-builder", () => ({
  WizardSteps: () => <div data-testid="wizard-steps" />,
  BoxSelector: () => <div data-testid="box-selector" />,
  ItemSelector: () => <div data-testid="item-selector" />,
  KitSummary: () => <div data-testid="kit-summary" />,
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

describe("KitBuilderPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza o fluxo base da página", async () => {
    const { default: KitBuilderPage } = await import("@/pages/kit-builder/KitBuilderPage");

    render(<KitBuilderPage />);

    expect(screen.getByTestId("kit-builder-header")).toBeInTheDocument();
    expect(screen.getByTestId("wizard-steps")).toBeInTheDocument();
    expect(screen.getByTestId("box-selector")).toBeInTheDocument();
    expect(screen.getByTestId("kit-pricing-card")).toBeInTheDocument();
    expect(await screen.findByTestId("kit-isometric-preview")).toBeInTheDocument();
  });
});
