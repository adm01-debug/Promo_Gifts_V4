/**
 * Tests for scripts/bundle-size-report.mjs
 *
 * Bugs found during adversarial testing: 3 unguarded synchronous `fs` calls
 * crashed with a raw Node stack trace (exposing internal paths and, worse,
 * breaking the script's own documented contract — "NÃO falha o build" —
 * since GH Actions bash steps run with `set -e` and an uncaught exception
 * exits 1) instead of degrading gracefully:
 *   - `dist/assets` exists but is a regular file, not a directory
 *     (readdirSync threw ENOTDIR).
 *   - `bundle-size-baseline.json` exists but has invalid/empty JSON
 *     (JSON.parse threw SyntaxError) — this is optional comparison data,
 *     so losing it should degrade to the already-existing "sem baseline"
 *     path, not abort the report.
 *   - `--out` pointing at a path whose parent directory doesn't exist, or
 *     at an existing directory (writeFileSync threw ENOENT/EISDIR) — the
 *     report was already written to stdout by that point, so a failure
 *     writing the optional --out copy must not crash the process (same
 *     treatment the script already gives GITHUB_STEP_SUMMARY writes).
 *
 * Fix: wrap readdirSync (dist/assets), JSON.parse (baseline) and
 * writeFileSync (--out) in try/catch — dist/assets failure prints a clean
 * `❌ ...` message and exits 2 (same code already used for "não encontrado");
 * baseline and --out failures print a `⚠️ ...` warning to stderr and the
 * report still succeeds (exit 0).
 *
 * These tests run the real script via spawnSync against isolated temp
 * fixture roots under the OS tmpdir — never against the real dist/ build.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT = resolve(process.cwd(), 'scripts/bundle-size-report.mjs');

const tempRoots = [];

function makeFixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'bundle-size-report-test-'));
  tempRoots.push(root);
  return root;
}

function run(root, args = [], env = {}) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: root,
    encoding: 'utf8',
    timeout: 15_000,
    env: { ...process.env, ...env, GITHUB_STEP_SUMMARY: '' },
  });
}

function withChunk(root) {
  mkdirSync(join(root, 'dist', 'assets'), { recursive: true });
  writeFileSync(join(root, 'dist', 'assets', 'react-vendor-abc12345.js'), 'x');
}

afterEach(() => {
  while (tempRoots.length) {
    const root = tempRoots.pop();
    rmSync(root, { recursive: true, force: true });
  }
});

describe('bundle-size-report.mjs — fs error handling (regression)', () => {
  it('exits 2 with a clean message when dist/assets is a file, not a directory (ENOTDIR)', () => {
    const root = makeFixtureRoot();
    mkdirSync(join(root, 'dist'));
    writeFileSync(join(root, 'dist', 'assets'), 'im a file');

    const result = run(root);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('❌ Falha ao ler');
    expect(result.stderr).toContain('dist/assets');
    expect(result.stderr).not.toContain('at readdirSync');
    expect(result.stderr).not.toContain('Error: ENOTDIR');
  });

  it('degrades to "sem baseline" (exit 0) when bundle-size-baseline.json has invalid JSON', () => {
    const root = makeFixtureRoot();
    withChunk(root);
    writeFileSync(join(root, 'bundle-size-baseline.json'), '{ invalid json');

    const result = run(root);

    expect(result.status).toBe(0);
    expect(result.stderr).toContain('⚠️  Ignorando');
    expect(result.stderr).toContain('bundle-size-baseline.json');
    expect(result.stderr).not.toContain('at JSON.parse');
    expect(result.stdout).toContain('(sem baseline)');
  });

  it('degrades to "sem baseline" (exit 0) when bundle-size-baseline.json is empty', () => {
    const root = makeFixtureRoot();
    withChunk(root);
    writeFileSync(join(root, 'bundle-size-baseline.json'), '');

    const result = run(root);

    expect(result.status).toBe(0);
    expect(result.stderr).toContain('⚠️  Ignorando');
    expect(result.stdout).toContain('(sem baseline)');
  });

  it('still prints the report (exit 0) when --out points at a non-existent subdirectory (ENOENT)', () => {
    const root = makeFixtureRoot();
    withChunk(root);

    const result = run(root, ['--out', 'relatorio/saida/bundle.md']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Bundle size report');
    expect(result.stderr).toContain('⚠️  Falha ao escrever');
    expect(result.stderr).not.toContain('at writeFileSync');
  });

  it('still prints the report (exit 0) when --out points at an existing directory (EISDIR)', () => {
    const root = makeFixtureRoot();
    withChunk(root);
    mkdirSync(join(root, 'jadir'));

    const result = run(root, ['--out', 'jadir']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Bundle size report');
    expect(result.stderr).toContain('⚠️  Falha ao escrever');
  });
});

describe('bundle-size-report.mjs — happy path (unaffected by the fix)', () => {
  it('exits 2 with a clean message when dist/assets does not exist at all', () => {
    const root = makeFixtureRoot();

    const result = run(root);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('não encontrado');
  });

  it('reports 0 B with no baseline when dist/assets is empty', () => {
    const root = makeFixtureRoot();
    mkdirSync(join(root, 'dist', 'assets'), { recursive: true });

    const result = run(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('0 B');
    expect(result.stdout).toContain('(sem baseline)');
  });

  it('computes delta against a valid baseline and writes --out', () => {
    const root = makeFixtureRoot();
    withChunk(root);
    writeFileSync(
      join(root, 'bundle-size-baseline.json'),
      JSON.stringify({
        criticalChunks: { 'react-vendor': { currentBytes: 100, label: 'React' } },
        snapshot: { chunksByPrefix: { 'react-vendor': 100 }, totalBytes: 100 },
      }),
    );

    const result = run(root, ['--out', 'out.md']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('react-vendor');
    expect(result.stdout).toContain('-99.0%');
    expect(result.stderr).not.toContain('⚠️');

    const written = readFileSync(join(root, 'out.md'), 'utf8');
    expect(written).toBe(result.stdout);
  });
});
