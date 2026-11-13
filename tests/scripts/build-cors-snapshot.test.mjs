/**
 * Tests for scripts/build-cors-snapshot.mjs
 *
 * Bug found during adversarial testing: four unguarded `fs` calls crashed
 * with a raw Node uncaught-exception stack trace (exposing internal file
 * paths) instead of the script's own clean `❌ ...` message style:
 *   - `--check` against a corrupt or empty JSON snapshot file
 *     (JSON.parse threw SyntaxError).
 *   - `--check` when SNAPSHOT_PATH points at a directory instead of a file
 *     (readFileSync threw EISDIR).
 *   - running the script (write or --check mode) when `supabase/functions`
 *     itself does not exist (readdirSync threw ENOENT inside listFunctions).
 *   - writing the snapshot when `supabase/functions/_shared/` does not exist
 *     yet (writeFileSync threw ENOENT).
 *
 * Fix: wrap `readdirSync(FUNCTIONS_DIR)` in listFunctions(),
 * `JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"))` in --check mode, and the
 * final `writeFileSync(SNAPSHOT_PATH, ...)` in try/catch, printing a clean
 * `❌ ...` message and exiting 1 (the same exit code the script already uses
 * for "missing"/"stale" snapshot).
 *
 * These tests run the real script via spawnSync against isolated temp
 * fixture roots under the OS tmpdir — never against the repo's own
 * supabase/functions.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT = resolve(process.cwd(), 'scripts/build-cors-snapshot.mjs');

const tempRoots = [];

/**
 * Creates an isolated fixture root: <root>/supabase/functions/. The script
 * reads/writes FUNCTIONS_DIR ("supabase/functions") relative to its cwd, so
 * pointing `cwd` at a throwaway tree is enough to keep the real repo untouched.
 */
function makeFixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'build-cors-snapshot-test-'));
  tempRoots.push(root);
  return root;
}

function writeFunction(root, name, source) {
  const dir = join(root, 'supabase', 'functions', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.ts'), source);
}

function snapshotPath(root) {
  return join(root, 'supabase', 'functions', '_shared', 'cors-snapshot.json');
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

describe('build-cors-snapshot.mjs — fs error handling (regression)', () => {
  it('exits 1 with a clean message when --check reads a corrupt JSON snapshot (not a stack trace)', () => {
    const root = makeFixtureRoot();
    mkdirSync(join(root, 'supabase', 'functions', '_shared'), { recursive: true });
    writeFileSync(snapshotPath(root), 'this is not json {{{');

    const result = run(root, ['--check']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('❌ Failed to read');
    expect(result.stderr).toContain('cors-snapshot.json');
    expect(result.stderr).not.toContain('at JSON.parse');
    expect(result.stderr).not.toContain('SyntaxError');
  });

  it('exits 1 with a clean message when --check reads an empty snapshot file', () => {
    const root = makeFixtureRoot();
    mkdirSync(join(root, 'supabase', 'functions', '_shared'), { recursive: true });
    writeFileSync(snapshotPath(root), '');

    const result = run(root, ['--check']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('❌ Failed to read');
    expect(result.stderr).not.toContain('at JSON.parse');
  });

  it('exits 1 with a clean message when the snapshot path is a directory (EISDIR)', () => {
    const root = makeFixtureRoot();
    mkdirSync(snapshotPath(root), { recursive: true });

    const result = run(root, ['--check']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('❌ Failed to read');
    expect(result.stderr).not.toContain('at readFileSync');
    expect(result.stderr).not.toContain('Error: EISDIR');
  });

  it('exits 1 with a clean message when supabase/functions itself does not exist', () => {
    const root = makeFixtureRoot();
    // no supabase/functions created at all

    const result = run(root, []);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('❌ Failed to read supabase/functions');
    expect(result.stderr).not.toContain('at readdirSync');
    expect(result.stderr).not.toContain('Error: ENOENT');
  });

  it('still exits 1 for a missing (but readable) --check target (pre-existing, unaffected behavior)', () => {
    const root = makeFixtureRoot();
    mkdirSync(join(root, 'supabase', 'functions'), { recursive: true });

    const result = run(root, ['--check']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('missing. Run: npm run build:cors-snapshot');
  });

  it('exits 1 with a clean message when supabase/functions/_shared does not exist yet (write mode)', () => {
    const root = makeFixtureRoot();
    writeFunction(root, 'fn1', 'const h = { "Access-Control-Allow-Headers": "x-a" };\n');
    // supabase/functions/_shared is intentionally absent

    const result = run(root, []);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('❌ Failed to write');
    expect(result.stderr).toContain('cors-snapshot.json');
    expect(result.stderr).not.toContain('at writeFileSync');
    expect(result.stderr).not.toContain('Error: ENOENT');
  });
});

describe('build-cors-snapshot.mjs — happy path (unaffected by the fix)', () => {
  it('classifies shared / inline / none functions and writes a snapshot', () => {
    const root = makeFixtureRoot();
    mkdirSync(join(root, 'supabase', 'functions', '_shared'), { recursive: true });
    writeFunction(
      root,
      'shared-fn',
      'import { corsHeaders } from "../_shared/cors.ts";\nDeno.serve((req) => new Response("ok", { headers: corsHeaders }));\n',
    );
    writeFunction(
      root,
      'inline-fn',
      'const h = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info" };\n',
    );
    writeFunction(root, 'none-fn', 'Deno.serve((req) => new Response("ok"));\n');

    const writeResult = run(root, []);
    expect(writeResult.status).toBe(0);
    expect(writeResult.stdout).toContain('total=3 shared=1 inline=1 none=1');

    const checkResult = run(root, ['--check']);
    expect(checkResult.status).toBe(0);
    expect(checkResult.stdout).toContain('up-to-date (3 functions)');
  });

  it('exits 1 with a clean message when the snapshot is stale', () => {
    const root = makeFixtureRoot();
    mkdirSync(join(root, 'supabase', 'functions', '_shared'), { recursive: true });
    writeFunction(root, 'inline-fn', 'const h = { "Access-Control-Allow-Headers": "x-a" };\n');
    run(root, []);

    // drift the snapshot without re-running the generator
    writeFunction(root, 'new-fn', 'const h = { "Access-Control-Allow-Headers": "x-b" };\n');

    const result = run(root, ['--check']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('is stale. Run: npm run build:cors-snapshot');
  });
});
