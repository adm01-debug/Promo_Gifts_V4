/**
 * Tests for scripts/check-log-login-attempt-contract.mjs
 *
 * Bug found during adversarial testing: when
 * supabase/functions/log-login-attempt/index.ts does not exist or cannot be
 * read (e.g. the edge function folder renamed/removed in a messy merge, or
 * the script run against a repo checkout missing that file), the gate
 * called `readFileSync(FILE, "utf8")` with no try/catch. `readFileSync`
 * throws ENOENT (or EISDIR if a directory sits at that path), so the gate
 * crashed with a raw Node uncaught-exception stack trace instead of its own
 * clean `❌` CI message — exit code 1 either way, but CI output became an
 * unreadable internal stack trace instead of telling anyone which path is
 * missing. Same shape as the ENOENT regression already covered for
 * scripts/check-edge-structured-logging.mjs.
 *
 * Fix: wrap the `readFileSync(FILE, "utf8")` call in try/catch and print a
 * clean `❌ check-log-login-attempt-contract: não foi possível ler <path>:
 * <reason>` message (still exit 1) instead of letting the exception
 * propagate.
 *
 * These tests run the real script via spawnSync against isolated temp
 * fixture roots under the OS tmpdir — never against the repo's own
 * supabase/functions/log-login-attempt/index.ts.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT_SRC = resolve(process.cwd(), 'scripts/check-log-login-attempt-contract.mjs');

const tempRoots = [];

/** Fixture root: <root>/scripts/check-log-login-attempt-contract.mjs (cópia
 * do script real, lido do disco em cada chamada — já reflete qualquer fix).
 * O script resolve seu FILE via `resolve(__dirname, "..", "supabase/...")`,
 * então basta reproduzir essa mesma estrutura relativa dentro do root. */
function makeFixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'check-log-login-attempt-contract-test-'));
  tempRoots.push(root);
  mkdirSync(join(root, 'scripts'), { recursive: true });
  writeFileSync(
    join(root, 'scripts', 'check-log-login-attempt-contract.mjs'),
    readFileSync(SCRIPT_SRC),
  );
  return root;
}

function run(root) {
  return spawnSync(
    process.execPath,
    [join(root, 'scripts', 'check-log-login-attempt-contract.mjs')],
    { cwd: root, encoding: 'utf8', timeout: 15_000 },
  );
}

afterEach(() => {
  while (tempRoots.length) {
    const root = tempRoots.pop();
    rmSync(root, { recursive: true, force: true });
  }
});

describe('check-log-login-attempt-contract.mjs — missing target file handling (regression)', () => {
  it('exits 1 with a clean ❌ message when index.ts does not exist, not a raw ENOENT stack trace', () => {
    const root = makeFixtureRoot();
    // supabase/functions/log-login-attempt/index.ts is intentionally NOT created.

    const result = run(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('não foi possível ler');
    expect(result.stderr).toContain('log-login-attempt');
    expect(result.stderr).toContain('ENOENT');
    expect(result.stderr).not.toContain('at readFileSync');
    expect(result.stderr).not.toContain('Node.js v');
  });

  it('exits 1 with a clean ❌ message when the target path is a directory, not a raw EISDIR stack trace', () => {
    const root = makeFixtureRoot();
    // index.ts is a directory instead of a file.
    mkdirSync(
      join(root, 'supabase', 'functions', 'log-login-attempt', 'index.ts'),
      { recursive: true },
    );

    const result = run(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('não foi possível ler');
    expect(result.stderr).toContain('EISDIR');
    expect(result.stderr).not.toContain('at readFileSync');
    expect(result.stderr).not.toContain('Node.js v');
  });
});

describe('check-log-login-attempt-contract.mjs — unaffected behavior (sanity, not broken by the fix)', () => {
  it('exits 0 and reports OK when the file exists with no 5xx', () => {
    const root = makeFixtureRoot();
    const dir = join(root, 'supabase', 'functions', 'log-login-attempt');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'index.ts'),
      'return new Response(JSON.stringify({ ok: true }), { status: 200 });\n',
    );

    const result = run(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('contrato nunca-5xx OK');
  });

  it('still flags a 5xx status and reports the correct line number', () => {
    const root = makeFixtureRoot();
    const dir = join(root, 'supabase', 'functions', 'log-login-attempt');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'index.ts'),
      'function a() { return new Response("x", { status: 200 }); }\nfunction b() { return new Response("y", { status: 500 }); }\n',
    );

    const result = run(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('1 retorno(s) 5xx');
    expect(result.stderr).toContain('linha 2: status: 500');
  });
});
