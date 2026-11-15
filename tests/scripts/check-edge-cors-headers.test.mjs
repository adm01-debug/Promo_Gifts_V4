// Testa scripts/check-edge-cors-headers.mjs, o gate que garante que toda
// edge function chamável pelo browser inclua `x-request-id` em
// Access-Control-Allow-Headers e o exponha via Access-Control-Expose-Headers
// (direto ou via `_shared/cors.ts`).
//
// O script não exporta funções puras (tudo roda em main() ao ser importado),
// então o padrão aqui é integração CLI real via spawnSync, com cwd apontando
// para uma fixture temporária em supabase/functions/ — mesmo padrão de
// tests/scripts/check-anon-write-grants.test.mjs (integração sem credenciais).
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/check-edge-cors-headers.mjs');

const SHARED_OK = `
export const ALLOWED_HEADERS_LIST = ["authorization", "x-client-info", "apikey", "content-type", "x-request-id"];
export function getCorsHeaders() {
  return {
    "Access-Control-Allow-Headers": ALLOWED_HEADERS_LIST.join(", "),
    "Access-Control-Expose-Headers": "x-request-id",
  };
}
`;

const temporaryRoots = [];
afterEach(() => {
  for (const dir of temporaryRoots.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'cors-gate-'));
  temporaryRoots.push(dir);
  return dir;
}

function writeFn(root, name, content) {
  const dir = join(root, 'supabase', 'functions', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.ts'), content);
}

function runGate(root) {
  return spawnSync('node', [SCRIPT], { cwd: root, encoding: 'utf8', timeout: 10000 });
}

// ─── repositório real ───────────────────────────────────────────────────────

describe('check-edge-cors-headers — repositório real', () => {
  it('passa (exit 0) contra supabase/functions/ real do repo', () => {
    const r = runGate(ROOT);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/CORS gate passed/);
  });
});

// ─── cenários via _shared/cors.ts ───────────────────────────────────────────

describe('check-edge-cors-headers — via _shared/cors.ts', () => {
  it('passa quando _shared/cors.ts é compliant e a função importa dele', () => {
    const root = tempRepo();
    mkdirSync(join(root, 'supabase', 'functions', '_shared'), { recursive: true });
    writeFileSync(join(root, 'supabase', 'functions', '_shared', 'cors.ts'), SHARED_OK);
    writeFn(root, 'my-func', `import { getCorsHeaders } from "../_shared/cors.ts";`);
    const r = runGate(root);
    expect(r.status).toBe(0);
  });

  it('falha quando ALLOWED_HEADERS_LIST não tem x-request-id', () => {
    const root = tempRepo();
    mkdirSync(join(root, 'supabase', 'functions', '_shared'), { recursive: true });
    writeFileSync(
      join(root, 'supabase', 'functions', '_shared', 'cors.ts'),
      `export const ALLOWED_HEADERS_LIST = ["authorization"];\nexport function getCorsHeaders() { return { "Access-Control-Allow-Headers": ALLOWED_HEADERS_LIST.join(", "), "Access-Control-Expose-Headers": "x-request-id" }; }`,
    );
    writeFn(root, 'my-func', `import { getCorsHeaders } from "../_shared/cors.ts";`);
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/ALLOWED_HEADERS_LIST missing "x-request-id"/);
  });

  it('falha quando falta Access-Control-Expose-Headers em _shared/cors.ts', () => {
    const root = tempRepo();
    mkdirSync(join(root, 'supabase', 'functions', '_shared'), { recursive: true });
    writeFileSync(
      join(root, 'supabase', 'functions', '_shared', 'cors.ts'),
      `export const ALLOWED_HEADERS_LIST = ["authorization", "x-request-id"];\nexport function getCorsHeaders() { return { "Access-Control-Allow-Headers": ALLOWED_HEADERS_LIST.join(", ") }; }`,
    );
    writeFn(root, 'my-func', `import { getCorsHeaders } from "../_shared/cors.ts";`);
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/missing "x-request-id" in Access-Control-Expose-Headers/);
  });

  // Regressão: antes da correção, _shared/cors.ts ausente derrubava o
  // processo com um ENOENT não tratado (stack trace do Node, sem exit code
  // documentado) — checkSharedCors() lê o arquivo incondicionalmente, mesmo
  // quando nenhuma função o importa. Isso é real: basta um PR renomear ou
  // apagar _shared/cors.ts para o gate virar um crash ilegível em vez de uma
  // falha compreensível. Rodado de fato (spawnSync real) antes e depois do
  // fix em try/catch ao redor de main().
  it('falha com mensagem legível (não um stack trace) quando _shared/cors.ts não existe', () => {
    const root = tempRepo();
    mkdirSync(join(root, 'supabase', 'functions'), { recursive: true });
    writeFn(root, 'my-func', `Deno.serve(() => new Response("ok"));`);
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/❌ Falha ao executar o gate CORS: ENOENT/);
    // Sem o fix, o stderr cru do Node inclui o frame da função interna —
    // garante que não voltamos a expor isso ao operador do gate.
    expect(r.stderr).not.toMatch(/at checkSharedCors/);
  });

  it('o mesmo crash ocorre mesmo sem nenhuma função declarada (supabase/functions vazio)', () => {
    const root = tempRepo();
    mkdirSync(join(root, 'supabase', 'functions'), { recursive: true });
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/❌ Falha ao executar o gate CORS: ENOENT/);
  });
});

