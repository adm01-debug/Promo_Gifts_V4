import path from 'node:path';

const CODE_EXTENSIONS = new Set([
  '.c', '.cc', '.cpp', '.cs', '.cjs', '.go', '.h', '.hpp', '.java', '.js', '.jsx',
  '.kt', '.kts', '.mjs', '.mts', '.php', '.py', '.rb', '.rs', '.scala', '.sc',
  '.swift', '.ts', '.tsx', '.vb', '.vue', '.svelte', '.zig',
]);
const DEPENDENCY_SEGMENTS = new Set([
  'node_modules', '.pnpm', 'vendor', 'third_party', 'bower_components', 'dist',
  'build', 'coverage', '.cache',
]);
const CONFIG_SEGMENTS = new Set(['.github', '.vscode', '.husky', '.devcontainer']);
const CONFIG_FILE = /^(?:tsconfig(?:\.[^.]+)?\.json|package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|vite\.config\.|vitest\.config\.|playwright\.config\.|eslint\.config\.|postcss\.config\.|tailwind\.config\.|prettier\.config\.|babel\.config\.)/i;

function normalizedSourcePath(value) {
  return String(value ?? '').replaceAll('\\', '/').replace(/^\.\//, '');
}

function isStructuralFileNode(node) {
  const source = normalizedSourcePath(node?.source_file);
  if (!source || node._origin !== 'ast' || node.file_type !== 'code') return false;
  const basename = path.posix.basename(source);
  const expectedId = source.replace(/\.[^.]+$/, '').toLowerCase()
    .replace(/[^\p{L}\p{N}_]+/gu, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return node.label === basename && node.id === expectedId && node.source_location === 'L1';
}

export function exclusionReason(node) {
  const source = normalizedSourcePath(node?.source_file);
  if (!source || node.file_type !== 'code') return 'non-code';
  const segments = source.split('/');
  if (source === 'package.json' && ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'].includes(node.community_name)) {
    return 'dependency';
  }
  if (segments.some((segment) => DEPENDENCY_SEGMENTS.has(segment))) return 'dependency-or-generated-output';
  if (segments.some((segment) => CONFIG_SEGMENTS.has(segment))) return 'configuration';
  const file = segments.at(-1);
  if (CONFIG_FILE.test(file)) return 'configuration';
  if (!CODE_EXTENSIONS.has(path.posix.extname(file).toLowerCase())) return 'non-code';
  return null;
}

export function calculateLowConnectivity(graph) {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.links)) {
    throw new TypeError('Graphify JSON inválido: esperado nodes e links.');
  }

  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const eligible = new Set();
  const excluded = {};
  for (const node of graph.nodes) {
    let reason = exclusionReason(node);
    if (!reason && isStructuralFileNode(node)) reason = 'structural-file-node';
    if (reason) excluded[reason] = (excluded[reason] ?? 0) + 1;
    else eligible.add(node.id);
  }

  // Keep Graphify's structural degree semantics (including file/contains
  // links), but remove dependency, generated-output, config, and non-code
  // nodes and their edges from the measured graph.
  const measuredNeighbors = new Map([...eligible].map((id) => [id, new Set()]));
  const relationByPair = new Map();
  for (const edge of graph.links) {
    const { source, target } = edge;
    if (!eligible.has(source) || !eligible.has(target)) continue;
    if (source === target) {
      measuredNeighbors.get(source).add(target);
    } else {
      measuredNeighbors.get(source).add(target);
      measuredNeighbors.get(target).add(source);
    }
    const key = source < target ? `${source}\0${target}` : `${target}\0${source}`;
    const relations = relationByPair.get(key) ?? [];
    relations.push(edge.relation);
    relationByPair.set(key, relations);
  }

  const low = [];
  for (const id of eligible) {
    const degree = measuredNeighbors.get(id).size;
    if (degree > 1) continue;
    const node = nodes.get(id);
    low.push({ id, label: node.label ?? id, source_file: node.source_file, degree });
  }
  low.sort((a, b) => a.source_file.localeCompare(b.source_file) || a.label.localeCompare(b.label));

  return {
    eligibleNodeCount: eligible.size,
    eligibleEdgeCount: [...relationByPair.keys()].length,
    lowConnectivityCount: low.length,
    excluded,
    sample: low.slice(0, 5),
  };
}

