#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { calculateLowConnectivity, replaceKnowledgeGapMetrics, synchronizeSummaryCounts } from './graph-metrics.mjs';

const graphPath = process.argv[2] ?? 'graphify-out/graph.json';
const reportPath = process.argv[3] ?? 'graphify-out/GRAPH_REPORT.md';
// graphify-out/ é gitignored: sem o grafo o script soltava um stack trace cru de ENOENT.
for (const [label, file] of [['grafo', graphPath], ['relatório', reportPath]]) {
  if (!existsSync(file)) {
    console.error(`❌ ${label} não encontrado: ${file}. Gere com: graphify update .`);
    process.exit(2);
  }
}
const graph = JSON.parse(readFileSync(graphPath, 'utf8'));
const report = readFileSync(reportPath, 'utf8');
const metrics = calculateLowConnectivity(graph);
const updated = synchronizeSummaryCounts(replaceKnowledgeGapMetrics(report, metrics), graph);
writeFileSync(reportPath, updated);
console.log(`[graphify-report] ${metrics.lowConnectivityCount} nós de baixa conectividade; ` +
  `${metrics.eligibleNodeCount} nós de código elegíveis; exclusões: ${JSON.stringify(metrics.excluded)}`);
