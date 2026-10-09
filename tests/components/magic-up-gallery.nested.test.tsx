/**
 * AdImageResult — galeria do histórico do Magic Up: sem interativo aninhado (E-25)
 *
 * Regressão coberta: o item da galeria era um `<div role="button">` com `tabIndex`
 * envolvendo os botões de favoritar e excluir — interativo aninhado, que o axe
 * acusa (`nested-interactive`, wcag2a) e que leitores de tela anunciam mal.
 *
 * Contrato verificado aqui:
 *  1) axe-core não reporta `nested-interactive` na galeria;
 *  2) o item abre com Enter/Espaço (controle nativo `<button>`, sem handler manual);
 *  3) favoritar e excluir continuam acessíveis (mouse e teclado) sem disparar
 *     o clique que abre o item.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ComponentProps } from "react";
import { render, fireEvent, screen, within } from "@testing-library/react";
import { axe } from "../a11y/axe-helper";
import { AdImageResult, type GenerationHistoryItem } from "@/components/magic-up/AdImageResult";

const history: GenerationHistoryItem[] = [
  {
    id: "h1",
    generated_image_url: "https://example.com/h1.png",
    product_name: "Caneta Premium",
    scene_title: "Lifestyle",
    is_favorite: false,
    created_at: "2026-10-01T10:00:00.000Z",
    quality_score: 88,
    status: "aprovado",
  },
  {
    id: "h2",
    generated_image_url: "https://example.com/h2.png",
    product_name: "Squeeze Inox",
    scene_title: null,
    is_favorite: true,
    created_at: "2026-10-02T10:00:00.000Z",
    quality_score: null,
    status: null,
  },
];

type AdImageResultProps = ComponentProps<typeof AdImageResult>;

/** Renderiza no estado vazio e abre a galeria pelo botão "Ver histórico". */
function openGallery(overrides: Partial<AdImageResultProps> = {}) {
  const props: AdImageResultProps = {
    imageUrl: null,
    isLoading: false,
    onDownload: vi.fn(),
    onShare: vi.fn(),
    onRegenerate: vi.fn(),
    history,
    ...overrides,
  };
  const view = render(<AdImageResult {...props} />);
  fireEvent.click(screen.getByRole("button", { name: /ver histórico/i }));
  return view;
}

/** Item da galeria (o container que agrupa imagem + ações) de um produto. */
function getGalleryItem(productName: string): HTMLElement {
  const open = screen.getByRole("button", {
    name: `Selecionar histórico ${productName}`,
  });
  const item = open.parentElement;
  if (!item) throw new Error(`Item da galeria de "${productName}" não encontrado`);
  return item;
}

