/**
 * Testes para scripts/e2e-smoke-coverage-doc.mjs (auditoria adversarial)
 *
 * Bug real encontrado: quando `e2e/routes/_catalog.ts` existe mas o parser
 * leve (`parseCatalog`, regex sobre `export const *_ROUTES = [...]`) não
 * encontra NENHUM objeto de rota — catálogo vazio, truncado ou com os
 * arrays `*_ROUTES` corrompidos/ausentes — o script seguia em frente,
 * gerava `docs/E2E_SMOKE_COVERAGE.md` inteiro preenchido com
 * "⚠ **ausente no catálogo**" para todas as features de `SMOKE_COVERAGE`,
 * e terminava com `exit 0` e a mensagem de sucesso "✅ Gerado: ...".
 *
 * Isso é um falso-negativo do gate: `--check` detectaria a doc como
 * "desatualizada" e sugeriria rodar o script sem `--check` para corrigir —
 * mas rodar sem `--check` justamente SOBRESCREVE a doc boa com a versão
 * cheia de avisos e reporta sucesso (exit 0), escondendo que o catálogo
 * (fonte de verdade) está quebrado, em vez de abortar com um erro claro.
 *
 * Corrigido com uma guarda logo após `parseCatalog`: se `entries.length === 0`,
 * o script agora aborta com `console.error` + `exit 1` antes de gerar
 * qualquer doc, em vez de produzir silenciosamente um documento todo
 * "ausente no catálogo" com exit 0.
 *
 * Nota: o script resolve `ROOT`/`CATALOG`/`SPEC`/`OUT` via
 * `resolve(dirname(fileURLToPath(import.meta.url)), "..")` — relativo ao
 * próprio arquivo do script, não ao cwd do processo. Por isso o sandbox
 * precisa conter uma cópia do script em `<sandbox>/scripts/...`, com
 * `<sandbox>/e2e/routes/_catalog.ts`, `<sandbox>/e2e/flows/20-all-features-smoke.spec.ts`
 * e `<sandbox>/docs/` nos caminhos relativos esperados.
 */
import { test, expect } from 'vitest';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REAL_SCRIPT = join(ROOT, 'scripts/e2e-smoke-coverage-doc.mjs');
const REAL_CATALOG = join(ROOT, 'e2e/routes/_catalog.ts');
const REAL_SPEC = join(ROOT, 'e2e/flows/20-all-features-smoke.spec.ts');

function makeSandbox(prefix) {
  const sandbox = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(sandbox, 'scripts'), { recursive: true });
  mkdirSync(join(sandbox, 'e2e/routes'), { recursive: true });
  mkdirSync(join(sandbox, 'e2e/flows'), { recursive: true });
  mkdirSync(join(sandbox, 'docs'), { recursive: true });
  copyFileSync(REAL_SCRIPT, join(sandbox, 'scripts/e2e-smoke-coverage-doc.mjs'));
  copyFileSync(REAL_CATALOG, join(sandbox, 'e2e/routes/_catalog.ts'));
  copyFileSync(REAL_SPEC, join(sandbox, 'e2e/flows/20-all-features-smoke.spec.ts'));
  return sandbox;
}

