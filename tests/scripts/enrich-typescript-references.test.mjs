import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";
import { extractTypeReferenceEdges } from "../../scripts/graphify/enrich_typescript_references.mjs";

const require = createRequire(import.meta.url);
const ts = require("typescript");

describe("referências de tipo no Graphify", () => {
  let root;

  afterEach(() => {
    if (root) fs.rmSync(root, { recursive: true, force: true });
    root = undefined;
  });

  it("extrai e deduplica referências a interfaces locais usando a TypeScript Compiler API", () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "graphify-types-"));
    fs.mkdirSync(path.join(root, "src"));

  fs.writeFileSync(
    path.join(root, "src", "types.ts"),
    "export interface Config { title: string }\nexport type Payload = { config: Config };\n",
  );
  fs.writeFileSync(
    path.join(root, "src", "main.ts"),
    'import { Config as AppConfig, Payload } from "./types";\nexport function create(config: AppConfig): AppConfig { const payload: Payload = { config }; return payload.config; }\n',
  );

  const files = [path.join(root, "src", "types.ts"), path.join(root, "src", "main.ts")];
  const program = ts.createProgram(files, {
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    target: ts.ScriptTarget.ES2022,
    strict: true,
    noEmit: true,
  });
  const graphNodes = [
    { id: "src_main_create", label: "create", source_file: "src/main.ts", file_type: "code" },
    { id: "src_types_config", label: "Config", source_file: "src/types.ts", file_type: "code" },
    { id: "src_types_payload", label: "Payload", source_file: "src/types.ts", file_type: "code" },
  ];

  const edges = extractTypeReferenceEdges({ root, program, graphNodes });

    expect(edges).toHaveLength(3);
  const createToConfig = edges.find((edge) => edge.source === "src_main_create" && edge.target === "src_types_config");
  const createToPayload = edges.find((edge) => edge.source === "src_main_create" && edge.target === "src_types_payload");
  const payloadToConfig = edges.find((edge) => edge.source === "src_types_payload" && edge.target === "src_types_config");
    expect(createToConfig).toBeDefined();
    expect(createToPayload).toBeDefined();
    expect(payloadToConfig).toBeDefined();
    expect(createToConfig.relation).toBe("references_type");
    expect(createToConfig.context).toMatch(/Config; 2 referência\(s\)/);
    expect(createToPayload.context).toMatch(/Payload; 1 referência\(s\)/);
    expect(payloadToConfig.context).toMatch(/Config; 1 referência\(s\)/);
    expect(createToConfig._origin).toBe("typescript-compiler-api");
  });
});
