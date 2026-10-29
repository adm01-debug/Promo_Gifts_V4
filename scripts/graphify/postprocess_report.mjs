#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EXCLUDED_BASENAMES = new Set([
  "package.json", "package-lock.json", "npm-shrinkwrap.json", "bun.lock", "bun.lockb",
  "pnpm-lock.yaml", "yarn.lock", "deno.lock", "tsconfig.json", "tsconfig.app.json",
  "tsconfig.node.json", "components.json", "settings.json", "extensions.json",
]);
const EXCLUDED_DIRS = [
  ".github/", ".husky/", ".storybook/", ".vscode/", ".devcontainer/",
  "node_modules/", "vendor/", "dist/", "coverage/",
];
const EXCLUDED_CONFIG_NAMES = [
  /^.*\.config\.[cm]?[jt]sx?$/i, /^vite\.config\./i, /^vitest\.config\./i,
  /^playwright\.config\./i, /^eslint\.config\./i, /^tailwind\.config\./i,
  /^postcss\.config\./i, /^docker-compose(?:\..+)?$/i, /^Dockerfile(?:\..+)?$/i,
  /^\.env(?:\..+)?$/i, /^\.npmrc$/i, /^\.nvmrc$/i, /^\.editorconfig$/i,
];

function isConfigurationOrDependency(node) {
  const source = String(node.source_file ?? "").replaceAll("\\", "/");
  const basename = source.split("/").at(-1) ?? "";
  return EXCLUDED_BASENAMES.has(basename) ||
    EXCLUDED_DIRS.some((directory) => source.includes(directory)) ||
    EXCLUDED_CONFIG_NAMES.some((pattern) => pattern.test(basename)) ||
    node._origin === "dependency" || node._origin === "config";
}

function isRealSymbol(node) {
  const source = String(node.source_file ?? "").replaceAll("\\", "/");
  const label = String(node.label ?? "");
  if (!source || !label || node.file_type === "concept" || node.file_type === "rationale") return false;
  if (!path.extname(source)) return false;
  const basename = source.split("/").at(-1) ?? "";
  const stem = basename.replace(/\.[^.]+$/, "");
  if (label === basename || label === stem || source === label || source.endsWith(`/${label}`)) return false;
  if (label.startsWith(".") && label.endsWith("()")) return false;
  return true;
}

export function lowConnectivityNodes(graph) {
  const nodes = graph.nodes ?? [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = new Map(nodes.map((node) => [node.id, []]));
  for (const link of graph.links ?? []) {
    if (!adjacency.has(link.source) || !adjacency.has(link.target)) continue;
    adjacency.get(link.source).push(link);
    if (link.target !== link.source) adjacency.get(link.target).push(link);
  }

  return [...byId.values()].filter((node) => {
    const edges = adjacency.get(node.id) ?? [];
    if (edges.length > 1 || !isRealSymbol(node) || isConfigurationOrDependency(node)) return false;
    const structuralOnly = edges.length === 1 &&
      edges[0].relation === "contains" && node._origin === "ast";
    return !structuralOnly;
  });
}

export function replaceKnowledgeGapMetric(report, graph) {
  const low = lowConnectivityNodes(graph);
  const examples = low.slice(0, 5).map((node) => `\`${node.label}\``).join(", ");
  const suffix = low.length > 5 ? ` (+${low.length - 5} mais)` : "";
  const replacement = [
    `- **${low.length} nós de baixa conectividade (≤1 relação):** ${examples || "nenhum"}${suffix}`,
    "  Exclui manifests/lockfiles de dependências, configurações e nós estruturais ligados apenas por `contains`.",
  ].join("\n");
  const pattern = /^- \*\*\d+ isolated node\(s\):\*\*.*\n  These have ≤1 connection[^\n]*/m;
  if (!pattern.test(report)) {
    throw new Error("Knowledge Gaps não contém a métrica Graphify esperada; relatório não foi alterado.");
  }
  return report
    .replace(pattern, replacement)
    .replaceAll("run `graphify query` to explore isolated nodes", "use `graphify query` para explorar nós de baixa conectividade");
}

function main() {
  const root = process.cwd();
  const graphPath = path.resolve(root, "graphify-out/graph.json");
  const reportPath = path.resolve(root, "graphify-out/GRAPH_REPORT.md");
  if (!fs.existsSync(graphPath) || !fs.existsSync(reportPath)) {
    throw new Error("Grafo/relatório não encontrado. Execute Graphify update e cluster-only antes.");
  }
  const graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));
  const report = fs.readFileSync(reportPath, "utf8");
  const updated = replaceKnowledgeGapMetric(report, graph);
  fs.writeFileSync(reportPath, updated);
  console.log(JSON.stringify({
    low_connectivity_symbols: lowConnectivityNodes(graph).length,
    excluded_sources: "dependency manifests/lockfiles, configuration files and directories",
    report: path.relative(root, reportPath),
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
