/**
 * Testes para scripts/e2e-mock-auth-setup.mjs (auditoria adversarial)
 *
 * Bug real encontrado: `const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:8080"`
 * usava `??`, que só cai no default quando a env var é `undefined`/`null`.
 * Uma env var DEFINIDA mas VAZIA (ou só espaços) — cenário comum em CI,
 * onde `E2E_BASE_URL=""` ou um secret/var não configurado interpola para
 * string vazia em vez de ficar unset — chegava como `""` até `new URL("")`,
 * que lança `TypeError: Invalid URL` não tratado: o script crashava com um
 * stack trace cru do Node (exit 1), sem nenhuma mensagem útil sobre a
 * causa real (env var vazia), e sem gerar o storageState que os specs E2E
 * (via `E2E_MOCK_AUTH=1`) dependem para não cair no gate de
 * `authStorageHasCookies` do `e2e/fixtures/test-base.ts`.
 *
 * Corrigido trocando para `process.env.E2E_BASE_URL?.trim() || "http://localhost:8080"`,
 * que trata string vazia/whitespace-only como "não fornecida" (mesmo
 * comportamento de fallback do `undefined`), preservando o uso de uma URL
 * customizada válida.
 *
 * Nota: o script resolve `ROOT`/`OUT` como `path.resolve(__dirname, "..")`
 * — relativo ao próprio arquivo do script, não ao cwd do processo. Por
 * isso o sandbox precisa conter uma cópia do script em
 * `<sandbox>/scripts/...`, para que `OUT` aponte para
 * `<sandbox>/e2e/.auth/storageState.json`.
 */
import { test, expect } from 'vitest';
import { mkdtempSync, mkdirSync, copyFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REAL_SCRIPT = join(ROOT, 'scripts/e2e-mock-auth-setup.mjs');

function makeSandbox(prefix) {
  const sandbox = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(sandbox, 'scripts'), { recursive: true });
  copyFileSync(REAL_SCRIPT, join(sandbox, 'scripts/e2e-mock-auth-setup.mjs'));
  return sandbox;
}

function run(sandbox, env) {
  const scriptPath = join(sandbox, 'scripts/e2e-mock-auth-setup.mjs');
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: sandbox,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return { code: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function storageStatePath(sandbox) {
  return join(sandbox, 'e2e/.auth/storageState.json');
}

test('cai no default http://localhost:8080 quando E2E_BASE_URL é string vazia (regressão: crash não tratado)', () => {
  const sandbox = makeSandbox('e2e-mock-auth-empty-');
  try {
    // Antes da correção: exit 1, stderr com TypeError/Invalid URL cru do
    // Node, e o storageState.json nem chegava a ser escrito.
    const { code, stdout, stderr } = run(sandbox, { E2E_BASE_URL: '' });

    expect(stderr).toBe('');
    expect(code).toBe(0);
    expect(stdout).toMatch(/base_url\s+=\s+http:\/\/localhost:8080/);

    const outPath = storageStatePath(sandbox);
    expect(existsSync(outPath)).toBe(true);
    const state = JSON.parse(readFileSync(outPath, 'utf-8'));
    expect(state.origins[0].origin).toBe('http://localhost:8080');
    expect(state.cookies[0].domain).toBe('localhost');
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('cai no default http://localhost:8080 quando E2E_BASE_URL é só espaços (regressão: crash não tratado)', () => {
  const sandbox = makeSandbox('e2e-mock-auth-whitespace-');
  try {
    const { code, stdout, stderr } = run(sandbox, { E2E_BASE_URL: '   ' });

    expect(stderr).toBe('');
    expect(code).toBe(0);
    expect(stdout).toMatch(/base_url\s+=\s+http:\/\/localhost:8080/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('usa E2E_BASE_URL customizado e válido sem alterar o comportamento normal', () => {
  const sandbox = makeSandbox('e2e-mock-auth-custom-');
  try {
    const { code, stdout } = run(sandbox, { E2E_BASE_URL: 'https://meusite.com.br:3000' });

    expect(code).toBe(0);
    expect(stdout).toMatch(/base_url\s+=\s+https:\/\/meusite\.com\.br:3000/);

    const state = JSON.parse(readFileSync(storageStatePath(sandbox), 'utf-8'));
    expect(state.origins[0].origin).toBe('https://meusite.com.br:3000');
    expect(state.cookies[0].domain).toBe('meusite.com.br');
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('faz trim de espaços nas bordas de uma E2E_BASE_URL customizada válida', () => {
  const sandbox = makeSandbox('e2e-mock-auth-trim-');
  try {
    const { code, stdout } = run(sandbox, { E2E_BASE_URL: '  https://trimtest.com  ' });

    expect(code).toBe(0);
    expect(stdout).toMatch(/base_url\s+=\s+https:\/\/trimtest\.com/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('sem E2E_BASE_URL (unset) continua usando o default http://localhost:8080', () => {
  const sandbox = makeSandbox('e2e-mock-auth-unset-');
  try {
    const env = { ...process.env };
    delete env.E2E_BASE_URL;
    const scriptPath = join(sandbox, 'scripts/e2e-mock-auth-setup.mjs');
    const result = spawnSync(process.execPath, [scriptPath], { cwd: sandbox, encoding: 'utf8', env });

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/base_url\s+=\s+http:\/\/localhost:8080/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
