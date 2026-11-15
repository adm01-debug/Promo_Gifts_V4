// Testes para scripts/check-contract-coverage.mjs
//
// O script roda no top-level (sem guarda de import.meta.url), então é
// executado como subprocesso contra um repositório fixture em /tmp (mesmo
// padrão de tests/scripts/audit-db-frontend-coverage.test.mjs).
//
// Cobre um bug real encontrado por teste adversarial manual: quando
// `supabase/functions/` não existe, o script chamava `readdirSync(FN_DIR)`
// sem tratamento, lançando uma exceção não capturada (stack trace crua do
// Node, `Error: ENOENT: ... scandir ...`) e saindo com o exit code padrão
// do Node (1) — não com o exit code 2 que o próprio cabeçalho do script
// documenta para "script error (can't read the registry / fs problem)",
// e sem a mensagem amigável que o caso análogo (registry ausente) já tinha.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');
const REAL_SCRIPT = resolve(ROOT, 'scripts/check-contract-coverage.mjs');
const SCRIPT_SRC = readFileSync(REAL_SCRIPT, 'utf8');

const temporaryRoots = [];
afterEach(() => {
  for (const dir of temporaryRoots.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const MINIMAL_REGISTRY = `
export const CONTRACTS = {
  "product-webhook": {},
};
export const NO_BODY_EXEMPT = new Set<string>([]);
`;

/**
 * Monta um repositório fixture isolado em /tmp:
 *   <fixture>/scripts/check-contract-coverage.mjs        (cópia do script real)
 *   <fixture>/tests/contracts/webhook-schemas.ts         (se `registry` for dado)
 *   <fixture>/supabase/functions/<nome>/index.ts          (se `functions` for dado e `noFnDir` for falso)
 */
function makeFixture({ registry, functions = {}, noFnDir = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'check-contract-coverage-'));
  temporaryRoots.push(dir);

  mkdirSync(resolve(dir, 'scripts'), { recursive: true });
  writeFileSync(resolve(dir, 'scripts/check-contract-coverage.mjs'), SCRIPT_SRC);

  if (!noFnDir) {
    mkdirSync(resolve(dir, 'supabase/functions'), { recursive: true });
    for (const [fnName, content] of Object.entries(functions)) {
      const fnDir = resolve(dir, 'supabase/functions', fnName);
      mkdirSync(fnDir, { recursive: true });
      writeFileSync(resolve(fnDir, 'index.ts'), content);
    }
  }

  if (registry !== undefined) {
    mkdirSync(resolve(dir, 'tests/contracts'), { recursive: true });
    writeFileSync(resolve(dir, 'tests/contracts/webhook-schemas.ts'), registry);
  }

  return dir;
}

function runScript(dir) {
  return spawnSync(process.execPath, ['scripts/check-contract-coverage.mjs'], {
    cwd: dir,
    encoding: 'utf8',
    timeout: 15_000,
  });
}

const BODY_FN = 'Deno.serve(async (req) => { const b = await req.json(); return new Response("ok"); });';

describe('check-contract-coverage — gap real: supabase/functions ausente', () => {
  it('sai com exit code 2 e mensagem amigável, sem stack trace do Node', () => {
    const dir = makeFixture({ registry: MINIMAL_REGISTRY, noFnDir: true });
    const result = runScript(dir);

    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/não encontrado/);
    // Antes da correção, o erro era uma exceção ENOENT não tratada do
    // readdirSync, com stack trace do runtime do Node — nunca deveria
    // chegar ao dono (que não é dev) dessa forma.
    expect(result.stderr).not.toMatch(/ENOENT/);
    expect(result.stderr).not.toMatch(/at readdirSync/);
    expect(result.stderr).not.toMatch(/node:fs/);
  });
});

describe('check-contract-coverage — comportamento básico (regressão)', () => {
  it('exit 0 quando a função com body está registrada em CONTRACTS', () => {
    const dir = makeFixture({
      registry: MINIMAL_REGISTRY,
      functions: { 'product-webhook': BODY_FN },
    });
    const result = runScript(dir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Contract coverage OK');
  });

  it('exit 1 e lista a função ausente quando ela lê body mas não está em CONTRACTS', () => {
    const dir = makeFixture({
      registry: MINIMAL_REGISTRY,
      functions: { 'orphan-webhook': BODY_FN },
    });
    const result = runScript(dir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('orphan-webhook');
  });

  it('exit 2 e mensagem amigável quando tests/contracts/webhook-schemas.ts não existe', () => {
    const dir = makeFixture({ functions: {} });
    const result = runScript(dir);

    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/webhook-schemas\.ts.*não encontrado/);
  });
});
