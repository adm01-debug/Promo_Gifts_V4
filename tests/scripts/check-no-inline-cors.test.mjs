// Testa scripts/check-no-inline-cors.mjs, o gate que bane literais de string
// `Access-Control-Allow-Headers` dentro do index.ts de qualquer edge function
// (toda função deve usar os helpers SSOT de `_shared/cors.ts`).
//
// O script não exporta funções puras (tudo roda no nível do módulo ao ser
// importado), então o padrão aqui é integração CLI real via spawnSync, com
// cwd apontando para uma fixture temporária em supabase/functions/ — mesmo
// padrão de tests/scripts/check-edge-cors-headers.test.mjs.
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/check-no-inline-cors.mjs');

const temporaryRoots = [];
afterEach(() => {
  for (const dir of temporaryRoots.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'no-inline-cors-gate-'));
  temporaryRoots.push(dir);
  return dir;
}

function writeFn(root, name, content) {
  const dir = join(root, 'supabase', 'functions', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.ts'), content);
  return dir;
}

function runGate(root) {
  return spawnSync('node', [SCRIPT], { cwd: root, encoding: 'utf8', timeout: 10000 });
}

// ─── repositório real ───────────────────────────────────────────────────────

describe('check-no-inline-cors — repositório real', () => {
  it('passa (exit 0) contra supabase/functions/ real do repo', () => {
    const r = runGate(ROOT);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/No inline CORS literals/);
  });
});

// ─── cenários básicos ───────────────────────────────────────────────────────

describe('check-no-inline-cors — cenários básicos', () => {
  it('passa quando supabase/functions/ está vazio', () => {
    const root = tempRepo();
    mkdirSync(join(root, 'supabase', 'functions'), { recursive: true });
    const r = runGate(root);
    expect(r.status).toBe(0);
  });

  it('ignora função sem index.ts', () => {
    const root = tempRepo();
    mkdirSync(join(root, 'supabase', 'functions', 'no-index'), { recursive: true });
    writeFileSync(join(root, 'supabase', 'functions', 'no-index', 'README.md'), 'sem index.ts');
    const r = runGate(root);
    expect(r.status).toBe(0);
  });

  it('falha quando um index.ts declara Access-Control-Allow-Headers inline (aspas duplas)', () => {
    const root = tempRepo();
    writeFn(root, 'bad-fn', `Deno.serve((req) => new Response("ok", { headers: { "Access-Control-Allow-Headers": "authorization" } }));`);
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/bad-fn: declares "Access-Control-Allow-Headers" inline/);
  });

  it('detecta a violação com aspas simples e com crase (template literal)', () => {
    const root = tempRepo();
    writeFn(root, 'fn-single', `const h = { 'Access-Control-Allow-Headers': 'x' };`);
    writeFn(root, 'fn-backtick', 'const h = { `Access-Control-Allow-Headers`: "x" };');
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/fn-single: declares/);
    expect(r.stderr).toMatch(/fn-backtick: declares/);
  });

  it('é case-insensitive no nome do header', () => {
    const root = tempRepo();
    writeFn(root, 'fn-case', `const h = { "access-control-allow-headers": "x" };`);
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/fn-case: declares/);
  });

  it('passa quando a função usa getCorsHeaders() do _shared/cors.ts (sem literal próprio)', () => {
    const root = tempRepo();
    writeFn(root, 'good-fn', `import { getCorsHeaders } from "../_shared/cors.ts";`);
    const r = runGate(root);
    expect(r.status).toBe(0);
  });

  it('ignora supabase/functions/_shared/ e /tests/ mesmo que contenham o literal banido', () => {
    const root = tempRepo();
    writeFn(root, '_shared', `export const h = "Access-Control-Allow-Headers";`);
    writeFn(root, 'tests', `export const h = "Access-Control-Allow-Headers";`);
    const r = runGate(root);
    expect(r.status).toBe(0);
  });

  it('reporta múltiplas violações de uma vez, uma por função', () => {
    const root = tempRepo();
    writeFn(root, 'bad-one', `const h = { "Access-Control-Allow-Headers": "a" };`);
    writeFn(root, 'bad-two', `const h = { "Access-Control-Allow-Headers": "b" };`);
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/\(2 violations\)/);
    expect(r.stderr).toMatch(/bad-one: declares/);
    expect(r.stderr).toMatch(/bad-two: declares/);
  });
});

