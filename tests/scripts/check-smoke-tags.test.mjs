/**
 * Tests for scripts/check-smoke-tags.mjs
 *
 * O script garante que todo `test(...)` em
 * `e2e/flows/20-all-features-smoke.spec.ts` está dentro de um
 * `test.describe(...)` cujo título contenha a tag `@smoke` — o project
 * Playwright `chromium-smoke` roda com `grep: /@smoke/` (playwright.config.ts)
 * e um test fora desse describe fica silenciosamente IGNORADO pelo gate.
 * Sai com:
 *   - 2 se o spec não existe (ou não pode ser lido)
 *   - 1 se há test(s) fora de describe @smoke, OU se SMOKE_COVERAGE está vazio
 *   - 0 caso contrário
 *
 * O script NÃO usa `process.cwd()` para resolver o caminho do spec — usa
 * `import.meta.url` (a localização do próprio arquivo do script) via
 * `ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")`. Por isso,
 * ao contrário de outros scripts testados com `cwd` apontando pra uma
 * sandbox (ex.: check-product-type-fields.test.mjs), aqui é necessário
 * COPIAR o próprio script para dentro da sandbox, em `scripts/check-smoke-
 * tags.mjs`, e criar o spec fixture em `e2e/flows/20-all-features-smoke.spec.ts`
 * relativo a essa cópia — só assim o ROOT resolvido pelo script aponta pra
 * sandbox em vez do repo real.
 *
 * Achado real coberto por esta extensão (evidência de execução antes da
 * correção, ver histórico do PR):
 *
 * 1. Quando o caminho do spec (`e2e/flows/20-all-features-smoke.spec.ts`)
 *    existe mas é um DIRETÓRIO (não um arquivo) — `existsSync(SPEC)` retorna
 *    `true`, então o guard de "não encontrado" não disparava, e o
 *    `readFileSync(SPEC, "utf8")` seguinte estourava `EISDIR` como exceção
 *    NÃO TRATADA: o processo terminava com um stack trace cru do Node
 *    (exit code 1, incidental — não um exit limpo do gate) em vez de uma
 *    mensagem de erro útil e um exit code de "spec inválido" (2, mesmo
 *    código usado para "spec não encontrado"). Reproduzido com `mkdirSync`
 *    no lugar do arquivo, mesmo padrão de
 *    tests/scripts/check-product-type-fields.test.mjs.
 */

import assert from 'node:assert/strict';
import {
  mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { test, describe } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');
const REAL_SCRIPT = join(ROOT, 'scripts/check-smoke-tags.mjs');

/**
 * Cria uma sandbox com `scripts/check-smoke-tags.mjs` (cópia do script real)
 * e `e2e/flows/20-all-features-smoke.spec.ts` (fixture), porque o script
 * resolve o caminho do spec relativo à SUA PRÓPRIA localização
 * (`import.meta.url`), não ao cwd do processo.
 */
function makeSandbox(prefix) {
  const sandbox = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(sandbox, 'scripts'), { recursive: true });
  mkdirSync(join(sandbox, 'e2e/flows'), { recursive: true });
  cpSync(REAL_SCRIPT, join(sandbox, 'scripts/check-smoke-tags.mjs'));
  return sandbox;
}

function specPath(sandbox) {
  return join(sandbox, 'e2e/flows/20-all-features-smoke.spec.ts');
}

function run(sandbox) {
  return spawnSync(
    process.execPath,
    [join(sandbox, 'scripts/check-smoke-tags.mjs')],
    { encoding: 'utf8', cwd: sandbox },
  );
}

const VALID_SPEC = `
import { test } from "@playwright/test";
const SMOKE_COVERAGE = ["login"] as const;

test.describe("@smoke grupo", () => {
  test("faz login", async ({ page }) => {
    await page.goto("/");
  });
});
`;

describe('check-smoke-tags.mjs — comportamento básico', () => {
  test('exit=0 quando todo test() está sob describe @smoke', () => {
    const sandbox = makeSandbox('smoke-ok-');
    try {
      writeFileSync(specPath(sandbox), VALID_SPEC);
      const result = run(sandbox);
      assert.equal(result.status, 0);
      assert.match(result.stdout, /estão sob describe @smoke/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('exit=1 quando há test() fora de describe @smoke', () => {
    const sandbox = makeSandbox('smoke-violation-');
    try {
      writeFileSync(
        specPath(sandbox),
        `
        import { test } from "@playwright/test";
        const SMOKE_COVERAGE = ["x"] as const;
        test.describe("sem tag", () => {
          test("teste perdido", async ({ page }) => { await page.goto("/"); });
        });
        `,
      );
      const result = run(sandbox);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /FORA de describe @smoke/);
      assert.match(result.stderr, /teste perdido/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('exit=1 quando SMOKE_COVERAGE está vazio/ausente', () => {
    const sandbox = makeSandbox('smoke-empty-cov-');
    try {
      writeFileSync(specPath(sandbox), '// spec sem SMOKE_COVERAGE nem tests\n');
      const result = run(sandbox);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /SMOKE_COVERAGE está vazio/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('exit=2 quando o spec não existe', () => {
    const sandbox = makeSandbox('smoke-nofile-');
    try {
      const result = run(sandbox);
      assert.equal(result.status, 2);
      assert.match(result.stderr, /não encontrado/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('pop correto da pilha de describes: test() depois do describe fechar continua violação', () => {
    const sandbox = makeSandbox('smoke-pop-');
    try {
      writeFileSync(
        specPath(sandbox),
        `
        import { test } from "@playwright/test";
        const SMOKE_COVERAGE = ["x"] as const;
        test.describe("@smoke grupo", () => {
          test("dentro", async ({ page }) => { await page.goto("/"); });
        });
        test("fora depois do describe fechar", async ({ page }) => { await page.goto("/"); });
        `,
      );
      const result = run(sandbox);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /fora depois do describe fechar/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
});

describe('check-smoke-tags.mjs — achado real: spec existente como DIRETÓRIO (EISDIR)', () => {
  test('exit=2 com mensagem limpa (não crasha com stack trace cru) quando o caminho do spec é um diretório', () => {
    const sandbox = makeSandbox('smoke-eisdir-');
    try {
      // Reproduz o caso real: o caminho existe (existsSync === true) mas é
      // um diretório, não um arquivo — readFileSync estoura EISDIR.
      mkdirSync(specPath(sandbox), { recursive: true });
      const result = run(sandbox);
      // Antes da correção: result.status === 1 (crash não tratado, Node
      // uncaughtException) e stderr continha um stack trace cru
      // ("at readFileSync (node:fs...")) em vez de uma mensagem do gate.
      assert.equal(result.status, 2);
      assert.match(result.stderr, /não pôde ser lido/);
      assert.doesNotMatch(result.stderr, /at readFileSync/);
      assert.doesNotMatch(result.stderr, /Node\.js v/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
});
