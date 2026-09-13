/**
 * Cobertura dedicada de aggregateReliability() (src/lib/inventory/supplier-reliability/aggregate.ts)
 * para os cenários que o fuzz (tests/supplierReliability.fuzz.test.ts) não força
 * deterministicamente: múltiplas promessas futuras concorrentes no mesmo fornecedor,
 * e os fallbacks defensivos de nome/data ausentes.
 */
import { describe, it, expect } from "vitest";
import { aggregateReliability } from "@/lib/inventory/supplier-reliability/aggregate";
import type {
  ActualArrival,
  PromisedReplenishment,
} from "@/lib/inventory/supplier-reliability/types";

const NOW = new Date("2026-09-13T12:00:00.000Z");

function promise(
  overrides: Partial<PromisedReplenishment> & { id: string },
): PromisedReplenishment {
  return {
    sourceId: "src-1",
    supplierId: "sup-1",
    variantId: "var-1",
    slot: 1,
    promisedDate: "2026-10-01",
    promisedQuantity: 10,
    observedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("aggregateReliability — nextPromise entre múltiplas promessas futuras", () => {
  it("escolhe a promessa futura de data mais próxima quando há mais de uma pendente", () => {
    const promises: PromisedReplenishment[] = [
      promise({ id: "p-late", promisedDate: "2026-12-25" }),
      promise({ id: "p-soon", promisedDate: "2026-09-20" }),
      promise({ id: "p-mid", promisedDate: "2026-10-15" }),
    ];
    const result = aggregateReliability({
      promises,
      arrivals: [],
      suppliers: [{ id: "sup-1", name: "Fornecedor A" }],
      now: NOW,
    });
    const supplier = result.bySupplier.find((s) => s.supplierId === "sup-1");
    expect(supplier?.nextPromise?.id).toBe("p-soon");
  });

  it("ignora promessas já consumidas por um match ao escolher a próxima futura", () => {
    const arrivals: ActualArrival[] = [
      {
        id: 1,
        sourceId: "src-1",
        supplierId: "sup-1",
        variantId: "var-1",
        receivedQuantity: 10,
        receivedAt: "2026-09-20",
      },
    ];
    const promises: PromisedReplenishment[] = [
      promise({ id: "p-soon", promisedDate: "2026-09-20" }),
      promise({ id: "p-mid", promisedDate: "2026-10-15" }),
    ];
    const result = aggregateReliability({
      promises,
      arrivals,
      suppliers: [{ id: "sup-1", name: "Fornecedor A" }],
      now: NOW,
    });
    const supplier = result.bySupplier.find((s) => s.supplierId === "sup-1");
    // p-soon já foi consumida pelo match (mesma janela/quantidade) — a próxima
    // pendente deve ser p-mid, não a já cumprida.
    expect(supplier?.nextPromise?.id).toBe("p-mid");
  });
});

describe("aggregateReliability — fallbacks defensivos", () => {
  it("fornecedor presente em promises/arrivals mas ausente da tabela suppliers usa '(sem nome)'", () => {
    const result = aggregateReliability({
      promises: [promise({ id: "p-1", supplierId: "sup-orfao" })],
      arrivals: [],
      suppliers: [], // nenhum metadata — fornecedor "órfão"
      now: NOW,
    });
    const supplier = result.bySupplier.find((s) => s.supplierId === "sup-orfao");
    expect(supplier?.supplierName).toBe("(sem nome)");
  });

  it("ordena por score desc; fornecedores 'unknown' (sem matches) vão para o fim", () => {
    const arrivals: ActualArrival[] = [
      {
        id: 1,
        sourceId: "src-bom",
        supplierId: "sup-bom",
        variantId: "var-1",
        receivedQuantity: 10,
        receivedAt: "2026-09-01",
      },
    ];
    const promises: PromisedReplenishment[] = [
      promise({ id: "p-bom", sourceId: "src-bom", supplierId: "sup-bom", promisedDate: "2026-09-01" }),
      promise({ id: "p-sem-match", sourceId: "src-sem", supplierId: "sup-sem-match", promisedDate: "2026-12-01" }),
    ];
    const result = aggregateReliability({
      promises,
      arrivals,
      suppliers: [
        { id: "sup-bom", name: "Fornecedor Bom" },
        { id: "sup-sem-match", name: "Fornecedor Sem Match" },
      ],
      now: NOW,
    });
    const ids = result.bySupplier.map((s) => s.supplierId);
    // sup-sem-match nunca teve chegada pareada → overall.score=null → band='unknown' → deve ir por último.
    expect(ids[ids.length - 1]).toBe("sup-sem-match");
    expect(result.bySupplier.find((s) => s.supplierId === "sup-sem-match")?.band).toBe("unknown");
  });
});