export function replaceKnowledgeGapMetrics(report, metrics) {
  const sectionStart = report.indexOf('## Knowledge Gaps');
  if (sectionStart < 0) throw new Error('GRAPH_REPORT.md não contém a seção Knowledge Gaps.');
  const nextSection = report.indexOf('\n## ', sectionStart + 1);
  const end = nextSection < 0 ? report.length : nextSection;
  const section = report.slice(sectionStart, end);
  const countLabel = metrics.lowConnectivityCount === 1 ? 'nó' : 'nós';
  const lowLine = metrics.lowConnectivityCount > 0
    ? `- **${metrics.lowConnectivityCount} ${countLabel} de baixa conectividade (grau ≤ 1):** ` +
      metrics.sample.map((node) => `\`${node.label}\` (${node.source_file})`).join(', ') +
      (metrics.lowConnectivityCount > metrics.sample.length ? ` (+${metrics.lowConnectivityCount - metrics.sample.length} mais)` : '') +
      `\n  Métrica calculada sobre ${metrics.eligibleNodeCount} nós de código elegíveis, usando as relações do grafo principal para medir o grau; ` +
      'dependências, saídas geradas, arquivos de configuração e conteúdo não relacionado a código foram excluídos da população e das relações medidas.'
    : '- **Nenhum nó de baixa conectividade (grau ≤ 1)** após excluir dependências, saídas geradas, arquivos de configuração e conteúdo não relacionado a código.';

  const lines = section.split('\n');
  const filtered = [];
  let lowLineInserted = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^- \*\*\d+ isolated node\(s\):/.test(line)) {
      filtered.push(lowLine);
      lowLineInserted = true;
      if (lines[i + 1]?.trimStart().startsWith('These have ≤1 connection')) i += 1;
      continue;
    }
    if (/^- \*\*\d+ nós? de baixa conectividade \(grau ≤ 1\):/.test(line)) {
      filtered.push(lowLine);
      lowLineInserted = true;
      if (lines[i + 1]?.trimStart().startsWith('Métrica calculada sobre ')) i += 1;
      continue;
    }
    if (/^- \*\*Nenhum nó de baixa conectividade \(grau ≤ 1\)\*\*/.test(line)) {
      filtered.push(lowLine);
      lowLineInserted = true;
      continue;
    }
    if (/thin communities.*explore isolated nodes/i.test(line)) {
      filtered.push(line
        .replace(/\*\*(\d+) thin communities \(<(\d+) nodes\) omitted from report\*\*/i,
          (_, count, size) => `**${count} ${Number(count) === 1 ? 'comunidade pequena' : 'comunidades pequenas'} (<${size} nós) ${Number(count) === 1 ? 'omitida' : 'omitidas'} do relatório**`)
        .replace(/run `graphify query` to explore isolated nodes\./i, 'use `graphify query` para explorar nós de baixa conectividade.'));
      continue;
    }
    filtered.push(line);
  }
  if (!lowLineInserted) {
    const insertion = filtered.findIndex((line, index) => index > 0 && line.startsWith('- **'));
    if (insertion >= 0) filtered.splice(insertion, 0, lowLine);
    else filtered.push(lowLine);
  }
  return report.slice(0, sectionStart) + filtered.join('\n') + report.slice(end);
}

export function synchronizeSummaryCounts(report, graph) {
  const communityCount = new Set(graph.nodes.map((node) => node.community).filter((value) => value !== undefined)).size;
  const summaryLine = /^- \d+ nodes · \d+ edges · \d+ communities/m;
  const replacement = `- ${graph.nodes.length} nodes · ${graph.links.length} edges · ${communityCount} communities`;
  let next = report.replace(summaryLine, (line) => replacement + line.replace(/^- \d+ nodes · \d+ edges · \d+ communities/, ''));
  const counts = { EXTRACTED: 0, INFERRED: 0, AMBIGUOUS: 0 };
  for (const edge of graph.links) {
    if (edge.confidence in counts) counts[edge.confidence] += 1;
  }
  const total = graph.links.length || 1;
  const percent = (count) => Math.round((count / total) * 100);
  const average = counts.INFERRED
    ? (graph.links.filter((edge) => edge.confidence === 'INFERRED')
      .reduce((sum, edge) => sum + Number(edge.confidence_score ?? 0.5), 0) / counts.INFERRED).toFixed(2)
    : null;
  const extraction = `- Extraction: ${percent(counts.EXTRACTED)}% EXTRACTED · ${percent(counts.INFERRED)}% INFERRED · ` +
    `${percent(counts.AMBIGUOUS)}% AMBIGUOUS · INFERRED: ${counts.INFERRED} edges` +
    (average ? ` (avg confidence: ${average})` : '');
  next = next.replace(/^- Extraction:.*$/m, extraction);
  return next;
}
