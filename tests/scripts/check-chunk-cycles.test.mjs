import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditChunkCycles } from '../../scripts/check-chunk-cycles.mjs';

const temporaryRoots = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'promo-gifts-chunk-cycles-'));
  temporaryRoots.push(root);
  mkdirSync(root, { recursive: true });
  for (const [filename, contents] of Object.entries(files)) {
    writeFileSync(join(root, filename), contents, 'utf8');
  }
  return root;
}

describe('production chunk cycle gate', () => {
  it('accepts an acyclic static import graph', async () => {
    const root = fixture({
      'entry-A1b2c3d4.js': 'import { value } from "./vendor-E5f6g7h8.js"; console.log(value);',
      'vendor-E5f6g7h8.js': 'export const value = 1;',
    });

    await expect(auditChunkCycles(root)).resolves.toEqual([]);
  });

  it('rejects the ComparePage to charts-vendor cycle seen in production', async () => {
    const root = fixture({
      'ComparePage-A1b2c3d4.js':
        'import { chart } from "./charts-vendor-E5f6g7h8.js"; export const route = chart;',
      'charts-vendor-E5f6g7h8.js':
        'import { route } from "./ComparePage-A1b2c3d4.js"; export const chart = () => route;',
    });

    const cycles = await auditChunkCycles(root);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toEqual(['ComparePage-A1b2c3d4.js', 'charts-vendor-E5f6g7h8.js']);
  });

  it('ignores dynamic imports because they do not create eager evaluation cycles', async () => {
    const root = fixture({
      'route-A1b2c3d4.js': 'export const load = () => import("./lazy-E5f6g7h8.js");',
      'lazy-E5f6g7h8.js': 'import { load } from "./route-A1b2c3d4.js"; export { load };',
    });

    await expect(auditChunkCycles(root)).resolves.toEqual([]);
  });
});
