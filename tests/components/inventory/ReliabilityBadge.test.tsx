/**
 * Cobertura do badge visual de confiabilidade de fornecedor
 * (src/components/inventory/supplier-reliability/ReliabilityBadge.tsx).
 *
 * Contrato:
 *  - 4 bandas: high (verde/emerald) · medium (âmbar) · low (rosa/destrutivo) · unknown (cinza)
 *  - score=null renderiza "—" em vez do número; score preenchido aparece no título
 *    ("Confiabilidade <label> — score N/100") e no corpo do badge.
 *  - size="sm" aplica classes de padding/fonte menores; default "md" usa as maiores.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReliabilityBadge } from "@/components/inventory/supplier-reliability/ReliabilityBadge";
import type { ConfidenceBand } from "@/lib/inventory/supplier-reliability";

const LABEL_BY_BAND: Record<ConfidenceBand, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
  unknown: "Sem dados",
};

const COLOR_FAMILY_BY_BAND: Record<ConfidenceBand, RegExp> = {
  high: /emerald-/,
  medium: /amber-/,
  low: /rose-/,
  unknown: /bg-muted\b/,
};

const BANDS: ConfidenceBand[] = ["high", "medium", "low", "unknown"];

describe("ReliabilityBadge", () => {
  for (const band of BANDS) {
    it(`banda=${band}: renderiza testid, label e família de cor corretos`, () => {
      render(<ReliabilityBadge band={band} score={72} />);
      const badge = screen.getByTestId(`reliability-badge-${band}`);
      expect(badge.className).toMatch(COLOR_FAMILY_BY_BAND[band]);
      expect(badge).toHaveTextContent(LABEL_BY_BAND[band]);
    });
  }

  it("score preenchido: mostra o número e inclui o score no title", () => {
    render(<ReliabilityBadge band="high" score={91} />);
    const badge = screen.getByTestId("reliability-badge-high");
    expect(badge).toHaveTextContent("91");
    expect(badge.getAttribute("title")).toBe("Confiabilidade Alta — score 91/100");
  });

  it("score=null: mostra travessão em vez de número e omite o score do title", () => {
    render(<ReliabilityBadge band="unknown" score={null} />);
    const badge = screen.getByTestId("reliability-badge-unknown");
    expect(badge).toHaveTextContent("—");
    expect(badge.getAttribute("title")).toBe("Confiabilidade Sem dados");
  });

  it('size="sm" aplica classes compactas; default ("md") aplica as maiores', () => {
    const { unmount } = render(<ReliabilityBadge band="medium" score={60} size="sm" />);
    expect(screen.getByTestId("reliability-badge-medium").className).toMatch(/text-\[11px\]/);
    unmount();

    render(<ReliabilityBadge band="medium" score={60} />);
    expect(screen.getByTestId("reliability-badge-medium").className).toMatch(/text-xs\b/);
  });

  it("aceita className extra sem descartar as classes base", () => {
    render(<ReliabilityBadge band="low" score={10} className="ml-2 shrink-0" />);
    const badge = screen.getByTestId("reliability-badge-low");
    expect(badge.className).toMatch(/ml-2/);
    expect(badge.className).toMatch(/rounded-full/);
  });
});
