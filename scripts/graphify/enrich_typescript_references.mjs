#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);
const TYPE_DECLARATIONS = new Set([
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.EnumDeclaration,
  ts.SyntaxKind.InterfaceDeclaration,
  ts.SyntaxKind.TypeAliasDeclaration,
]);

function projectFiles(root) {
  return execFileSync("git", ["ls-files", "-z", "--", "*.ts", "*.tsx", "*.mts", "*.cts"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  })
    .split("\0")
    .filter(Boolean)
    .map((file) => path.resolve(root, file))
    .filter((file) => fs.existsSync(file));
}

function relativeSource(root, absolutePath) {
  return path.relative(root, absolutePath).split(path.sep).join("/");
}

function normalizedLabel(label) {
  return String(label).replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();
}

function buildNodeIndex(root, graphNodes) {
  const index = new Map();
  for (const node of graphNodes) {
    if (!node.source_file || !node.label) continue;
    const key = `${node.source_file}\0${normalizedLabel(node.label)}`;
    const candidates = index.get(key) ?? [];
    candidates.push(node);
    index.set(key, candidates);
  }
  return (sourceFile, label, line) => {
    const source = relativeSource(root, sourceFile);
    const candidates = index.get(`${source}\0${normalizedLabel(label)}`) ?? [];
    if (!candidates.length) return undefined;
    return candidates.reduce((best, candidate) => {
      if (!best) return candidate;
      const getLine = (node) => Number(/L(\d+)/.exec(node.source_location ?? "")?.[1] ?? 0);
      return Math.abs(getLine(candidate) - line) < Math.abs(getLine(best) - line) ? candidate : best;
    }, undefined);
  };
}

function declarationName(tsNode) {
  const name = tsNode.name;
  return name && (ts.isIdentifier(name) || ts.isStringLiteral(name)) ? name.text : undefined;
}

function ownerGraphNode(tsNode, findNode) {
  let current = tsNode.parent;
  while (current) {
    if (
      ts.isFunctionDeclaration(current) ||
      ts.isClassDeclaration(current) ||
      ts.isInterfaceDeclaration(current) ||
      ts.isTypeAliasDeclaration(current) ||
      ts.isEnumDeclaration(current) ||
      ts.isMethodDeclaration(current) ||
      ts.isPropertyDeclaration(current) ||
      ts.isVariableDeclaration(current)
    ) {
      const name = declarationName(current);
      if (name) {
        const sourceFile = current.getSourceFile();
        const line = sourceFile.getLineAndCharacterOfPosition(current.getStart()).line + 1;
        const graphNode = findNode(sourceFile.fileName, name, line);
        if (graphNode) return graphNode;
      }
    }
    current = current.parent;
  }
  return undefined;
}

function typeSymbolAt(typeNode, checker) {
  let symbol = checker.getSymbolAtLocation(typeNode.typeName);
  if (!symbol) return undefined;
  if (symbol.flags & ts.SymbolFlags.Alias) {
    try {
      symbol = checker.getAliasedSymbol(symbol);
    } catch {
      return undefined;
    }
  }
  const declarations = (symbol.declarations ?? []).filter((declaration) =>
    TYPE_DECLARATIONS.has(declaration.kind),
  );
  return declarations.length ? { symbol, declarations } : undefined;
}

export function extractTypeReferenceEdges({ root, program, graphNodes }) {
  const checker = program.getTypeChecker();
  const findNode = buildNodeIndex(root, graphNodes);
  const counts = new Map();

  for (const sourceFile of program.getSourceFiles()) {
    const absolutePath = path.resolve(sourceFile.fileName);
    if (!absolutePath.startsWith(`${root}${path.sep}`)) continue;
    if (!SOURCE_EXTENSIONS.has(path.extname(absolutePath).toLowerCase())) continue;
    const sourcePath = relativeSource(root, absolutePath);

    function visit(node) {
      if (ts.isTypeReferenceNode(node)) {
        const ownerNode = ownerGraphNode(node, findNode);
        const resolved = typeSymbolAt(node, checker);
        if (ownerNode && resolved) {
          const targets = resolved.declarations
            .map((declaration) => {
              const targetName = declarationName(declaration);
              if (!targetName) return undefined;
              const targetLine = declaration.getSourceFile().getLineAndCharacterOfPosition(
                declaration.getStart(),
              ).line + 1;
              return findNode(declaration.getSourceFile().fileName, targetName, targetLine);
            })
            .filter(Boolean);
          for (const target of targets) {
            if (ownerNode.id === target.id) continue;
            const key = `${ownerNode.id}\0${target.id}`;
            const entry = counts.get(key) ?? {
              source: ownerNode.id,
              target: target.id,
              label: resolved.symbol.getName(),
              source_file: sourcePath,
              source_location: `L${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1}`,
              count: 0,
            };
            entry.count += 1;
            counts.set(key, entry);
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  }

  return [...counts.values()].map((entry) => ({
    source: entry.source,
    target: entry.target,
    relation: "references_type",
    _origin: "typescript-compiler-api",
    confidence: "EXTRACTED",
    confidence_score: 1.0,
    context: `type/interface ${entry.label}; ${entry.count} referência(s)`,
    source_file: entry.source_file,
    source_location: entry.source_location,
    weight: 1.0,
  }));
}

function getRoot() {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
}

export function enrichGraph({ root, graphPath, dryRun = false }) {
  const graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));
  const configPath = ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.app.json") ??
    ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.json");
  if (!configPath) throw new Error("Nenhum tsconfig do projeto foi encontrado.");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
  const files = projectFiles(root);
  const program = ts.createProgram(files, { ...parsed.options, noEmit: true, skipLibCheck: true });
  const edges = extractTypeReferenceEdges({ root, program, graphNodes: graph.nodes ?? [] });

  graph.links = (graph.links ?? []).filter((edge) => edge._origin !== "typescript-compiler-api");
  const existing = new Set(graph.links.map((edge) => `${edge.source}\0${edge.target}\0${edge.relation}`));
  const unique = edges.filter((edge) => {
    const key = `${edge.source}\0${edge.target}\0${edge.relation}`;
    if (existing.has(key)) return false;
    existing.add(key);
    return true;
  });
  graph.links.push(...unique);

  if (!dryRun) fs.writeFileSync(graphPath, `${JSON.stringify(graph)}\n`);
  return {
    files: files.length,
    graph_nodes: graph.nodes?.length ?? 0,
    type_reference_edges: unique.length,
    graph_path: graphPath,
    dry_run: dryRun,
  };
}

function cli() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const graphArg = args.indexOf("--graph");
  const root = getRoot();
  const graphPath = graphArg >= 0 ? path.resolve(args[graphArg + 1]) : path.join(root, "graphify-out", "graph.json");
  if (!fs.existsSync(graphPath)) throw new Error(`Grafo não encontrado: ${graphPath}. Execute graphify update antes.`);
  const result = enrichGraph({ root, graphPath, dryRun });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    cli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
