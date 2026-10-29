/**
 * E-14 / BUG-MAGICUP-TIMEOUT-1 — lado do cliente da edge generate-ad-prompt.
 *
 * O default do invokeEdge é 10s (2 tentativas), pouco para a IA gerar os
 * cenários: a chamada esgotava as tentativas mesmo quando a edge responderia.
 * Mesmo padrão do generate-ad-image (useMagicUpGeneration.ts: timeoutMs 60_000).
 * O teste renderiza o PromptGenerator REAL, clica em "Gerar Prompts com IA" e
 * afirma com quais opções o invokeEdge foi chamado.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AI_PROVIDER_TIMEOUT_MS } from "../../supabase/functions/generate-ad-prompt/timeout.ts";

const invokeEdgeMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/edge/safeInvokeCall", () => ({ invokeEdge: invokeEdgeMock }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { PromptGenerator } from "@/components/magic-up/PromptGenerator";

describe("PromptGenerator — tempo limite da chamada generate-ad-prompt (E-14)", () => {
  beforeEach(() => {
    invokeEdgeMock.mockReset();
    invokeEdgeMock.mockResolvedValue({
      data: {
        prompts: [
          { title: "Cena 1", prompt: "Caneca na mesa", category: "lifestyle", mood: "calmo", bestFor: "e-mail" },
        ],
      },
      error: null,
      requestId: "req-1",
    });
  });

  it("chama a edge com o mesmo timeoutMs da edge (60s), não com o default de 10s", async () => {
    render(<PromptGenerator productName="Caneca" onSelectPrompt={vi.fn()} selectedPrompt={null} />);

    fireEvent.click(screen.getByRole("button", { name: /Gerar Prompts com IA/i }));

    await waitFor(() => expect(invokeEdgeMock).toHaveBeenCalledTimes(1));
    const [fnName, options] = invokeEdgeMock.mock.calls[0];
    expect(fnName).toBe("generate-ad-prompt");
    expect(options.body.productName).toBe("Caneca");
    expect(options.timeoutMs).toBe(AI_PROVIDER_TIMEOUT_MS);
    expect(options.timeoutMs).toBeGreaterThan(10_000);

    // Termina o fluxo (resultado exibido) para não deixar estado pendente.
    await screen.findByText(/1 cenários criados pela IA/i);
  });
});
