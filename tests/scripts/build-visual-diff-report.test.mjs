/**
 * Tests for scripts/build-visual-diff-report.mjs
 *
 * Bug found during adversarial testing: two unguarded synchronous `fs` calls
 * crashed with a raw Node uncaught-exception stack trace (exposing internal
 * file paths) instead of the script's own clean `[visual-diff] ...` message
 * style (already used for the "diretório não encontrado" case):
 *   - `--results` pointing at a path that exists but is a regular file, not
 *     a directory (readdirSync inside walk() threw ENOTDIR).
 *   - `--out` whose directory can't be created because a path segment is a
 *     regular file instead of a directory (mkdirSync(assetsDir) threw ENOTDIR).
 *
 * Fix: wrap `walk(resultsDir)` and `mkdirSync(assetsDir, { recursive: true })`
 * in try/catch, printing a clean `[visual-diff] erro ao ...` message and
 * exiting 1.
 *
 * These tests run the real script via spawnSync against isolated temp
 * fixture roots under the OS tmpdir — never against real Playwright output.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT = resolve(process.cwd(), 'scripts/build-visual-diff-report.mjs');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

const tempRoots = [];

function makeFixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'build-visual-diff-report-test-'));
  tempRoots.push(root);
  return root;
}

function run(root, args = []) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: root,
    encoding: 'utf8',
    timeout: 15_000,
  });
}

afterEach(() => {
  while (tempRoots.length) {
    const root = tempRoots.pop();
    rmSync(root, { recursive: true, force: true });
  }
});

describe('build-visual-diff-report.mjs — fs error handling (regression)', () => {
  it('exits 1 with a clean message when --results points at a file, not a directory (ENOTDIR)', () => {
    const root = makeFixtureRoot();
    writeFileSync(join(root, 'results-as-file'), 'im a file');

    const result = run(root, ['--results', 'results-as-file', '--out', 'out/index.html']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('[visual-diff] erro ao ler');
    expect(result.stderr).toContain('results-as-file');
    expect(result.stderr).not.toContain('at readdirSync');
    expect(result.stderr).not.toContain('Error: ENOTDIR');
  });

  it('exits 1 with a clean message when --out is blocked by a file in its path (mkdir ENOTDIR)', () => {
    const root = makeFixtureRoot();
    mkdirSync(join(root, 'results'), { recursive: true });
    writeFileSync(join(root, 'results', 'case-actual.png'), PNG);
    writeFileSync(join(root, 'blocker'), 'im a file, not a dir');

    const result = run(root, ['--results', 'results', '--out', 'blocker/sub/index.html']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('[visual-diff] erro ao criar');
    expect(result.stderr).not.toContain('at mkdirSync');
    expect(result.stderr).not.toContain('Error: ENOTDIR');
  });
});

describe('build-visual-diff-report.mjs — happy path (unaffected by the fix)', () => {
  it('exits 0 without writing anything when --results does not exist', () => {
    const root = makeFixtureRoot();

    const result = run(root, ['--results', 'nope', '--out', 'out/index.html']);

    expect(result.status).toBe(0);
    expect(result.stderr).toContain('diretório não encontrado');
  });

  it('groups expected/actual/diff trios, extracts viewport+theme, and writes html + summary.json', () => {
    const root = makeFixtureRoot();
    const resultsDir = join(root, 'results', 'sub');
    mkdirSync(resultsDir, { recursive: true });
    for (const kind of ['expected', 'actual', 'diff']) {
      writeFileSync(join(resultsDir, `card-375-light-${kind}.png`), PNG);
    }

    const result = run(root, ['--results', 'results', '--out', 'out/index.html', '--title', 'Card X']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('1 caso(s)');

    const summary = JSON.parse(readFileSync(join(root, 'out', 'summary.json'), 'utf8'));
    expect(summary.total).toBe(1);
    expect(summary.cases[0]).toMatchObject({
      label: 'sub/card-375-light',
      viewport: '375',
      theme: 'light',
      hasDiff: true,
    });
  });

  it('ignores files that do not match the expected/actual/diff naming pattern', () => {
    const root = makeFixtureRoot();
    mkdirSync(join(root, 'results'), { recursive: true });
    writeFileSync(join(root, 'results', 'foo.png'), PNG);
    writeFileSync(join(root, 'results', 'foo-other.png'), PNG);

    const result = run(root, ['--results', 'results', '--out', 'out/index.html']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('0 caso(s)');
  });
});
