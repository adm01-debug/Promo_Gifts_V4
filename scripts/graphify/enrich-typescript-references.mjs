#!/usr/bin/env node
import path from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const REPO_ROOT = process.cwd();
const GRAPH_PATH = process.argv[2] ?? 'graphify-out/graph.json';
const CONFIG_PATH = process.argv[3] ?? 'tsconfig.app.json';
const TYPE_DECLARATIONS = new Set([
  ts.SyntaxKind.InterfaceDeclaration,
  ts.SyntaxKind.TypeAliasDeclaration,
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.EnumDeclaration,
]);

function normalizePath(file, root = REPO_ROOT) {
  const value = String(file).replaceAll('\\', '/');
  return path.isAbsolute(value)
    ? path.relative(root, value).split(path.sep).join('/')
    : value.replace(/^\.\//, '');
}

function normalizeId(value) {
  return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}_]+/gu, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function graphSymbolId(relativeFile, symbolName) {
  const stem = relativeFile.replace(/\.[^.]+$/, '');
  return normalizeId(`${stem}_${symbolName}`);
}

function graphFileId(relativeFile) {
  return normalizeId(relativeFile.replace(/\.[^.]+$/, ''));
}

function typeSymbolAt(checker, location) {
  if (!location) return undefined;
  let symbol = checker.getSymbolAtLocation(location);
  if (symbol && (symbol.flags & ts.SymbolFlags.Alias)) {
    try { symbol = checker.getAliasedSymbol(symbol); } catch { return undefined; }
  }
  return symbol;
}

function referenceLocations(node) {
  const found = [];
  const visit = (child) => {
    if (ts.isTypeReferenceNode(child)) found.push(child.typeName);
    else if (ts.isExpressionWithTypeArguments(child)) found.push(child.expression);
    else if (ts.isTypeQueryNode(child)) found.push(child.exprName);
    else if (ts.isImportTypeNode(child) && child.qualifier) found.push(child.qualifier);
    ts.forEachChild(child, visit);
  };
  visit(node);
  return found;
}

function graphNodeIndex(graph) {
  const byFileAndLabel = new Map();
  const fileNodeBySource = new Map();
  const byId = new Map();
  for (const node of graph.nodes) {
    byId.set(node.id, node);
    const source = node.source_file && normalizePath(node.source_file);
    if (!source) continue;
    const key = `${source}\0${node.label}`;
    if (!byFileAndLabel.has(key)) byFileAndLabel.set(key, []);
    byFileAndLabel.get(key).push(node);
    if (node.label === path.posix.basename(source) && node.id === graphFileId(source) &&
        node.source_location === 'L1' && !fileNodeBySource.has(source)) {
      fileNodeBySource.set(source, node);
    }
  }
  return { byFileAndLabel, fileNodeBySource, byId };
}

function declarationNode(graph, indexes, declaration, name, root) {
  const source = normalizePath(declaration.getSourceFile().fileName, root);
  const line = declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1;
  const key = `${source}\0${name}`;
  const existing = indexes.byFileAndLabel.get(key)?.find((node) => node.source_location === `L${line}`);
  if (existing) return existing;
  const id = graphSymbolId(source, name);
  const collision = indexes.byId.get(id);
  if (collision && (normalizePath(collision.source_file) !== source || collision.label !== name)) {
    return undefined;
  }
  if (collision) return collision;
  const node = {
    id,
    label: name,
    _origin: 'typescript-compiler-api',
    file_type: 'code',
    norm_label: normalizeId(name),
    source_file: source,
    source_location: `L${line}`,
  };
  graph.nodes.push(node);
  indexes.byId.set(id, node);
  indexes.byFileAndLabel.set(key, [node]);
  return node;
}

