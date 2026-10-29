import { describe, expect, it } from 'vitest';
import { calculateLowConnectivity, exclusionReason, replaceKnowledgeGapMetrics, synchronizeSummaryCounts } from '../../scripts/graphify/graph-metrics.mjs';

describe('Graphify low-connectivity metric', () => {
  it('excludes dependencies, config and SQL while retaining source-file structure', () => {
    const graph = {
      nodes: [
        { id: 'file-a', label: 'a.ts', file_type: 'code', source_file: 'src/a.ts', source_location: 'L1' },
        { id: 'alpha', label: 'Alpha', _origin: 'ast', file_type: 'code', source_file: 'src/a.ts', source_location: 'L2' },
        { id: 'vendor', label: 'VendorType', _origin: 'ast', file_type: 'code', source_file: 'node_modules/pkg/index.ts', source_location: 'L2' },
        { id: 'config', label: 'defineConfig', _origin: 'ast', file_type: 'code', source_file: 'vite.config.ts', source_location: 'L1' },
        { id: 'sql', label: 'products', _origin: 'ast', file_type: 'code', source_file: ['supabase', 'migrations', '001.sql'].join('/'), source_location: 'L1' },
        { id: 'scaffold', label: 'Scaffold', _origin: 'ast', file_type: 'code', source_file: 'src/a.ts', source_location: 'L4' },
      ],
      links: [
        { source: 'alpha', target: 'vendor', relation: 'references' },
        { source: 'alpha', target: 'config', relation: 'imports' },
        { source: 'scaffold', target: 'file-a', relation: 'contains' },
      ],
    };
    const metrics = calculateLowConnectivity(graph);
    expect(metrics.eligibleNodeCount).toBe(3);
    expect(metrics.lowConnectivityCount).toBe(3);
    expect(metrics.sample).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'alpha', degree: 0 }),
      expect.objectContaining({ id: 'scaffold', degree: 1 }),
      expect.objectContaining({ id: 'file-a', degree: 1 }),
    ]));
    expect(metrics.excluded).toMatchObject({
      'dependency-or-generated-output': 1,
      configuration: 1,
      'non-code': 1,
    });
  });

  it('uses the required Portuguese label and removes the old isolated-node wording', () => {
    const report = [
      '## Knowledge Gaps',
      '- **1 isolated node(s):** `A`',
      '  These have ≤1 connection - possible missing edges.',
      '- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.',
      '',
      '## Questions',
    ].join('\n');
    const result = replaceKnowledgeGapMetrics(report, {
      lowConnectivityCount: 2,
      eligibleNodeCount: 10,
      sample: [{ label: 'Alpha', source_file: 'src/a.ts' }],
    });
    expect(result).toContain('2 nós de baixa conectividade (grau ≤ 1)');
    expect(result).toContain('para explorar nós de baixa conectividade');
    expect(result).not.toMatch(/isolated node/i);
    expect(result).toContain('1 comunidade pequena');
    expect(result).toContain('## Questions');
  });

  it('classifies configuration and dependency files explicitly', () => {
    expect(exclusionReason({ file_type: 'code', source_file: '.github/workflows/ci.ts', label: 'job' })).toBe('configuration');
    expect(exclusionReason({ file_type: 'code', source_file: 'vendor/pkg/index.ts', label: 'job' })).toBe('dependency-or-generated-output');
    expect(exclusionReason({ file_type: 'code', source_file: 'package.json', community_name: 'dependencies', label: 'react' })).toBe('dependency');
  });

  it('synchronizes summary totals after graph enrichment', () => {
    const report = [
      '## Summary',
      '- 1 nodes · 1 edges · 1 communities (1 shown, 0 thin omitted)',
      '- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 0 edges',
    ].join('\n');
    const graph = {
      nodes: [{ id: 'a', community: 1 }, { id: 'b', community: 1 }, { id: 'c', community: 2 }],
      links: [
        { source: 'a', target: 'b', confidence: 'EXTRACTED' },
        { source: 'b', target: 'c', confidence: 'INFERRED', confidence_score: 0.8 },
      ],
    };
    const result = synchronizeSummaryCounts(report, graph);
    expect(result).toContain('- 3 nodes · 2 edges · 2 communities (1 shown, 0 thin omitted)');
    expect(result).toContain('50% EXTRACTED · 50% INFERRED');
  });
});
