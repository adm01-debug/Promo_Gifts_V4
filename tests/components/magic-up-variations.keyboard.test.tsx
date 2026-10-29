/**
 * Magic Up — regra única de navegação por teclado (comparador × dots/thumbnails).
 *
 * E-24: o comparador fazia wrap com módulo (`(i + 1) % total`) enquanto os
 * dots/thumbnails do `MagicUpResultPanel` param no limite (padrão APG Tabs,
 * comentado no próprio componente). Este arquivo trava a regra escolhida —
 * NÃO-WRAP (limite nos extremos) + Home/End nos extremos — nos TRÊS widgets,
 * para que a divergência não volte por regressão.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState } from "react";
import { render, fireEvent, screen, within } from "@testing-library/react";
import { MagicUpVariationComparator } from "@/components/magic-up/MagicUpVariationComparator";
import { MagicUpResultPanel } from "@/pages/magic-up/MagicUpResultPanel";
import type { VariationItem } from "@/hooks/intelligence";

vi.mock("@/components/magic-up/AdImageResult", () => ({
  AdImageResult: () => <div data-testid="ad-image-result-stub" />,
}));

function buildVariations(count = 3): VariationItem[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: `var-${i + 1}`,
    imageUrl: `https://example.com/img-${i + 1}.png`,
    isFavorite: false,
    qualityScore: 80 + i,
    curationStatus: "draft" as const,
    isWinner: false,
  }));
}

// ───────── Comparador (cards de variação) ─────────

function ComparatorHarness({
  count = 3,
  initial = 0,
  onSelect = vi.fn(),
}: {
  count?: number;
  initial?: number;
  onSelect?: (index: number) => void;
}) {
  const [active, setActive] = useState(initial);
  return (
    <MagicUpVariationComparator
      variations={buildVariations(count)}
      activeIndex={active}
      onSelect={(index) => {
        onSelect(index);
        setActive(index);
      }}
      onSelectWinner={vi.fn()}
    />
  );
}

function getCards(): HTMLButtonElement[] {
  return screen
    .getAllByTestId(/^variation-card-\d+$/)
    .map((el) => el as HTMLButtonElement)
    .sort((a, b) => Number(a.dataset.variationIndex) - Number(b.dataset.variationIndex));
}

describe("MagicUpVariationComparator — regra única de navegação (não-wrap)", () => {
  it("ArrowRight no último card para no limite: foco e seleção não mudam", () => {
    const onSelect = vi.fn();
    render(<ComparatorHarness initial={2} onSelect={onSelect} />);
    const cards = getCards();

    cards[2].focus();
    expect(cards[2]).toHaveFocus();
    fireEvent.keyDown(cards[2], { key: "ArrowRight" });

    expect(onSelect).not.toHaveBeenCalled();
    expect(cards[2]).toHaveFocus();
    expect(cards[2]).toHaveAttribute("aria-pressed", "true");
  });

  it("ArrowLeft no primeiro card para no limite: foco e seleção não mudam", () => {
    const onSelect = vi.fn();
    render(<ComparatorHarness initial={0} onSelect={onSelect} />);
    const cards = getCards();

    cards[0].focus();
    fireEvent.keyDown(cards[0], { key: "ArrowLeft" });

    expect(onSelect).not.toHaveBeenCalled();
    expect(cards[0]).toHaveFocus();
    expect(cards[0]).toHaveAttribute("aria-pressed", "true");
  });

  it("ArrowDown/ArrowUp seguem a mesma regra de limite no eixo vertical", () => {
    const onSelect = vi.fn();
    render(<ComparatorHarness initial={2} onSelect={onSelect} />);
    const cards = getCards();

    cards[2].focus();
    fireEvent.keyDown(cards[2], { key: "ArrowDown" });
    expect(onSelect).not.toHaveBeenCalled();
    expect(cards[2]).toHaveFocus();

    fireEvent.keyDown(cards[2], { key: "ArrowUp" });
    expect(onSelect).toHaveBeenLastCalledWith(1);
    expect(cards[1]).toHaveFocus();
  });

  it("setas movem foco e seleção para o vizinho quando não está no extremo", () => {
    const onSelect = vi.fn();
    render(<ComparatorHarness initial={0} onSelect={onSelect} />);
    const cards = getCards();

    cards[0].focus();
    fireEvent.keyDown(cards[0], { key: "ArrowRight" });
    expect(onSelect).toHaveBeenLastCalledWith(1);
    expect(cards[1]).toHaveFocus();

    fireEvent.keyDown(cards[1], { key: "ArrowLeft" });
    expect(onSelect).toHaveBeenLastCalledWith(0);
    expect(cards[0]).toHaveFocus();
  });

  it("Home/End saltam para o primeiro e o último card", () => {
    const onSelect = vi.fn();
    render(<ComparatorHarness initial={1} onSelect={onSelect} />);
    const cards = getCards();

    cards[1].focus();
    fireEvent.keyDown(cards[1], { key: "End" });
    expect(onSelect).toHaveBeenLastCalledWith(2);
    expect(cards[2]).toHaveFocus();

    fireEvent.keyDown(cards[2], { key: "Home" });
    expect(onSelect).toHaveBeenLastCalledWith(0);
    expect(cards[0]).toHaveFocus();
  });
});

// ───────── Dots e thumbnails do ResultPanel ─────────

type StubState = Parameters<typeof MagicUpResultPanel>[0]["m"];

function buildStubState({
  variationsCount = 3,
  activeVariation = 0,
}: { variationsCount?: number; activeVariation?: number } = {}): StubState {
  const variations = buildVariations(variationsCount);

  return {
    variations,
    activeVariation,
    setActiveVariation: vi.fn(),
    currentVariation: variations[activeVariation],
    generating: false,
    history: [],
    selectedProduct: { name: "Caneta Premium" },
    selectedScene: { title: "Lifestyle" },
    handleDownload: vi.fn(),
    handleShare: vi.fn(),
    handleGenerate: vi.fn(),
    handleToggleFavorite: vi.fn(),
    handleSelectHistory: vi.fn(),
    handleDeleteHistory: vi.fn(),
    handleToggleHistoryFavorite: vi.fn(),
    handleSelectWinningVariation: vi.fn(),
    handleSetCurationStatus: vi.fn(),
    handleRunQualityScore: vi.fn(),
    qualityScore: 80,
    qualityDiagnosis: undefined,
    curationStatus: "draft",
    copyPack: { headline: "", subheadline: "", cta: "", body: "", hashtags: [] },
    creativeControls: { aspectRatio: "1:1" },
  } as unknown as StubState;
}

function getDots(): HTMLButtonElement[] {
  return within(screen.getByRole("tablist", { name: "Variações geradas" })).getAllByRole(
    "tab"
  ) as HTMLButtonElement[];
}

function getThumbs(): HTMLButtonElement[] {
  return within(
    screen.getByRole("tablist", { name: "Miniaturas das variações" })
  ).getAllByRole("tab") as HTMLButtonElement[];
}

describe("MagicUpResultPanel — mesma regra do comparador (não-wrap)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["dots", getDots],
    ["thumbnails", getThumbs],
  ])("%s: ArrowRight no último item para no limite (sem wrap)", (_label, getItems) => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 2 });
    render(<MagicUpResultPanel m={m} />);
    const items = getItems();

    items[2].focus();
    fireEvent.keyDown(items[2], { key: "ArrowRight" });

    expect(m.setActiveVariation).not.toHaveBeenCalled();
    expect(items[2]).toHaveFocus();
  });

  it.each([
    ["dots", getDots],
    ["thumbnails", getThumbs],
  ])("%s: ArrowLeft no primeiro item para no limite (sem wrap)", (_label, getItems) => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 0 });
    render(<MagicUpResultPanel m={m} />);
    const items = getItems();

    items[0].focus();
    fireEvent.keyDown(items[0], { key: "ArrowLeft" });

    expect(m.setActiveVariation).not.toHaveBeenCalled();
    expect(items[0]).toHaveFocus();
  });

  it.each([
    ["dots", getDots],
    ["thumbnails", getThumbs],
  ])("%s: Home/End saltam para os extremos", (_label, getItems) => {
    const m = buildStubState({ variationsCount: 3, activeVariation: 1 });
    render(<MagicUpResultPanel m={m} />);
    const items = getItems();

    items[1].focus();
    fireEvent.keyDown(items[1], { key: "End" });
    expect(m.setActiveVariation).toHaveBeenLastCalledWith(2);
    expect(items[2]).toHaveFocus();

    fireEvent.keyDown(items[2], { key: "Home" });
    expect(m.setActiveVariation).toHaveBeenLastCalledWith(0);
    expect(items[0]).toHaveFocus();
  });

  it("regra idêntica em dots e thumbnails: nenhum dos dois cicla no extremo", () => {
    const m = buildStubState({ variationsCount: 2, activeVariation: 1 });
    render(<MagicUpResultPanel m={m} />);

    const lists = [getDots(), getThumbs()];
    for (const items of lists) {
      expect(items).toHaveLength(2);
      items[1].focus();
      fireEvent.keyDown(items[1], { key: "ArrowRight" });
      expect(m.setActiveVariation).not.toHaveBeenCalled();
      expect(items[1]).toHaveFocus();
    }
  });
});
