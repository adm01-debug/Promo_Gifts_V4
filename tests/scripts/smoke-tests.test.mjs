/**
 * Tests for scripts/smoke-tests.mjs
 *
 * Bug found during adversarial testing: checkStaticRoutes() called
 * `readFileSync(p, "utf8")` with no try/catch around it, unlike the
 * script's other two checks (health-fn, public-routes), which already
 * wrap their work in try/catch and log a clean `✗ ...` line.
 *
 * When a route candidate (src/App.tsx or a file under src/routes/) could
 * not be read as a regular file — e.g. the path is actually a directory
 * (EISDIR) or the process lacks read permission (EACCES) — the readFileSync
 * call threw, crashing the whole script with a raw Node uncaught-exception
 * stack trace (exposing internal file paths) instead of the script's own
 * log format. The crash also skipped the final summary line and the
 * "Falha crítica" banner.
 *
 * Fix: wrap the `readFileSync` map in try/catch inside checkStaticRoutes(),
 * log a clean `fail` with the error message, and return early — exit code
 * stays 1, same as any other critical failure.
 *
 * These tests run the real script via spawnSync against isolated temp
 * fixture roots under the OS tmpdir — never against the repo's own
 * src/App.tsx or src/routes/.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT = resolve(process.cwd(), 'scripts/smoke-tests.mjs');

const REQUIRED_ROUTES = [
  '/login',
  '/reset-password',
  '/auth/callback',
  '/produtos',
  '/orcamentos',
  '/orcamentos/novo',
  '/admin/usuarios',
];

const tempRoots = [];

function makeFixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'smoke-tests-test-'));
  tempRoots.push(root);
  return root;
}

function writeValidAppTsx(root) {
  mkdirSync(join(root, 'src'), { recursive: true });
  const body = REQUIRED_ROUTES.map((r) => `<Route path="${r}" />`).join('\n');
  writeFileSync(join(root, 'src', 'App.tsx'), body);
}

function run(root, env = {}) {
  return spawnSync(process.execPath, [SCRIPT], {
    cwd: root,
    encoding: 'utf8',
    timeout: 15_000,
    env: { ...process.env, ...env },
  });
}

afterEach(() => {
  while (tempRoots.length) {
    const root = tempRoots.pop();
    rmSync(root, { recursive: true, force: true });
  }
});

describe('smoke-tests.mjs — checkStaticRoutes fs error handling (regression)', () => {
  it('exits 1 with a clean message when src/App.tsx is a directory (EISDIR), not a stack trace', () => {
    const root = makeFixtureRoot();
    mkdirSync(join(root, 'src', 'App.tsx'), { recursive: true });

    const result = run(root);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('static-routes: erro ao ler arquivo de rota');
    expect(result.stdout).toContain('EISDIR');
    expect(result.stderr).not.toContain('at readFileSync');
    expect(result.stderr).not.toContain('Error: EISDIR');
    expect(result.stdout).toContain('Smoke tests finalizados');
  });

  it('exits 1 with a clean message when a file under src/routes/ cannot be read (EISDIR)', () => {
    const root = makeFixtureRoot();
    writeValidAppTsx(root);
    // src/routes/weird.tsx is actually a directory
    mkdirSync(join(root, 'src', 'routes', 'weird.tsx'), { recursive: true });

    const result = run(root);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('static-routes: erro ao ler arquivo de rota');
    expect(result.stderr).not.toContain('at readFileSync');
  });
});

describe('smoke-tests.mjs — checkStaticRoutes happy path (unaffected by the fix)', () => {
  it('passes when all required routes are declared in src/App.tsx', () => {
    const root = makeFixtureRoot();
    writeValidAppTsx(root);

    const result = run(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('static-routes: 7 rotas críticas declaradas');
  });

  it('fails listing the missing routes when some are absent', () => {
    const root = makeFixtureRoot();
    mkdirSync(join(root, 'src'), { recursive: true });
    writeFileSync(join(root, 'src', 'App.tsx'), '<Route path="/login" />');

    const result = run(root);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('rotas ausentes:');
    expect(result.stdout).toContain('/produtos');
  });

  it('fails when no route file exists at all', () => {
    const root = makeFixtureRoot();

    const result = run(root);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('nenhum arquivo de rota encontrado');
  });

  it('skips health-fn and public-routes checks (warn, not fail) when their URLs are not configured', () => {
    const root = makeFixtureRoot();
    writeValidAppTsx(root);

    const result = run(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('health-fn: SMOKE_HEALTH_FN_URL não configurada');
    expect(result.stdout).toContain('public-routes: SMOKE_BASE_URL não configurada');
  });
});
