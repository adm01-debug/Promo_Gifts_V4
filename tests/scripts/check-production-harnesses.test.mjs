import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { auditProductionHarnesses } from '../../scripts/check-production-harnesses.mjs';

const temporaryRoots = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'promo-gifts-production-harnesses-'));
  temporaryRoots.push(root);
  for (const [relativePath, contents] of Object.entries(files)) {
    const absolutePath = join(root, relativePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, contents, 'utf8');
  }
  return root;
}

describe('production harness bundle gate', () => {
  it('accepts a production bundle without dev-only routes or chunks', async () => {
    const root = fixture({
      'index.html': '<script src="/assets/app.js"></script>',
      'assets/app.js': 'console.log("production")',
    });
    await expect(auditProductionHarnesses(root)).resolves.toEqual([]);
  });

  it('rejects leaked __test routes and harness chunk names', async () => {
    const root = fixture({
      'assets/app.js': 'const route="/__test/dialog";',
      'assets/ColorSwatchesHarness-deadbeef.js': 'export default {};',
    });
    const violations = await auditProductionHarnesses(root);
    expect(violations).toEqual(
      expect.arrayContaining([
        expect.stringContaining('/__test/'),
        expect.stringContaining('ColorSwatchesHarness'),
      ]),
    );
  });
});
