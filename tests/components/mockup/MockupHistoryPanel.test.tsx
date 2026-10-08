/**
 * Render tests for MockupHistoryPanel (707 lines)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../render-helpers";
import React from "react";

vi.mock("@/components/products/LayoutPopover", () => ({
  LayoutPopover: () => <div />,
}));

vi.mock("@/components/products/ColumnSelector", () => ({
  getDefaultColumns: vi.fn().mockReturnValue(3),
}));

vi.mock("@/components/mockup/MockupSkeleton", () => ({
  MockupHistorySkeleton: () => <div data-testid="skeleton" />,
}));

vi.mock("@/components/mockup/MockupCompareDialog", () => ({
  MockupCompareDialog: () => null,
}));

vi.mock("@/components/mockup/ShareMenu", () => ({
  ShareMenu: () => null,
}));

/** Mockup na ordem em que o servidor entrega (created_at desc → index 0 = mais recente). */
const makeMockup = (index: number) => ({
  id: `m${index}`,
  product_id: `p${index}`,
  product_name: `Produto ${index}`,
  product_sku: `SKU-${index}`,
  technique_id: "t1",
  technique_name: "Laser",
  mockup_url: `https://example.com/mockup-${index}.jpg`,
  layout_url: null,
  logo_url: null,
  position_x: 50,
  position_y: 50,
  logo_width_cm: 5,
  logo_height_cm: 3,
  location_name: "Frente",
  colors_count: 1,
  created_at: new Date(Date.now() - index * 60_000).toISOString(),
  client_id: "c1",
  client_name: "Cliente A",
  annotations: null,
});

describe("MockupHistoryPanel", () => {
  const defaultProps = {
    mockupHistory: [],
    isLoading: false,
    clients: [],
    onLoadFromHistory: vi.fn(),
    onDownload: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state", async () => {
    const { MockupHistoryPanel } = await import("@/components/mockup/MockupHistoryPanel");
    renderWithProviders(<MockupHistoryPanel {...defaultProps} />);
    expect(document.body).toBeTruthy();
  }, 15000);

  it("renders loading state", async () => {
    const { MockupHistoryPanel } = await import("@/components/mockup/MockupHistoryPanel");
    renderWithProviders(<MockupHistoryPanel {...defaultProps} isLoading={true} />);
    expect(document.body).toBeTruthy();
  });

  it("renders with mockup data", async () => {
    const { MockupHistoryPanel } = await import("@/components/mockup/MockupHistoryPanel");
    renderWithProviders(
      <MockupHistoryPanel
        {...defaultProps}
        mockupHistory={[{
          id: "m1",
          product_id: "p1",
          product_name: "Caneta",
          product_sku: "CAN-001",
          technique_id: "t1",
          technique_name: "Laser",
          mockup_url: "https://example.com/mockup.jpg",
          layout_url: null,
          logo_url: "https://example.com/logo.png",
          position_x: 50,
          position_y: 50,
          logo_width_cm: 5,
          logo_height_cm: 3,
          location_name: "Frente",
          colors_count: 1,
          created_at: new Date().toISOString(),
          client_id: "c1",
          client_name: "Cliente A",
          annotations: null,
        }]}
      />
    );
    expect(document.body).toBeTruthy();
  });

  it("mostra só os 10 últimos mockups e aponta para o histórico completo", async () => {
    const { MockupHistoryPanel } = await import("@/components/mockup/MockupHistoryPanel");
    const { MOCKUP_HISTORY_PANEL_LIMIT } = await import("@/hooks/mockup/mockupHistoryAdapter");
    // O teto de 10 itens pedidos ao servidor é provado em
    // tests/hooks/mockupHistoryAdapter.test.ts (fetchRecentMockupHistory → .limit(10)).
    expect(MOCKUP_HISTORY_PANEL_LIMIT).toBe(10);

    const many = Array.from({ length: 25 }, (_, index) => makeMockup(index));
    renderWithProviders(<MockupHistoryPanel {...defaultProps} mockupHistory={many} />);

    const cards = await screen.findAllByTestId("mockup-history-card");
    // A aba do gerador é atalho: 25 linhas recebidas, 10 renderizadas.
    expect(cards).toHaveLength(MOCKUP_HISTORY_PANEL_LIMIT);
    expect(screen.getByText("Produto 0")).toBeInTheDocument();
    expect(screen.queryByText("Produto 10")).not.toBeInTheDocument();

    expect(screen.getByRole("link", { name: /ver histórico completo/i })).toHaveAttribute(
      "href",
      "/mockups/historico"
    );
  });
});
