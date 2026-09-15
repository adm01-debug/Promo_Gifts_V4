/**
 * Cobertura do sumário de KPIs de confiabilidade de fornecedores
 * (src/components/inventory/supplier-reliability/ReliabilityKpiBar.tsx).
 *
 * Contrato: conta fornecedores por banda (high/medium/low/unknown) e soma
 * matchedCount/orphanArrivalsCount/expiredPromisesCount de TODOS os fornecedores,
 * independente da banda.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReliabilityKpiBar } from "@/components/inventory/supplier-reliability/ReliabilityKpiBar";
import type { SupplierReliability } from "@/lib/inventory/supplier-reliability";

const EMPTY_WINDOW = {
  score: null,
  matchedCount: 0,
  pontualityScore: null,
  fulfillmentScore: null,
  avgDelayDays: null,
};

function supplier(overrides: Partial<SupplierReliability> & { supplierId: string }): SupplierReliability {
  return {
    supplierName: overrides.supplierId,
    totalPromises: 0,
    totalArrivals: 0,
    matchedCount: 0,
    orphanArrivalsCount: 0,
    expiredPromisesCount: 0,
    nextPromise: null,
    overall: EMPTY_WINDOW,
    last30d: EMPTY_WINDOW,
    last90d: EMPTY_WINDOW,
    band: "unknown",
    ...overrides,
  };
}

describe("ReliabilityKpiBar", () => {
  it("com lista vazia, renderiza todos os contadores zerados", () => {
    render(<ReliabilityKpiBar suppliers={[]} />);

    // 4 cards (high/medium/low/unknown) — cada um verificado individualmente,
    // não só "existe um 0 em algum lugar do bar" (isso passaria mesmo com 1 de 4
    // bandas zerada e as outras vazando contagem incorreta).
    const highCard = screen.getByText("Confiança Alta").closest("div.min-w-0");
    expect(highCard?.textContent).toContain("0");

    const mediumCard = screen.getByText("Confiança Média").closest("div.min-w-0");
    expect(mediumCard?.textContent).toContain("0");

    const lowCard = screen.getByText("Confiança Baixa").closest("div.min-w-0");
    expect(lowCard?.textContent).toContain("0");

    const unknownCard = screen.getByText("Sem Histórico").closest("div.min-w-0");
    expect(unknownCard?.textContent).toContain("0");
  });

  it("conta fornecedores por banda e soma matches/órfãos/vencidas de todos", () => {
    const suppliers: SupplierReliability[] = [
      supplier({ supplierId: "s1", band: "high", matchedCount: 5, orphanArrivalsCount: 1, expiredPromisesCount: 0 }),
      supplier({ supplierId: "s2", band: "high", matchedCount: 3, orphanArrivalsCount: 0, expiredPromisesCount: 1 }),
      supplier({ supplierId: "s3", band: "medium", matchedCount: 2, orphanArrivalsCount: 0, expiredPromisesCount: 0 }),
      supplier({ supplierId: "s4", band: "low", matchedCount: 1, orphanArrivalsCount: 2, expiredPromisesCount: 3 }),
      supplier({ supplierId: "s5", band: "unknown", matchedCount: 0, orphanArrivalsCount: 0, expiredPromisesCount: 0 }),
    ];
    render(<ReliabilityKpiBar suppliers={suppliers} />);

    // 2 fornecedores 'high' → card "Confiança Alta" mostra 2
    const highCard = screen.getByText("Confiança Alta").closest("div.min-w-0");
    expect(highCard?.textContent).toContain("2");

    const mediumCard = screen.getByText("Confiança Média").closest("div.min-w-0");
    expect(mediumCard?.textContent).toContain("1");

    const lowCard = screen.getByText("Confiança Baixa").closest("div.min-w-0");
    expect(lowCard?.textContent).toContain("1");

    const unknownCard = screen.getByText("Sem Histórico").closest("div.min-w-0");
    expect(unknownCard?.textContent).toContain("1");

    // Totais agregados: matches = 5+3+2+1+0 = 11 · órfãos = 1+0+0+2+0 = 3 · vencidas = 0+1+0+3+0 = 4
    const bar = screen.getByTestId("reliability-kpi-bar");
    expect(bar.textContent).toContain("11");
    expect(bar.textContent).toContain("chegadas pareadas");
    expect(bar.textContent).toContain("3");
    expect(bar.textContent).toContain("chegadas sem");
    expect(bar.textContent).toContain("4");
    expect(bar.textContent).toContain("promessas");
  });
});
