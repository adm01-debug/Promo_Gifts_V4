/**
 * Tests for scripts/migrate-edge-cors-allowlist.mjs
 *
 * Bug found during adversarial testing (reproduced against the unpatched
 * script before fixing, with evidence against a pattern that exists for
 * real in supabase/functions/bi-copilot/index.ts — a function that IS in
 * this script's TARGETS list):
 *
 * A última etapa do codemod troca toda referência livre ao identificador
 * `corsHeaders` por uma chamada `getCorsHeaders(req)`. Duas formas de uso
 * comuns no código real quebravam:
 *
 * 1) Spread `{ ...corsHeaders, 'Content-Type': ... }` — a regra geral
 *    exclui identificadores precedidos de `.` (para não tocar em acesso de
 *    propriedade como `obj.corsHeaders`), mas essa exclusão também pegava o
 *    `.` final de `...`. A referência ficava intocada, apontando para um
 *    identificador que o próprio script removeu (a const local foi deletada
 *    no passo anterior) — `ReferenceError: corsHeaders is not defined` em
 *    runtime, de forma silenciosa (o script reporta "✔ migrado").
 *
 * 2) Propriedade shorthand `{ corsHeaders }` (usado como em
 *    `parseContract(req, Schemas, { corsHeaders })` no bi-copilot real) —
 *    virava `{ getCorsHeaders(req) }`, que é `SyntaxError: Unexpected token
 *    '}'` (call expression não é shorthand property válida). Arquivo
 *    corrompido, novamente reportado como "✔ migrado".
 *
 * Fix: trata os dois casos ANTES da troca geral — expande `...corsHeaders`
 * para `...getCorsHeaders(req)` e `{ corsHeaders }`/`{ corsHeaders,}` para
 * `{ corsHeaders: getCorsHeaders(req) }`; a regra geral passa a também
 * ignorar identificadores seguidos de `:` para não reescrever essa chave
 * recém-expandida.
 *
 * Estes testes rodam o script real via spawnSync contra diretórios de
 * fixture isolados sob o tmpdir do SO — nunca contra o `supabase/functions`
 * real do repo.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/migrate-edge-cors-allowlist.mjs');

// Precisa estar na lista TARGETS hardcoded do script (e fora de SKIP).
const FN = 'bi-copilot';

const STANDARD_LITERAL = `const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
`;

const tempRoots = [];

function makeFixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'migrate-edge-cors-allowlist-test-'));
  tempRoots.push(root);
  return root;
}

function writeFn(root, source, fn = FN) {
  const dir = join(root, 'supabase', 'functions', fn);
  mkdirSync(dir, { recursive: true });
  const p = join(dir, 'index.ts');
  writeFileSync(p, source);
  return p;
}

function run(root) {
  return spawnSync(process.execPath, [SCRIPT], {
    cwd: root,
    encoding: 'utf8',
    timeout: 15_000,
  });
}

/**
 * `node --check` em `.ts` não valida sintaxe de verdade (Node aceita
 * conteúdo que não é JS/TS válido nessa extensão). Copiamos para `.mjs`
 * antes de checar, igual ao padrão de fix-edge-cors-allowlist.test.mjs.
 */
function assertValidEsm(tsPath) {
  const mjsPath = tsPath.replace(/\.ts$/, '.check.mjs');
  writeFileSync(mjsPath, readFileSync(tsPath, 'utf8'));
  const check = spawnSync(process.execPath, ['--check', mjsPath], { encoding: 'utf8' });
  if (check.status !== 0) {
    throw new Error(`esperado ESM válido, mas node --check falhou: ${check.stderr}`);
  }
}

afterEach(() => {
  while (tempRoots.length) {
    const root = tempRoots.pop();
    rmSync(root, { recursive: true, force: true });
  }
});

describe('migrate-edge-cors-allowlist.mjs — regression (bug found via teste adversarial)', () => {
  it('expande `...corsHeaders` (spread) para `...getCorsHeaders(req)` em vez de deixar a referência órfã', () => {
    const root = makeFixtureRoot();
    const file = writeFn(
      root,
      [
        'import { serve } from "std/http/server.ts";',
        STANDARD_LITERAL,
        'serve(async (req) => {',
        '  return new Response("err", { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });',
        '});',
        '',
      ].join('\n'),
    );

    const result = run(root);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Migradas: 1');

    const after = readFileSync(file, 'utf8');
    expect(after).toContain('...getCorsHeaders(req)');
    // Não pode sobrar referência órfã ao identificador que foi removido.
    expect(after).not.toMatch(/(?<![\w.$"'`])corsHeaders(?![\w$])/);

    assertValidEsm(file);
  });

  it('expande propriedade shorthand `{ corsHeaders }` para `{ corsHeaders: getCorsHeaders(req) }` em vez de gerar sintaxe inválida', () => {
    const root = makeFixtureRoot();
    const file = writeFn(
      root,
      [
        'import { serve } from "std/http/server.ts";',
        STANDARD_LITERAL,
        'function buildResponseInit() {',
        '  return { corsHeaders };',
        '}',
        '',
        'serve(async (req) => {',
        '  const init = buildResponseInit();',
        '  return new Response("ok", init);',
        '});',
        '',
      ].join('\n'),
    );

    const result = run(root);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Migradas: 1');

    const after = readFileSync(file, 'utf8');
    expect(after).toContain('{ corsHeaders: getCorsHeaders(req) }');
    expect(after).not.toContain('{ getCorsHeaders(req) }');

    assertValidEsm(file);
  });

  it('combinação real (shorthand + spread + uso simples, igual ao padrão de supabase/functions/bi-copilot/index.ts) produz ESM válido', () => {
    const root = makeFixtureRoot();
    const file = writeFn(
      root,
      [
        'import { serve } from "std/http/server.ts";',
        STANDARD_LITERAL,
        'serve(async (req) => {',
        '  const contractResult = await parseContract(req, Schemas, { corsHeaders });',
        '  if (bad) {',
        '    return new Response("x", { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });',
        '  }',
        '  return new Response("ok", { headers: corsHeaders });',
        '});',
        '',
      ].join('\n'),
    );

    const result = run(root);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Migradas: 1');

    const after = readFileSync(file, 'utf8');
    expect(after).toContain('{ corsHeaders: getCorsHeaders(req) }');
    expect(after).toContain('...getCorsHeaders(req)');
    expect(after).toContain('headers: getCorsHeaders(req)');
    // Nenhuma referência a `corsHeaders` deve sobrar fora da chave recém
    // expandida (`corsHeaders: getCorsHeaders(req)`, válida e esperada).
    expect(after).not.toMatch(/(?<![\w.$"'`])corsHeaders(?![\w$:])/);

    assertValidEsm(file);
  });

  it('não regride o caso simples (uso só como valor de propriedade nomeada)', () => {
    const root = makeFixtureRoot();
    const file = writeFn(
      root,
      [
        'import { serve } from "std/http/server.ts";',
        STANDARD_LITERAL,
        'serve(async (req) => {',
        '  return new Response("ok", { headers: corsHeaders });',
        '});',
        '',
      ].join('\n'),
    );

    const result = run(root);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Migradas: 1');

    const after = readFileSync(file, 'utf8');
    expect(after).toContain('headers: getCorsHeaders(req)');
    expect(after).toContain('import { getCorsHeaders } from "../_shared/cors.ts";');

    assertValidEsm(file);
  });
});