// ─── cenários inline (sem _shared/cors.ts) ──────────────────────────────────

describe('check-edge-cors-headers — CORS inline', () => {
  function setupSharedOk(root) {
    mkdirSync(join(root, 'supabase', 'functions', '_shared'), { recursive: true });
    writeFileSync(join(root, 'supabase', 'functions', '_shared', 'cors.ts'), SHARED_OK);
  }

  it('falha quando uma função nova não declara CORS e não está na allowlist', () => {
    const root = tempRepo();
    setupSharedOk(root);
    writeFn(root, 'totally-new-fn', `Deno.serve(() => new Response("ok"));`);
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/totally-new-fn: no CORS configuration found/);
  });

  it('passa quando a função sem CORS está na SERVER_ONLY_ALLOWLIST', () => {
    const root = tempRepo();
    setupSharedOk(root);
    writeFn(root, 'cleanup-notifications', `Deno.serve(() => new Response("ok"));`);
    const r = runGate(root);
    expect(r.status).toBe(0);
  });

  it('função allowlisted que DECLARA CORS incompleto ainda falha (allowlist não é carta branca)', () => {
    const root = tempRepo();
    setupSharedOk(root);
    writeFn(
      root,
      'cleanup-notifications',
      `Deno.serve((req) => new Response("ok", { headers: { "Access-Control-Allow-Headers": "authorization" } }));`,
    );
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/cleanup-notifications: missing "x-request-id"/);
  });

  it('falha quando o CORS inline não inclui x-request-id em Allow-Headers', () => {
    const root = tempRepo();
    setupSharedOk(root);
    writeFn(
      root,
      'my-inline-fn',
      `Deno.serve((req) => new Response("ok", { headers: { "Access-Control-Allow-Headers": "authorization, apikey", "Access-Control-Expose-Headers": "x-request-id" } }));`,
    );
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/missing "x-request-id" in Access-Control-Allow-Headers/);
  });

  it('passa quando o CORS inline é totalmente compliant (sem usar _shared)', () => {
    const root = tempRepo();
    setupSharedOk(root);
    writeFn(
      root,
      'my-inline-fn',
      `Deno.serve((req) => new Response("ok", { headers: { "Access-Control-Allow-Headers": "authorization, x-request-id", "Access-Control-Expose-Headers": "x-request-id" } }));`,
    );
    const r = runGate(root);
    expect(r.status).toBe(0);
  });

  it('é case-insensitive nos nomes de header e nos tokens de valor', () => {
    const root = tempRepo();
    setupSharedOk(root);
    writeFn(
      root,
      'mixed-case-fn',
      `Deno.serve((req) => new Response("ok", { headers: { "Access-Control-Allow-Headers": "Authorization, X-Request-Id", "Access-Control-Expose-Headers": "X-Request-Id" } }));`,
    );
    const r = runGate(root);
    expect(r.status).toBe(0);
  });

  it('ignora diretórios _shared/* e tests/ mesmo que contenham index.ts sem CORS', () => {
    const root = tempRepo();
    setupSharedOk(root);
    writeFn(root, 'tests', `Deno.serve(() => new Response("ok"));`); // sem CORS, seria violação se escaneado
    writeFn(root, '_internal-helper', `Deno.serve(() => new Response("ok"));`);
    writeFn(root, 'real-fn', `import { getCorsHeaders } from "../_shared/cors.ts";`);
    const r = runGate(root);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/scanned 1 functions/);
  });

  it('ignora diretório de função sem index.ts', () => {
    const root = tempRepo();
    setupSharedOk(root);
    mkdirSync(join(root, 'supabase', 'functions', 'no-index-here'), { recursive: true });
    writeFileSync(join(root, 'supabase', 'functions', 'no-index-here', 'README.md'), 'sem index.ts');
    const r = runGate(root);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/scanned 0 functions/);
  });
});
