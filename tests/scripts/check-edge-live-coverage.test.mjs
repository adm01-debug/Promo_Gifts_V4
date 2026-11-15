// Testa scripts/check-edge-live-coverage.mjs, o gate que garante que toda
// edge function deployada (supabase/functions/<fn>/index.ts) tenha um teste
// de integração LIVE real em tests/edge-functions/live/<fn>.test.ts (chamando
// runLiveSuite), e não apenas um arquivo existente.
//
// O script não exporta funções puras (tudo roda no top-level ao ser
// importado), então o padrão aqui é integração CLI real via spawnSync, com
// cwd apontando para uma fixture temporária — mesmo padrão de
// tests/scripts/check-edge-cors-headers.test.mjs.
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/check-edge-live-coverage.mjs');

const temporaryRoots = [];
afterEach(() => {
  for (const dir of temporaryRoots.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'edge-live-coverage-gate-'));
  temporaryRoots.push(dir);
  return dir;
}

function writeFn(root, name, content = 'Deno.serve(() => new Response("ok"));') {
  const dir = join(root, 'supabase', 'functions', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.ts'), content);
}

function writeLiveTest(root, fn, content) {
  const dir = join(root, 'tests', 'edge-functions', 'live');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${fn}.test.ts`), content);
}

function runGate(root) {
  return spawnSync('node', [SCRIPT], { cwd: root, encoding: 'utf8', timeout: 10000 });
}

describe('check-edge-live-coverage — repositório real', () => {
  it('passa (exit 0) contra supabase/functions/ real do repo', () => {
    const r = runGate(ROOT);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Cobertura LIVE completa/);
  });
});

describe('check-edge-live-coverage — cenários básicos', () => {
  it('falha quando a função não tem arquivo de teste live', () => {
    const root = tempRepo();
    writeFn(root, 'my-func');
    mkdirSync(join(root, 'tests', 'edge-functions', 'live'), { recursive: true });
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/my-func/);
  });

  it('falha quando o arquivo de teste live existe mas está vazio (stub)', () => {
    const root = tempRepo();
    writeFn(root, 'my-func');
    writeLiveTest(root, 'my-func', '');
    const r = runGate(root);
    expect(r.status).toBe(1);
  });

  it('passa quando o teste live chama runLiveSuite(...) de verdade', () => {
    const root = tempRepo();
    writeFn(root, 'my-func');
    writeLiveTest(root, 'my-func', 'runLiveSuite(descriptorFor("my-func"));');
    const r = runGate(root);
    expect(r.status).toBe(0);
  });

  it('ignora supabase/functions/_shared e /tests mesmo com index.ts', () => {
    const root = tempRepo();
    writeFn(root, '_shared');
    writeFn(root, 'tests');
    const r = runGate(root);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/0\/0/);
  });

  it('ignora diretório de função sem index.ts', () => {
    const root = tempRepo();
    mkdirSync(join(root, 'supabase', 'functions', 'no-index'), { recursive: true });
    writeFileSync(join(root, 'supabase', 'functions', 'no-index', 'README.md'), 'sem index.ts');
    const r = runGate(root);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/0\/0/);
  });
});

// Regressão: o comentário do próprio script (linhas 29-31) documenta que o
// gate existe para impedir que "um stub vazio (ou só com comentários)" passe
// como cobertura real. Antes da correção, a regex /\brunLiveSuite\s*\(/ era
// testada contra o arquivo inteiro, sem remover comentários — então um stub
// que só MENCIONA runLiveSuite(...) dentro de um comentário (ex.: um TODO)
// batia na regex e o gate dava falso-positivo (exit 0) sem nenhuma chamada
// real. Rodado de fato (spawnSync real) antes e depois do fix em
// check-edge-live-coverage.mjs, que agora remove comentários de bloco e de
// linha antes de testar a regex.
describe('check-edge-live-coverage — falso-positivo de comentário (regressão)', () => {
  it('falha quando runLiveSuite(...) só aparece dentro de um comentário de linha (//)', () => {
    const root = tempRepo();
    writeFn(root, 'my-func');
    writeLiveTest(
      root,
      'my-func',
      '// TODO: chamar runLiveSuite(descriptorFor("my-func")) quando tiver credenciais\n',
    );
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/my-func/);
  });

  it('falha quando runLiveSuite(...) só aparece dentro de um comentário de bloco (/* */)', () => {
    const root = tempRepo();
    writeFn(root, 'my-func');
    writeLiveTest(root, 'my-func', '/*\nrunLiveSuite(descriptorFor("my-func"));\n*/\n');
    const r = runGate(root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/my-func/);
  });

  it('continua passando quando a chamada real coexiste com comentários mencionando runLiveSuite', () => {
    const root = tempRepo();
    writeFn(root, 'my-func');
    writeLiveTest(
      root,
      'my-func',
      '// ver runLiveSuite(...) abaixo\nrunLiveSuite(descriptorFor("my-func"));\n',
    );
    const r = runGate(root);
    expect(r.status).toBe(0);
  });
});

describe('check-edge-live-coverage — encoding e formatação', () => {
  it('passa com BOM UTF-8 no início do arquivo de teste live', () => {
    const root = tempRepo();
    writeFn(root, 'my-func');
    writeLiveTest(root, 'my-func', '﻿runLiveSuite(descriptorFor("my-func"));\n');
    const r = runGate(root);
    expect(r.status).toBe(0);
  });

  it('passa com CRLF no arquivo de teste live', () => {
    const root = tempRepo();
    writeFn(root, 'my-func');
    writeLiveTest(root, 'my-func', 'import x from "y";\r\nrunLiveSuite(descriptorFor("my-func"));\r\n');
    const r = runGate(root);
    expect(r.status).toBe(0);
  });
});
