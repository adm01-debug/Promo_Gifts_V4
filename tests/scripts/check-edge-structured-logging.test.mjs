/**
 * Tests for scripts/check-edge-structured-logging.mjs
 *
 * Bug found during adversarial testing: when `supabase/functions` (FN_ROOT)
 * does not exist or cannot be read (e.g. script run from the wrong cwd, or
 * the directory accidentally removed/renamed in a messy merge), `main()` →
 * `listEdgeFunctions()` called `readdirSync(FN_ROOT)` with no try/catch.
 * `readdirSync` throws ENOENT, so the gate crashed with a raw Node
 * uncaught-exception stack trace instead of its own clean `❌` CI message —
 * exit code 1 either way, but CI output became an unreadable internal stack
 * trace instead of telling anyone which path is missing. Same shape as the
 * EISDIR regression already covered for scripts/check-client-structured-logging.mjs.
 *
 * Fix: wrap the `readdirSync(FN_ROOT)` call in `listEdgeFunctions()` in
 * try/catch and print a clean `❌ Não foi possível ler <path>: <reason>`
 * message (still exit 1) instead of letting the exception propagate.
 *
 * These tests run the real script via spawnSync against isolated temp
 * fixture roots under the OS tmpdir — never against the repo's own
 * supabase/functions tree.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT_SRC = resolve(process.cwd(), 'scripts/check-edge-structured-logging.mjs');

const VALID_LOGGER_SRC =
  "import { createStructuredLogger } from '../_shared/structured-logger.ts';\nconst log = createStructuredLogger('x');\n";

const tempRoots = [];

/** Fixture root: <root>/scripts/check-edge-structured-logging.mjs (cópia do
 * script real, lido do disco em cada chamada — já reflete qualquer fix). */
function makeFixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'check-edge-structured-logging-test-'));
  tempRoots.push(root);
  mkdirSync(join(root, 'scripts'), { recursive: true });
  writeFileSync(
    join(root, 'scripts', 'check-edge-structured-logging.mjs'),
    readFileSync(SCRIPT_SRC),
  );
  return root;
}

function run(root) {
  return spawnSync(
    process.execPath,
    [join(root, 'scripts', 'check-edge-structured-logging.mjs')],
    { cwd: root, encoding: 'utf8', timeout: 15_000 },
  );
}

afterEach(() => {
  while (tempRoots.length) {
    const root = tempRoots.pop();
    rmSync(root, { recursive: true, force: true });
  }
});

describe('check-edge-structured-logging.mjs — missing FN_ROOT handling (regression)', () => {
  it('exits 1 with a clean ❌ message when supabase/functions does not exist, not a raw ENOENT stack trace', () => {
    const root = makeFixtureRoot();
    // supabase/functions is intentionally NOT created.

    const result = run(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Não foi possível ler');
    expect(result.stderr).toContain('supabase/functions');
    expect(result.stderr).not.toContain('at readdirSync');
    expect(result.stderr).not.toContain('Error: ENOENT');
    expect(result.stderr).not.toContain('at listEdgeFunctions');
  });
});

describe('check-edge-structured-logging.mjs — unaffected behavior (sanity, not broken by the fix)', () => {
  it('still runs cleanly (no crash) when supabase/functions exists but is empty', () => {
    const root = makeFixtureRoot();
    mkdirSync(join(root, 'supabase', 'functions'), { recursive: true });

    const result = run(root);

    // Com a allowlist de produção hardcoded no script, uma fixture isolada
    // sempre reporta entradas "órfãs" (edges da allowlist que não existem
    // nesta fixture) — isso é esperado e não é o alvo deste teste. O que
    // importa é que não há crash nem stack trace.
    expect(result.status).toBe(1);
    expect(result.stderr).not.toContain('at readdirSync');
    expect(result.stderr).not.toContain('TypeError');
  });

  it('still flags a non-allowlisted edge function missing the structured logger', () => {
    const root = makeFixtureRoot();
    const fnDir = join(root, 'supabase', 'functions', 'my-new-edge');
    mkdirSync(fnDir, { recursive: true });
    writeFileSync(
      join(fnDir, 'index.ts'),
      "export default function handler() { return new Response('ok'); }\n",
    );

    const result = run(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('sem logger estruturado SSOT');
    expect(result.stderr).toContain('my-new-edge');
  });

  it('does not flag an edge function that imports createStructuredLogger', () => {
    const root = makeFixtureRoot();
    const fnDir = join(root, 'supabase', 'functions', 'my-logged-edge');
    mkdirSync(fnDir, { recursive: true });
    writeFileSync(join(fnDir, 'index.ts'), VALID_LOGGER_SRC);

    const result = run(root);

    expect(result.stderr).not.toMatch(/❌[\s\S]*my-logged-edge/);
  });
});