export function enrichGraphWithTypeReferences(graph, program, { root = REPO_ROOT } = {}) {
  if (!Array.isArray(graph?.nodes) || !Array.isArray(graph?.links)) {
    throw new TypeError('Graphify JSON inválido: esperado nodes e links.');
  }
  const checker = program.getTypeChecker();
  const indexes = graphNodeIndex(graph);
  const edgeByPair = new Map();
  let skippedExternal = 0;
  let skippedUnmappedSources = 0;
  let skippedUnmappedTargets = 0;
  const rootResolved = path.resolve(root);

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue;
    const sourceAbsolute = path.resolve(sourceFile.fileName);
    const sourceRelative = path.relative(rootResolved, sourceAbsolute);
    if (sourceRelative.startsWith('..') || path.isAbsolute(sourceRelative)) continue;
    if (!/\.(?:ts|tsx|mts|cts)$/i.test(sourceRelative)) continue;
    if (sourceRelative.split(path.sep).includes('node_modules')) continue;
    const source = normalizePath(sourceRelative);
    const fromNode = indexes.fileNodeBySource.get(source);
    if (!fromNode) {
      if (referenceLocations(sourceFile).length > 0) skippedUnmappedSources += 1;
      continue;
    }
    for (const reference of referenceLocations(sourceFile)) {
      const symbol = typeSymbolAt(checker, reference);
      if (!symbol) continue;
      for (const declaration of symbol.declarations ?? []) {
        if (!TYPE_DECLARATIONS.has(declaration.kind) || !('name' in declaration) || !declaration.name) continue;
        const targetFile = path.resolve(declaration.getSourceFile().fileName);
        if (targetFile === sourceAbsolute) continue;
        const relativeTarget = path.relative(rootResolved, targetFile);
        if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget) || relativeTarget.includes('node_modules')) {
          skippedExternal += 1;
          continue;
        }
        const targetName = declaration.name.text;
        const targetNode = declarationNode(graph, indexes, declaration, targetName, rootResolved);
        if (!targetNode) { skippedUnmappedTargets += 1; continue; }
        if (fromNode.id === targetNode.id) continue;
        const key = `${fromNode.id}\0${targetNode.id}`;
        const entry = edgeByPair.get(key) ?? { source: fromNode.id, target: targetNode.id, name: targetName, count: 0, line: 0 };
        entry.count += 1;
        if (!entry.line) entry.line = sourceFile.getLineAndCharacterOfPosition(reference.getStart()).line + 1;
        edgeByPair.set(key, entry);
      }
    }
  }

  const existing = new Set(graph.links
    .filter((edge) => edge.relation === 'references_type')
    .map((edge) => `${edge.source}\0${edge.target}`));
  let added = 0;
  for (const edge of edgeByPair.values()) {
    const key = `${edge.source}\0${edge.target}`;
    if (existing.has(key)) continue;
    graph.links.push({
      source: edge.source,
      target: edge.target,
      relation: 'references_type',
      _origin: 'typescript-compiler-api',
      confidence: 'EXTRACTED',
      confidence_score: 1,
      context: `type/interface ${edge.name}; ${edge.count} referência(s)`,
      source_file: indexes.byId.get(edge.source)?.source_file,
      source_location: `L${edge.line}`,
      weight: 1,
    });
    existing.add(key);
    added += 1;
  }
  return { candidates: edgeByPair.size, added, skippedExternal, skippedUnmappedSources, skippedUnmappedTargets };
}

function createProgram(configPath) {
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(path.resolve(configPath)));
  if (parsed.errors.length) throw new Error(ts.flattenDiagnosticMessageText(parsed.errors[0].messageText, '\n'));
  return ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const graph = JSON.parse(readFileSync(GRAPH_PATH, 'utf8'));
  const program = createProgram(CONFIG_PATH);
  const result = enrichGraphWithTypeReferences(graph, program);
  writeFileSync(GRAPH_PATH, `${JSON.stringify(graph)}\n`);
  console.log(`[graphify-types] ${result.added} arestas references_type adicionadas; ` +
    `${result.candidates} pares encontrados; ${result.skippedExternal} referências externas ignoradas; ` +
    `${result.skippedUnmappedSources} arquivos de origem sem nó no mapa; ` +
    `${result.skippedUnmappedTargets} declarações internas sem nó mapeável.`);
}
