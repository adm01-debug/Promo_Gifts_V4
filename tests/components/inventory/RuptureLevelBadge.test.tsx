/**
 * Cobertura do badge de nível de ruptura de estoque
 * (src/components/inventory/risk/RuptureLevelBadge.tsx).
 *
 * Contrato: 5 níveis, cada um com sua família de cor semântica —
 * RUPTURA/CRÍTICO → destructive · ALERTA/ATENÇÃO → warning · OK → success.
 * O texto renderizado é sempre o próprio literal do nível (sem tradução).
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RuptureLevelBadge } from "@/components/inventory/risk/RuptureLevelBadge";
import type { RuptureLevel } from "@/hooks/stock/useRuptureAlerts";

const COLOR_FAMILY_BY_LEVEL: Record<RuptureLevel, RegExp> = {
  RUPTURA: /destructive/,
  "CRÍTICO": /destructive/,
  ALERTA: /warning/,
  "ATENÇÃO": /warning/,
  OK: /success/,
};

const LEVELS: RuptureLevel[] = ["RUPTURA", "CRÍTICO", "ALERTA", "ATENÇÃO", "OK"];

describe("RuptureLevelBadge", () => {
  for (const level of LEVELS) {
    it(`nível=${level}: renderiza o texto do nível com a família de cor correta`, () => {
      const { container } = render(<RuptureLevelBadge level={level} />);
      expect(screen.getByText(level)).toBeInTheDocument();
      expect(container.querySelector(".font-semibold")?.className).toMatch(
        COLOR_FAMILY_BY_LEVEL[level],
      );
    });
  }

  it("RUPTURA e CRÍTICO compartilham a família destructive (ambos são estados críticos)", () => {
    const { container: c1 } = render(<RuptureLevelBadge level="RUPTURA" />);
    const { container: c2 } = render(<RuptureLevelBadge level="CRÍTICO" />);
    expect(c1.querySelector(".font-semibold")?.className).toMatch(/destructive/);
    expect(c2.querySelector(".font-semibold")?.className).toMatch(/destructive/);
  });

  it("aceita className extra sem descartar as classes base", () => {
    const { container } = render(<RuptureLevelBadge level="OK" className="ml-1" />);
    const badge = container.querySelector(".font-semibold");
    expect(badge?.className).toMatch(/ml-1/);
    expect(badge?.className).toMatch(/tracking-wide/);
  });
});
