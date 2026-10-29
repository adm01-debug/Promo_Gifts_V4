import { describe, expect, it } from "vitest";
import {
  lowConnectivityNodes,
  replaceKnowledgeGapMetric,
} from "../../scripts/graphify/postprocess_report.mjs";

describe("relatório Graphify", () => {
  it("métrica de baixa conectividade exclui dependências, configurações e nós estruturais", () => {
  const graph = {
    nodes: [
      { id: "app", label: "buildCatalog", source_file: "src/catalog.ts", file_type: "code", _origin: "ast" },
      { id: "config", label: "vite.config.ts", source_file: "vite.config.ts", file_type: "code" },
      { id: "pkg", label: "react", source_file: "package.json", file_type: "code" },
      { id: "structural", label: "OnlyContained", source_file: "src/catalog.ts", file_type: "code", _origin: "ast" },
      { id: "file", label: "catalog.ts", source_file: "src/catalog.ts", file_type: "code" },
      { id: "qualified-file", label: "edge-functions/voice-agent.test.ts", source_file: "tests/edge-functions/voice-agent.test.ts", file_type: "code" },
      { id: "external", label: "@supabase/supabase-js", source_file: "@supabase/supabase-js", file_type: "code" },
      { id: "workflow", label: "matrix", source_file: ".github/workflows/ci.yml", file_type: "code" },
      { id: "concept", label: "Catalog Domain", source_file: "", file_type: "concept" },
    ],
    links: [{ source: "file", target: "structural", relation: "contains" }],
  };

  const low = lowConnectivityNodes(graph);
    expect(low.map((node) => node.id)).toEqual(["app"]);
  });

  it("substitui o rótulo gerado e preserva o alerta de comunidades finas", () => {
  const graph = {
    nodes: [{ id: "app", label: "buildCatalog", source_file: "src/catalog.ts", file_type: "code" }],
    links: [],
  };
  const report = [
    "## Knowledge Gaps",
    "- **35 isolated node(s):** `generated`",
    "  These have ≤1 connection - possible missing edges. (Counts symbols only.)",
    "- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.",
  ].join("\n");

  const updated = replaceKnowledgeGapMetric(report, graph);
    expect(updated).toMatch(/1 nós de baixa conectividade/);
    expect(updated).toMatch(/2 thin communities/);
    expect(updated).toMatch(/explorar nós de baixa conectividade/);
    expect(updated).not.toMatch(/isolated node\(s\)/);
  });
});
