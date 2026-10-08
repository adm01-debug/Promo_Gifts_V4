import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

// Estado mutável do "banco": permite simular paginação real (range) e exclusão.
const dbState = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  totalCount: 0,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => {
            const chain = {
              or: vi.fn(() => chain),
              range: vi.fn((from: number, to: number) =>
                Promise.resolve({
                  data: dbState.rows.slice(from, to + 1),
                  error: null,
                  count: dbState.totalCount,
                }),
              ),
            };
            return chain;
          }),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn((_column: string, id: string) => {
          dbState.rows = dbState.rows.filter((row) => row.id !== id);
          dbState.totalCount = dbState.rows.length;
          return Promise.resolve({ error: null });
        }),
      })),
    })),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function makeRow(index: number) {
  return {
    id: `m${index}`,
    product_name: `Produto ${index}`,
    product_sku: `SKU-${index}`,
    technique_name: "Serigrafia",
    area_name: "Frontal",
    area_config: {
      clientName: `Cliente ${index}`,
      logoWidth: 10,
      logoHeight: 5,
      colorsCount: 3,
    },
    mockup_url: "https://example.com/mockup.png",
    created_at: "2024-06-15T14:30:00Z",
  };
}

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{ui}</BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
}

describe("MockupHistoryPage", () => {
  beforeEach(() => {
    dbState.rows = [makeRow(1)];
    dbState.totalCount = 1;
  });

  it("renders the page title", async () => {
    const { default: Page } = await import("@/pages/mockups/MockupHistoryPage");
    renderWithProviders(<Page />);
    expect(screen.getByText("Histórico de Mockups")).toBeInTheDocument();
  }, 15000);

  it("renders page description", async () => {
    const { default: Page } = await import("@/pages/mockups/MockupHistoryPage");
    renderWithProviders(<Page />);
    expect(screen.getByText("Todos os mockups gerados por você")).toBeInTheDocument();
  });

  it("renders search input", async () => {
    const { default: Page } = await import("@/pages/mockups/MockupHistoryPage");
    renderWithProviders(<Page />);
    // The search filters on product_name/product_sku/technique_name only — client_name
    // is not a real column (lives in area_config JSONB), so it is intentionally excluded
    // from the .or() filter to avoid a PostgREST 400 (see BUG-400 fix in the page).
    expect(screen.getByPlaceholderText("Buscar por produto, SKU ou técnica...")).toBeInTheDocument();
  });

  it("renders table headers", async () => {
    const { default: Page } = await import("@/pages/mockups/MockupHistoryPage");
    renderWithProviders(<Page />);
    expect(screen.getByText("Preview")).toBeInTheDocument();
    expect(screen.getByText("Produto")).toBeInTheDocument();
    expect(screen.getByText("Cliente")).toBeInTheDocument();
    expect(screen.getByText("Técnica")).toBeInTheDocument();
    expect(screen.getByText("Posição")).toBeInTheDocument();
    expect(screen.getByText("Dimensões")).toBeInTheDocument();
  });

  it("renders total mockups card", async () => {
    const { default: Page } = await import("@/pages/mockups/MockupHistoryPage");
    renderWithProviders(<Page />);
    expect(screen.getByText("Total de Mockups")).toBeInTheDocument();
  });

  it("renders Mockups Gerados section", async () => {
    const { default: Page } = await import("@/pages/mockups/MockupHistoryPage");
    renderWithProviders(<Page />);
    expect(screen.getByText("Mockups Gerados")).toBeInTheDocument();
  });

  it("excluir o último item da última página volta para uma página válida", async () => {
    dbState.rows = Array.from({ length: 21 }, (_, i) => makeRow(i + 1));
    dbState.totalCount = 21;

    const { default: Page } = await import("@/pages/mockups/MockupHistoryPage");
    renderWithProviders(<Page />);

    await screen.findByText("Página 1 de 2");
    expect(screen.getAllByTestId("mockup-history-item")).toHaveLength(20);

    // Vai para a última página (1 item) — o botão "próxima" é o último do DOM.
    const botoes = screen.getAllByRole("button");
    fireEvent.click(botoes[botoes.length - 1]);
    await screen.findByText("Página 2 de 2");
    expect(screen.getAllByTestId("mockup-history-item")).toHaveLength(1);

    // Exclui o único item: o total cai para 20 (1 página) e a página 2 deixa de existir.
    fireEvent.click(screen.getByTestId("mockup-history-delete-btn"));

    await waitFor(() =>
      expect(screen.getAllByTestId("mockup-history-item")).toHaveLength(20),
    );
    expect(screen.queryByText("Página 2 de 2")).toBeNull();
  }, 15000);
});
