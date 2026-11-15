/**
 * Tests for scripts/audit-credentials.mjs
 *
 * Bug found during adversarial testing: a malformed/corrupt/inaccessible
 * `--baseline` file, or an `--update-baseline` target whose parent directory
 * doesn't exist, crashed with a raw Node uncaught-exception stack trace and
 * exit code 1 — colliding with the script's own documented exit code 1
 * ("new credential issues found"). A CI job reading the exit code could not
 * tell "baseline file is corrupt" apart from "real credential issue found".
 *
 * Fix: wrap the baseline read (readFileSync + JSON.parse) and the
 * --update-baseline write (writeFileSync) in try/catch, printing a clean
 * `❌ ...` message and exiting 2 (the script's existing "operational error"
 * code, same as "baseline file not found" and "error walking functions
 * directory").
 *
 * These tests run the real script via spawnSync against isolated temp
 * fixture roots under the OS tmpdir — never against the repo's own
 * supabase/functions or any real credential/network.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT_SRC = resolve(process.cwd(), 'scripts/audit-credentials.mjs');

const tempRoots = [];

/**
 * Creates an isolated fixture root: <root>/scripts/audit-credentials.mjs
 * (copy of the real script) + <root>/supabase/functions/. The script infers
 * its ROOT from its own file location, so copying it is what lets each test
 * point FUNCTIONS_DIR at a throwaway tree instead of the real repo.
 */
function makeFixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'audit-credentials-test-'));
  tempRoots.push(root);
  mkdirSync(join(root, 'scripts'), { recursive: true });
  mkdirSync(join(root, 'supabase', 'functions'), { recursive: true });
  writeFileSync(join(root, 'scripts', 'audit-credentials.mjs'), readFileSync(SCRIPT_SRC));
  return root;
}

function writeFunction(root, name, source) {
  const dir = join(root, 'supabase', 'functions', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.ts'), source);
}

function run(root, args) {
  return spawnSync(process.execPath, [join(root, 'scripts', 'audit-credentials.mjs'), ...args], {
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

describe('audit-credentials.mjs — baseline error handling (regression)', () => {
  it('exits 2 with a clean message when --baseline file is corrupt JSON (not a stack trace, not exit 1)', () => {
    const root = makeFixtureRoot();
    const baselinePath = join(root, 'corrupt-baseline.json');
    writeFileSync(baselinePath, 'this is not json {{{');

    const result = run(root, ['--baseline', baselinePath]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('❌ Failed to read baseline file');
    expect(result.stderr).not.toContain('at JSON.parse');
    expect(result.stderr).not.toContain('SyntaxError');
  });

  it('exits 2 with a clean message when --baseline file is empty', () => {
    const root = makeFixtureRoot();
    const baselinePath = join(root, 'empty-baseline.json');
    writeFileSync(baselinePath, '');

    const result = run(root, ['--baseline', baselinePath]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('❌ Failed to read baseline file');
    expect(result.stderr).not.toContain('at JSON.parse');
  });

  it('exits 2 with a clean message when --baseline points at a directory (EISDIR)', () => {
    const root = makeFixtureRoot();
    const baselineDir = join(root, 'baseline-is-a-dir');
    mkdirSync(baselineDir);

    const result = run(root, ['--baseline', baselineDir]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('❌ Failed to read baseline file');
    expect(result.stderr).not.toContain('at readFileSync');
    expect(result.stderr).not.toContain('Error: EISDIR');
  });

  it('exits 2 with a clean message when --update-baseline target directory does not exist (ENOENT)', () => {
    const root = makeFixtureRoot();
    const target = join(root, 'no', 'such', 'dir', 'baseline.json');

    const result = run(root, ['--update-baseline', target]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('❌ Failed to write baseline file');
    expect(result.stderr).not.toContain('at writeFileSync');
    expect(existsSync(target)).toBe(false);
  });

  it('still exits 2 for a missing --baseline file (pre-existing, unaffected behavior)', () => {
    const root = makeFixtureRoot();
    const result = run(root, ['--baseline', join(root, 'does-not-exist.json')]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('❌ Baseline file not found');
  });
});

describe('audit-credentials.mjs — happy path (unaffected by the fix)', () => {
  it('scans 0 functions and exits 0 on an empty supabase/functions tree', () => {
    const root = makeFixtureRoot();
    const result = run(root, []);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('scanned 0 edge function(s)');
  });

  it('detects resolve-credential-type-mismatch and exits 1', () => {
    const root = makeFixtureRoot();
    writeFunction(
      root,
      'foo',
      "Deno.serve(async (req) => {\n  const KEY = await resolveCredential('EXTERNAL_FOO_API_KEY');\n});\n",
    );

    const result = run(root, ['--json']);
    const parsed = JSON.parse(result.stdout);

    expect(result.status).toBe(1);
    expect(parsed.new).toHaveLength(1);
    expect(parsed.new[0].rule).toBe('resolve-credential-type-mismatch');
  });

  it('--update-baseline followed by --baseline round-trips cleanly (exit 0, 0 new issues)', () => {
    const root = makeFixtureRoot();
    writeFunction(
      root,
      'foo',
      "Deno.serve(async (req) => {\n  const KEY = await resolveCredential('EXTERNAL_FOO_API_KEY');\n});\n",
    );
    const baselinePath = join(root, 'bl.json');

    const update = run(root, ['--update-baseline', baselinePath]);
    expect(update.status).toBe(0);
    expect(existsSync(baselinePath)).toBe(true);

    const audit = run(root, ['--baseline', baselinePath]);
    expect(audit.status).toBe(0);
    expect(audit.stdout).toContain('No new credential issues');
  });
});