// ─── encoding / conteúdo do arquivo ─────────────────────────────────────────

describe('check-no-inline-cors — encoding e conteúdo do arquivo', () => {
  it('detecta a violação mesmo com BOM UTF-8 no início do arquivo', () => {
    const root = tempRepo();
    const dir = join(root, 'supabase', 'functions', 'bom-fn');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.ts'), Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from('const h = { "Access-Control-Allow-Headers": "x" };\n', 'utf8'),
    ]));
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/bom-fn: declares/);
  });

  it('detecta a violação com quebras de linha CRLF', () => {
    const root = tempRepo();
    const dir = join(root, 'supabase', 'functions', 'crlf-fn');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.ts'), 'const x = 1;\r\nconst h = { "Access-Control-Allow-Headers": "x" };\r\n');
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/crlf-fn: declares/);
  });

  it('não crasha com um index.ts vazio', () => {
    const root = tempRepo();
    writeFn(root, 'empty-fn', '');
    const r = runGate(root);
    expect(r.status).toBe(0);
  });

  it('não crasha e passa quando index.ts é um diretório (não um arquivo)', () => {
    const root = tempRepo();
    mkdirSync(join(root, 'supabase', 'functions', 'dirtrap-fn', 'index.ts'), { recursive: true });
    const r = runGate(root);
    expect(r.status).toBe(0);
  });

  it('não crasha com um symlink quebrado dentro de supabase/functions/', () => {
    const root = tempRepo();
    mkdirSync(join(root, 'supabase', 'functions'), { recursive: true });
    symlinkSync('/nonexistent/target', join(root, 'supabase', 'functions', 'broken-link'));
    const r = runGate(root);
    expect(r.status).toBe(0);
  });
});

// ─── regressão: exceções não tratadas viravam stack trace ilegível ──────────
//
// Antes do fix, listFunctions() chamava readdirSync(FN_DIR) e o loop principal
// chamava readFileSync(path) sem nenhum try/catch ao redor: se
// supabase/functions/ não existisse (ENOENT) ou um index.ts não pudesse ser
// lido (EACCES), o processo morria com o stack trace crú do Node em vez de
// uma mensagem compreensível — exatamente o gap já corrigido antes no script
// irmão check-edge-cors-headers.mjs. Rodado de fato (spawnSync real) antes e
// depois do fix em try/catch ao redor de main().
describe('check-no-inline-cors — regressão: erro legível em vez de stack trace', () => {
  it('falha com mensagem legível quando supabase/functions/ não existe (ENOENT)', () => {
    const root = tempRepo();
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/❌ Falha ao executar o gate de CORS inline: ENOENT/);
    // Sem o fix, o stderr cru do Node inclui o frame da função interna —
    // garante que não voltamos a expor isso ao operador do gate.
    expect(r.stderr).not.toMatch(/at listFunctions/);
  });

  it('falha com mensagem legível quando um index.ts não pode ser lido (EACCES)', () => {
    const root = tempRepo();
    const dir = writeFn(root, 'noperm-fn', `const h = { "Access-Control-Allow-Headers": "x" };`);
    chmodSync(join(dir, 'index.ts'), 0o000);
    try {
      // Como root, chmod 000 não bloqueia leitura — este cenário só é
      // observável rodando como usuário não-root. Se o chmod realmente
      // impedir a leitura (Node recebe EACCES), a mensagem deve ser limpa;
      // caso contrário (root ignorando a permissão), o gate roda normalmente.
      const r = runGate(root);
      if (r.status === 1 && /EACCES/.test(r.stderr)) {
        expect(r.stderr).toMatch(/❌ Falha ao executar o gate de CORS inline: EACCES/);
        expect(r.stderr).not.toMatch(/at readFileSync/);
      } else {
        expect([0, 1]).toContain(r.status);
      }
    } finally {
      chmodSync(join(dir, 'index.ts'), 0o644);
    }
  });
});
