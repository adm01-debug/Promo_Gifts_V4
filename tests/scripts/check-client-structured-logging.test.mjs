/**
 * Tests for scripts/check-client-structured-logging.mjs
 *
 * Bug found during adversarial testing: when a CRITICAL_MODULES path exists
 * on disk as a DIRECTORY instead of a file (e.g. a messy merge/refactor that
 * leaves a stray folder where the module used to be), `checkFile()` called
 * `readFileSync(abs, 'utf8')` with no try/catch. `readFileSync` throws
 * EISDIR for a directory, so the gate crashed with a raw Node uncaught-
 * exception stack trace instead of its own clean `⚠️ /❌` CI message —
 * exit code 1 either way, but CI output became an unreadable stack trace
 * instead of telling anyone (dev or not) which module needs attention.
 *
 * Fix: wrap the `readFileSync` call in `checkFile()` in try/catch, surface
 * unreadable files in their own `unreadableFiles` list, and print a clean
 * `⚠️  Arquivos CRITICAL_MODULES não puderam ser lidos:` block (still
 * exit 1), mirroring the missing-file branch already in `main()`.
 *
 * These tests run the real script via spawnSync against isolated temp
 * fixture roots under the OS tmpdir, with fixture files standing in for the
 * real CRITICAL_MODULES paths — never against the repo's own src/ tree.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT_SRC = resolve(process.cwd(), 'scripts/check-client-structured-logging.mjs');

// Mesma lista de CRITICAL_MODULES do script real (copiada apenas para montar
// a fixture — o script em si continua sendo a cópia lida de SCRIPT_SRC).
const CRITICAL_MODULES = [
  'src/contexts/AuthContext.tsx',
  'src/lib/auth/session-recovery.ts',
  'src/services/quoteService.ts',
  'src/hooks/quotes/useQuotes.ts',
  'src/hooks/ui/useErrorHandler.ts',
  'src/hooks/ui/useWorkspaceNotifications.tsx',
  'src/components/admin/security/keys/useMcpKeys.ts',
  'src/hooks/intelligence/useMagicUpGeneration.ts',
  'src/hooks/intelligence/useConnectionTester.ts',
  'src/components/layout/ProtectedRoute.tsx',
  'src/hooks/auth/useProfileRoles.ts',
  'src/hooks/products/useSellerCarts.ts',
  'src/lib/telemetry/quoteStatusTelemetry.ts',
  'src/pages/mockups/MockupGenerator.tsx',
  'src/lib/edge/safeInvokeCall.ts',
];

const VALID_LOGGER_SRC =
  "import { createClientLogger } from '@/lib/telemetry/structuredLogger';\nconst log = createClientLogger('x');\n";

const tempRoots = [];

/** Fixture root: <root>/scripts/check-client-structured-logging.mjs (cópia
 * do script real) + todos os CRITICAL_MODULES, válidos por padrão. */
function makeFixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'check-client-structured-logging-test-'));
  tempRoots.push(root);
  mkdirSync(join(root, 'scripts'), { recursive: true });
  writeFileSync(
    join(root, 'scripts', 'check-client-structured-logging.mjs'),
    readFileSync(SCRIPT_SRC),
  );
  for (const rel of CRITICAL_MODULES) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, VALID_LOGGER_SRC);
  }
  return root;
}

function run(root) {
  return spawnSync(
    process.execPath,
    [join(root, 'scripts', 'check-client-structured-logging.mjs')],
    { cwd: root, encoding: 'utf8', timeout: 15_000 },
  );
}

afterEach(() => {
  while (tempRoots.length) {
    const root = tempRoots.pop();
    rmSync(root, { recursive: true, force: true });
  }
});

describe('check-client-structured-logging.mjs — EISDIR handling (regression)', () => {
  it('exits 1 with a clean ⚠️ message when a CRITICAL_MODULES path is a directory, not a stack trace', () => {
    const root = makeFixtureRoot();
    const target = join(root, 'src/hooks/products/useSellerCarts.ts');
    rmSync(target, { force: true });
    mkdirSync(target);

    const result = run(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('não puderam ser lidos');
    expect(result.stderr).toContain('src/hooks/products/useSellerCarts.ts');
    expect(result.stderr).not.toContain('at readFileSync');
    expect(result.stderr).not.toContain('Error: EISDIR');

    rmdirSync(target);
  });
});

describe('check-client-structured-logging.mjs — happy path (unaffected by the fix)', () => {
  it('exits 0 when every CRITICAL_MODULES file imports createClientLogger', () => {
    const root = makeFixtureRoot();
    const result = run(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('✅ Client structured-logging gate OK');
  });

  it('exits 1 and lists missing files when a CRITICAL_MODULES path does not exist', () => {
    const root = makeFixtureRoot();
    rmSync(join(root, 'src/pages/mockups/MockupGenerator.tsx'));

    const result = run(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('ausentes');
    expect(result.stderr).toContain('src/pages/mockups/MockupGenerator.tsx');
  });

  it('exits 1 and lists violations when a CRITICAL_MODULES file lacks createClientLogger', () => {
    const root = makeFixtureRoot();
    writeFileSync(join(root, 'src/services/quoteService.ts'), 'export const x = 1;\n');

    const result = run(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('sem createClientLogger');
    expect(result.stderr).toContain('src/services/quoteService.ts');
  });
});