describe("AdImageResult — galeria do histórico: sem interativo aninhado (E-25)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("axe-core não reporta nested-interactive com favoritar e excluir visíveis", async () => {
    const { container } = openGallery({
      onSelectHistory: vi.fn(),
      onToggleHistoryFavorite: vi.fn(),
      onDeleteHistory: vi.fn(),
    });

    const results = await axe(container);

    expect(results.violations.filter((v) => v.id === "nested-interactive")).toEqual([]);
    expect(results).toHaveNoViolations();
  });

  it("o item abre por um <button> nativo, sem role='button' aninhando as ações", () => {
    const { container } = openGallery({
      onSelectHistory: vi.fn(),
      onToggleHistoryFavorite: vi.fn(),
      onDeleteHistory: vi.fn(),
    });

    const open = screen.getByRole("button", { name: "Selecionar histórico Caneta Premium" });
    expect(open.tagName).toBe("BUTTON");
    expect(open).toHaveAttribute("type", "button");

    const fav = screen.getByRole("button", { name: "Favoritar histórico" });
    const remove = screen.getAllByRole("button", { name: "Excluir histórico" })[0];

    // nenhuma ação vive DENTRO do controle que abre o item
    expect(open.contains(fav)).toBe(false);
    expect(open.contains(remove)).toBe(false);
    // e não sobrou nenhum role="button" forjado na galeria
    expect(container.querySelector('[role="button"]')).toBeNull();
  });

  it("Enter e Espaço no item disparam onSelectHistory (comportamento nativo do button)", () => {
    const onSelectHistory = vi.fn();
    openGallery({ onSelectHistory });

    const open = screen.getByRole("button", { name: "Selecionar histórico Caneta Premium" });
    open.focus();
    expect(open).toHaveFocus();

    // <button> nativo: Enter/Espaço geram click sintético no browser
    fireEvent.keyDown(open, { key: "Enter", code: "Enter" });
    fireEvent.click(open);
    expect(onSelectHistory).toHaveBeenCalledTimes(1);
    expect(onSelectHistory).toHaveBeenCalledWith(history[0]);

    onSelectHistory.mockClear();
    fireEvent.keyDown(open, { key: " ", code: "Space" });
    fireEvent.click(open);
    expect(onSelectHistory).toHaveBeenCalledWith(history[0]);
  });

  it("clicar em favoritar alterna o favorito sem abrir o item", () => {
    const onSelectHistory = vi.fn();
    const onToggleHistoryFavorite = vi.fn();
    openGallery({ onSelectHistory, onToggleHistoryFavorite });

    const item = getGalleryItem("Caneta Premium");
    fireEvent.mouseEnter(item);

    fireEvent.click(within(item).getByRole("button", { name: "Favoritar histórico" }));

    expect(onToggleHistoryFavorite).toHaveBeenCalledTimes(1);
    expect(onToggleHistoryFavorite).toHaveBeenCalledWith("h1", false);
    expect(onSelectHistory).not.toHaveBeenCalled();
  });

  it("favoritar já marcado envia o estado atual (true) sem abrir o item", () => {
    const onSelectHistory = vi.fn();
    const onToggleHistoryFavorite = vi.fn();
    openGallery({ onSelectHistory, onToggleHistoryFavorite });

    const item = getGalleryItem("Squeeze Inox");
    fireEvent.click(within(item).getByRole("button", { name: "Remover favorito do histórico" }));

    expect(onToggleHistoryFavorite).toHaveBeenCalledWith("h2", true);
    expect(onSelectHistory).not.toHaveBeenCalled();
  });

  it("excluir pelo teclado (Enter) remove o item correto sem abrir o item", () => {
    const onSelectHistory = vi.fn();
    const onDeleteHistory = vi.fn();
    openGallery({ onSelectHistory, onDeleteHistory });

    const item = getGalleryItem("Caneta Premium");
    const remove = within(item).getByRole("button", { name: "Excluir histórico" });
    expect(remove.tagName).toBe("BUTTON");

    remove.focus();
    expect(remove).toHaveFocus();
    fireEvent.keyDown(remove, { key: "Enter", code: "Enter" });
    fireEvent.click(remove);

    expect(onDeleteHistory).toHaveBeenCalledWith("h1");
    expect(onSelectHistory).not.toHaveBeenCalled();
  });

  it("ações continuam alcançáveis por teclado a partir do item (ordem do DOM)", () => {
    openGallery({
      onSelectHistory: vi.fn(),
      onToggleHistoryFavorite: vi.fn(),
      onDeleteHistory: vi.fn(),
    });

    const item = getGalleryItem("Caneta Premium");
    const open = within(item).getByRole("button", { name: "Selecionar histórico Caneta Premium" });
    const fav = within(item).getByRole("button", { name: "Favoritar histórico" });
    const remove = within(item).getByRole("button", { name: "Excluir histórico" });

    // item → favoritar → excluir (nesta ordem no DOM), todos tabuláveis
    expect(
      open.compareDocumentPosition(fav) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      fav.compareDocumentPosition(remove) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    for (const el of [open, fav, remove]) {
      expect(el.tabIndex).toBe(0);
      el.focus();
      expect(el).toHaveFocus();
    }
  });
});
