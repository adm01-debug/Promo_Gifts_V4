import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { auditPptxImageParserExposure } from '../../scripts/check-pptx-image-parser-exposure.mjs';

const temporaryRoots = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function fixture({ browserMapping = false, adapter = '', extraFiles = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'promo-gifts-pptx-parser-'));
  temporaryRoots.push(root);
  const files = {
    'node_modules/pptxgenjs/package.json': JSON.stringify({
      name: 'pptxgenjs',
      browser: { 'image-size': browserMapping },
    }),
    'src/lib/bi/pptxGenerator.ts':
      adapter || "import PptxGenJS from 'pptxgenjs';\nnew PptxGenJS().addText('safe');\n",
    ...extraFiles,
  };
  for (const [relativePath, contents] of Object.entries(files)) {
    const absolutePath = join(root, relativePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, contents, 'utf8');
  }
  return root;
}

describe('PPTX vulnerable image parser exposure gate', () => {
  it('accepts the reviewed browser-only text and shape adapter', async () => {
    await expect(auditPptxImageParserExposure(fixture())).resolves.toEqual([]);
  });

  it('rejects a dependency version that enables image-size in browser builds', async () => {
    const violations = await auditPptxImageParserExposure(fixture({ browserMapping: true }));
    expect(violations).toContain('pptxgenjs must disable image-size in its browser mapping');
  });

  it('rejects image embedding in the reviewed adapter', async () => {
    const root = fixture({
      adapter: "import PptxGenJS from 'pptxgenjs';\nnew PptxGenJS().addImage({ data: 'x' });\n",
    });
    await expect(auditPptxImageParserExposure(root)).resolves.toEqual(
      expect.arrayContaining([expect.stringContaining('image embedding is blocked')]),
    );
  });

  it('rejects bracket-notation attempts to bypass the image embedding gate', async () => {
    const root = fixture({
      adapter: "import PptxGenJS from 'pptxgenjs';\nnew PptxGenJS()['addImage']({ data: 'x' });\n",
    });
    await expect(auditPptxImageParserExposure(root)).resolves.toEqual(
      expect.arrayContaining([expect.stringContaining('image embedding is blocked')]),
    );
  });

  it('rejects direct image-size imports and new unreviewed PPTX adapters', async () => {
    const root = fixture({
      extraFiles: {
        'src/server/imageProbe.ts': "import 'image-size/lib/types/jxl';\n",
        'src/lib/otherPptx.ts': "await import('pptxgenjs');\n",
      },
    });
    const violations = await auditPptxImageParserExposure(root);
    expect(violations).toEqual(
      expect.arrayContaining([
        expect.stringContaining('direct image-size import is forbidden'),
        expect.stringContaining('outside the reviewed browser-only adapter'),
      ]),
    );
  });
});
