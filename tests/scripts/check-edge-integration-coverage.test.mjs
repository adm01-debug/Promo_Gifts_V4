// Testes para scripts/check-edge-integration-coverage.mjs
//
// O script roda no top-level (sem guarda de import.meta.url), então é
// executado como subprocesso contra um repositório fixture em /tmp (mesmo
// padrão de tests/scripts/check-contract-coverage.test.mjs).
//
// Cobre um bug real encontrado por teste adversarial manual: isFunctionCovered
// casava `/${fnName}` como substring sem borda no fim, então uma função cujo
// nome é prefixo de outra (ex.: "quote-sync" é prefixo de
// "quote-sync-promo-champions", caso real em supabase/functions/) era
// marcada como falsamente coberta sempre que só a função mais longa tivesse
// um teste de contrato — um falso-positivo do gate, mascarando a ausência
// real de teste para a função mais curta.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');
const REAL_SCRIPT = resolve(ROOT, 'scripts/check-edge-integration-coverage.mjs');
const SCRIPT_SRC = readFileSync(REAL_SCRIPT, 'utf8');

const temporaryRoots = [];
afterEach(() => {
  for (const dir of temporaryRoots.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/**
 * Monta um repositório fixture isolado em /tmp:
 *   <fixture>/scripts/check-edge-integration-coverage.mjs   (cópia do script real)
 *   <fixture>/supabase/functions/<nome>/index.ts             (uma por entrada de `functions`)
 *   <fixture>/tests/edge-functions/integration/<arquivo>     (uma por entrada de `tests`)
 */
function makeFixture({ functions = {}, tests = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'check-edge-integration-coverage-'));
  temporaryRoots.push(dir);

  mkdirSync(resolve(dir, 'scripts'), { recursive: true });
  writeFileSync(resolve(dir, 'scripts/check-edge-integration-coverage.mjs'), SCRIPT_SRC);

  mkdirSync(resolve(dir, 'supabase/functions'), { recursive: true });
  for (const fnName of Object.keys(functions)) {
    const fnDir = resolve(dir, 'supabase/functions', fnName);
    mkdirSync(fnDir, { recursive: true });
    writeFileSync(resolve(fnDir, 'index.ts'), 'Deno.serve(() => new Response("ok"));');
  }

  if (Object.keys(tests).length > 0) {
    const testsDir = resolve(dir, 'tests/edge-functions/integration');
    mkdirSync(testsDir, { recursive: true });
    for (const [filename, content] of Object.entries(tests)) {
      writeFileSync(resolve(testsDir, filename), content);
    }
  }

  return dir;
}

function runScript(dir, env = {}) {
  return spawnSync(process.execPath, ['scripts/check-edge-integration-coverage.mjs'], {
    cwd: dir,
    encoding: 'utf8',
    timeout: 15_000,
    env: { ...process.env, ...env },
  });
}

describe('check-edge-integration-coverage — gap real: falso-positivo por prefixo de nome', () => {
  it('não marca "quote-sync" como coberta só porque "quote-sync-promo-champions" tem teste', () => {
    const dir = makeFixture({
      functions: { 'quote-sync': true, 'quote-sync-promo-champions': true },
      tests: {
        'a.test.ts': "fetch('http://localhost/quote-sync-promo-champions', { method: 'POST' });",
      },
    });
    const result = runScript(dir);

    expect(result.stdout).toContain('Total de funções:   2');
    expect(result.stdout).toContain('Cobertas:           1');
    // Antes da correção, "quote-sync" aparecia como coberta (substring de
    // "/quote-sync-promo-champions"), mascarando a ausência real de teste.
    expect(result.stdout).toMatch(/⚠️[\s\S]*- quote-sync\n/);
    expect(result.stdout).not.toMatch(/- quote-sync-promo-champions/);
  });

  it('continua cobrindo "quote-sync-promo-champions" quando ela própria tem teste direto', () => {
    const dir = makeFixture({
      functions: { 'quote-sync': true, 'quote-sync-promo-champions': true },
      tests: {
        'a.test.ts': "fetch('http://localhost/quote-sync-promo-champions');",
      },
    });
    const result = runScript(dir);

    expect(result.stdout).not.toContain('- quote-sync-promo-champions');
  });
});

describe('check-edge-integration-coverage — comportamento básico (regressão)', () => {
  it('exit 0 quando a função é referenciada via path (/fn) em um teste', () => {
    const dir = makeFixture({
      functions: { 'quote-flow': true },
      tests: { 'a.test.ts': "fetch('http://localhost/quote-flow');" },
    });
    const result = runScript(dir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Cobertas:           1 (100%)');
  });

  it('exit 0 quando a função é referenciada via string entre aspas duplas', () => {
    const dir = makeFixture({
      functions: { 'quote-flow': true },
      tests: { 'a.test.ts': `mockEdgeFunctionFetch({ "quote-flow": spec });` },
    });
    const result = runScript(dir);

    expect(result.status).toBe(0);
  });

  it('exit 1 e lista a função sem teste quando cobertura fica abaixo do threshold', () => {
    const dir = makeFixture({
      functions: { 'quote-flow': true, 'image-proxy': true },
      tests: { 'a.test.ts': "fetch('http://localhost/quote-flow');" },
    });
    const result = runScript(dir);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Cobertura 50%/);
    expect(result.stdout).toContain('- image-proxy');
  });

  it('exit 0 com aviso quando supabase/functions não tem nenhuma função', () => {
    const dir = makeFixture({ functions: {} });
    const result = runScript(dir);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Nenhuma Edge Function encontrada/);
  });
});