function run(sandbox, args = []) {
  const scriptPath = join(sandbox, 'scripts/e2e-smoke-coverage-doc.mjs');
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: sandbox,
    encoding: 'utf8',
    env: { ...process.env },
  });
  return { code: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function outPath(sandbox) {
  return join(sandbox, 'docs/E2E_SMOKE_COVERAGE.md');
}

test('catálogo vazio: aborta com exit 1 e mensagem clara, sem gerar doc (regressão: antes gerava doc com tudo "ausente" e exit 0)', () => {
  const sandbox = makeSandbox('e2e-smoke-doc-empty-catalog-');
  try {
    writeFileSync(join(sandbox, 'e2e/routes/_catalog.ts'), '');
    const { code, stdout, stderr } = run(sandbox);

    expect(code).toBe(1);
    expect(stderr).toMatch(/Nenhuma rota encontrada/);
    expect(stdout).not.toMatch(/✅ Gerado/);
    expect(existsSync(outPath(sandbox))).toBe(false);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('catálogo com conteúdo irrelevante (sem nenhum array *_ROUTES): mesma guarda, exit 1', () => {
  const sandbox = makeSandbox('e2e-smoke-doc-garbage-catalog-');
  try {
    writeFileSync(join(sandbox, 'e2e/routes/_catalog.ts'), '// arquivo corrompido, sem exports válidos\nexport const NADA = 1;\n');
    const { code, stderr } = run(sandbox);

    expect(code).toBe(1);
    expect(stderr).toMatch(/Nenhuma rota encontrada/);
    expect(existsSync(outPath(sandbox))).toBe(false);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('catálogo real (não vazio): continua gerando a doc normalmente com exit 0 (sem regressão)', () => {
  const sandbox = makeSandbox('e2e-smoke-doc-baseline-');
  try {
    const { code, stdout, stderr } = run(sandbox);

    expect(stderr).toBe('');
    expect(code).toBe(0);
    expect(stdout).toMatch(/✅ Gerado:/);
    expect(existsSync(outPath(sandbox))).toBe(true);

    const md = readFileSync(outPath(sandbox), 'utf8');
    expect(md).toMatch(/# Auditoria de cobertura — Smoke E2E/);
    expect(md).not.toMatch(/\*\*ausente no catálogo\*\*/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('--check com doc já em dia (catálogo real): exit 0', () => {
  const sandbox = makeSandbox('e2e-smoke-doc-check-ok-');
  try {
    run(sandbox); // gera a doc
    const { code, stdout } = run(sandbox, ['--check']);

    expect(code).toBe(0);
    expect(stdout).toMatch(/em dia/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('--check sem doc existente (primeira execução): reporta desatualizado com exit 1', () => {
  const sandbox = makeSandbox('e2e-smoke-doc-check-first-run-');
  try {
    const { code, stderr } = run(sandbox, ['--check']);

    expect(code).toBe(1);
    expect(stderr).toMatch(/desatualizado/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('SMOKE_COVERAGE ausente no spec: erro claro (mesmo com catálogo válido)', () => {
  const sandbox = makeSandbox('e2e-smoke-doc-no-coverage-array-');
  try {
    writeFileSync(join(sandbox, 'e2e/flows/20-all-features-smoke.spec.ts'), '// spec corrompido, sem SMOKE_COVERAGE\n');
    const { code, stderr } = run(sandbox);

    expect(code).toBe(1);
    expect(stderr).toMatch(/SMOKE_COVERAGE não encontrado/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('argumentos extras/desconhecidos (--bogus, --help, caminho com traversal) são ignorados e não afetam o modo write', () => {
  const sandbox = makeSandbox('e2e-smoke-doc-extra-args-');
  try {
    const { code, stdout } = run(sandbox, ['--bogus', '--help', '../../../etc/passwd']);

    expect(code).toBe(0);
    expect(stdout).toMatch(/✅ Gerado:/);
    expect(existsSync(outPath(sandbox))).toBe(true);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('catálogo com BOM UTF-8 e CRLF: ainda parseia corretamente (sem regressão de encoding)', () => {
  const sandbox = makeSandbox('e2e-smoke-doc-bom-crlf-');
  try {
    const original = readFileSync(join(sandbox, 'e2e/routes/_catalog.ts'), 'utf8');
    const mutated = '﻿' + original.replace(/\n/g, '\r\n');
    writeFileSync(join(sandbox, 'e2e/routes/_catalog.ts'), mutated);

    const { code, stdout } = run(sandbox);

    expect(code).toBe(0);
    expect(stdout).toMatch(/✅ Gerado:/);
    expect(existsSync(outPath(sandbox))).toBe(true);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
