/**
 * Tests for scripts/fix-edge-cors-allowlist.mjs
 *
 * Bugs found during adversarial testing (both reproduced against the
 * unpatched script before fixing):
 *
 * 1) Quando o último `import { ... } from "...";` do arquivo é multilinha,
 *    o script detectava a linha do último import só pela regex
 *    `/^\s*import\s/`, que casa na linha `import {` — não na linha onde a
 *    instrução termina (`} from "...";`). A declaração era inserida DENTRO
 *    das chaves do import, quebrando a sintaxe do arquivo
 *    (`SyntaxError: Unexpected reserved word`).
 *
 * 2) Quando `corsHeaders` já chegava via import nomeado
 *    (`import { corsHeaders } from "../_shared/cors.ts"`, sem `const/let/var`),
 *    `hasDeclaration` só reconhecia declarações `const|let|var corsHeaders`
 *    e não via o import como declaração. O script inseria um
 *    `const corsHeaders = ...` duplicado, quebrando o arquivo
 *    (`SyntaxError: Identifier 'corsHeaders' has already been declared`).
 *
 * Fix: (1) ao achar uma linha `import`, o script agora avança até a linha
 * que termina com `;` antes de fixar `lastImport`; (2) `hasDeclaration`
 * agora também reconhece `import { ..., corsHeaders, ... } from "...";`
 * como declaração válida.
 *
 * Estes testes rodam o script real via spawnSync contra diretórios de
 * fixture isolados sob o tmpdir do SO — nunca contra o
 * `supabase/functions` real do repo.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * `node --check` em um arquivo `.ts` NÃO valida sintaxe de verdade (Node
 * aceita até `import { const x = 1; y } from "...";` sem erro nessa
 * extensão — verificado manualmente). Para provar de fato que o arquivo
 * gerado é ESM sintaticamente válido, copiamos o conteúdo para um `.mjs`
 * antes de checar.
 */
function assertValidEsm(tsPath) {
  const mjsPath = tsPath.replace(/\.ts$/, '.check.mjs');
  writeFileSync(mjsPath, readFileSync(tsPath, 'utf8'));
  const check = spawnSync(process.execPath, ['--check', mjsPath], { encoding: 'utf8' });
  if (check.status !== 0) {
    throw new Error(`esperado ESM válido, mas node --check falhou: ${check.stderr}`);
  }
}

const SCRIPT = resolve(process.cwd(), 'scripts/fix-edge-cors-allowlist.mjs');

// Nome precisa estar na lista FILES hardcoded do script.
const FN = 'bi-copilot';

const tempRoots = [];

function makeFixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'fix-edge-cors-allowlist-test-'));
  tempRoots.push(root);
  return root;
}

function writeFn(root, source) {
  const dir = join(root, 'supabase', 'functions', FN);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.ts'), source);
  return join(dir, 'index.ts');
}

function run(root) {
  return spawnSync(process.execPath, [SCRIPT], {
    cwd: root,
    encoding: 'utf8',
    timeout: 15_000,
  });
}

afterEach(() => {
  while (tempRoots.length) {
    const root = tempRoots.pop();
    rmSync(root, { recursive: true, force: true });
  }
});

describe('fix-edge-cors-allowlist.mjs — regression (bugs found via adversarial testing)', () => {
  it('não corrompe a sintaxe quando o último import é multilinha', () => {
    const root = makeFixtureRoot();
    const file = writeFn(
      root,
      [
        'import { serve } from "std/http/server.ts";',
        'import {',
        '  getCorsHeaders,',
        '  assertSwitchEnabled,',
        '} from "../_shared/cors.ts";',
        '',
        'serve(async (req) => {',
        '  return new Response("ok", { headers: corsHeaders });',
        '});',
        '',
      ].join('\n'),
    );

    const result = run(root);
    expect(result.status).toBe(0);

    const after = readFileSync(file, 'utf8');
    // A declaração precisa ter sido inserida DEPOIS do import completo,
    // nunca entre as chaves `{ ... }` dele.
    expect(after).toMatch(
      /\}\s*from\s*"\.\.\/_shared\/cors\.ts";[\s\S]*const corsHeaders = getCorsHeaders/,
    );
    expect(after).not.toMatch(/import\s*\{[^}]*const corsHeaders/);

    // Prova definitiva: o arquivo resultante precisa ser JS/ESM válido.
    assertValidEsm(file);
  });

  it('não duplica a declaração quando corsHeaders já vem de um import nomeado', () => {
    const root = makeFixtureRoot();
    const source = [
      'import { serve } from "std/http/server.ts";',
      'import { corsHeaders } from "../_shared/cors.ts";',
      '',
      'serve(async (req) => {',
      '  return new Response("ok", { headers: corsHeaders });',
      '});',
      '',
    ].join('\n');
    const file = writeFn(root, source);

    const result = run(root);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Fixed: 0');

    // Arquivo não deve ter sido alterado — já estava correto.
    expect(readFileSync(file, 'utf8')).toBe(source);
  });

  it('continua inserindo corretamente quando o último import é de uma linha só (comportamento pré-existente preservado)', () => {
    const root = makeFixtureRoot();
    const file = writeFn(
      root,
      [
        'import { serve } from "std/http/server.ts";',
        'import { getCorsHeaders } from "../_shared/cors.ts";',
        '',
        'serve(async (req) => {',
        '  return new Response("ok", { headers: corsHeaders });',
        '});',
        '',
      ].join('\n'),
    );

    const result = run(root);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Fixed: 1');

    const after = readFileSync(file, 'utf8');
    expect(after).toContain('const corsHeaders = getCorsHeaders(new Request(');
    assertValidEsm(file);

    // Idempotência: rodar de novo não deve alterar nada.
    const second = run(root);
    expect(second.stdout).toContain('Fixed: 0');
    expect(readFileSync(file, 'utf8')).toBe(after);
  });
});
