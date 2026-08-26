import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { test } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

test('check-eslint-baseline carrega o export nomeado de minimatch@10 antes do gate', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'eslint-baseline-bootstrap-'));

  try {
    const result = spawnSync(
      process.execPath,
      [join(ROOT, 'scripts/check-eslint-baseline.mjs')],
      {
        cwd: sandbox,
        encoding: 'utf8',
      },
    );

    const combinedOutput = `${result.stdout}\n${result.stderr}`;
    assert.equal(result.status, 2);
    assert.equal(result.signal, null);
    assert.doesNotMatch(combinedOutput, /does not provide an export named|SyntaxError/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }

  const lock = JSON.parse(readFileSync(join(ROOT, 'package-lock.json'), 'utf8'));
  const minimatchMajor = Number.parseInt(
    lock.packages['node_modules/minimatch'].version.split('.')[0],
    10,
  );
  assert.ok(minimatchMajor >= 9);
});
