/** Regressão (lote 2): gates que passavam sem verificar nada. Cada caso foi reproduzido na revisão. */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');
const dirs = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

function sandbox(files) {
  const dir = mkdtempSync(join(tmpdir(), 'gates2-'));
  dirs.push(dir);
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
  for (const f of files) {
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    cpSync(join(ROOT, f), join(dir, f));
  }
  return dir;
}
const run = (dir, script, args = []) =>
  spawnSync('node', [join(dir, script), ...args], { cwd: dir, encoding: 'utf8', env: { PATH: process.env.PATH } });

describe('check-chunk-cycles vê imports minificados (sem espaço antes de from)', () => {
  const make = (a, b) => {
    const dir = sandbox(['scripts/check-chunk-cycles.mjs']);
    mkdirSync(join(dir, 'assets'));
    writeFileSync(join(dir, 'assets/a-00000000.js'), a);
    writeFileSync(join(dir, 'assets/b-11111111.js'), b);
    return dir;
  };
  it('ciclo minificado é detectado (exit 1)', () => {
    const dir = make('import{b}from"./b-11111111.js";export const a=1;', 'import{a}from"./a-00000000.js";export const b=2;');
    expect(run(dir, 'scripts/check-chunk-cycles.mjs', ['--directory=assets']).status).toBe(1);
  });
  it('ciclo com espaços continua detectado', () => {
    const dir = make('import { b } from "./b-11111111.js";', 'import { a } from "./a-00000000.js";');
    expect(run(dir, 'scripts/check-chunk-cycles.mjs', ['--directory=assets']).status).toBe(1);
  });
  it('sem ciclo (import dinâmico não conta) → exit 0', () => {
    const dir = make('import{b}from"./b-11111111.js";', 'export const b=import("./a-00000000.js");');
    expect(run(dir, 'scripts/check-chunk-cycles.mjs', ['--directory=assets']).status).toBe(0);
  });
});

describe('baselines inválidas ou insumo ausente falham fechado', () => {
  it('check-product-type-duplicates com baseline {} → exit 2', () => {
    const dir = sandbox(['scripts/check-product-type-duplicates.mjs']);
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, '.product-interface-baseline.json'), '{}');
    expect(run(dir, 'scripts/check-product-type-duplicates.mjs').status).toBe(2);
  });
  it('check-soft-delete-policy sem supabase/migrations → exit 2', () => {
    const dir = sandbox(['scripts/check-soft-delete-policy.mjs', 'scripts/lib/baseline-gate.mjs']);
    // baseline existente: sem o guard, "atual 0 < baseline 5" passava como drift positivo
    writeFileSync(join(dir, '.soft-delete-baseline.json'), JSON.stringify({ tablesWithoutSoftDelete: 5, counts: { 'supabase/migrations/a.sql': 5 } }));
    expect(run(dir, 'scripts/check-soft-delete-policy.mjs').status).toBe(2);
  });
  it('baseline-gate (via check-todo-baseline) com JSON corrompido → exit 2 sem stack trace', () => {
    const dir = sandbox(['scripts/check-todo-baseline.mjs', 'scripts/lib/baseline-gate.mjs']);
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src/a.ts'), 'export const a = 1;\n');
    writeFileSync(join(dir, '.todo-baseline.json'), '{');
    const r = run(dir, 'scripts/check-todo-baseline.mjs');
    expect(r.status).toBe(2);
    expect(r.stderr).not.toContain('SyntaxError:\n    at');
  });
});

describe('check-todo-baseline não conta a palavra portuguesa "todo"', () => {
  it('"todo o catálogo" não é marcador; "// TODO:" é', () => {
    const dir = sandbox(['scripts/check-todo-baseline.mjs', 'scripts/lib/baseline-gate.mjs']);
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src/a.ts'), "export const t = 'Você conhece todo o catálogo';\n// TODO: remover\n");
    expect(run(dir, 'scripts/check-todo-baseline.mjs', ['--update']).status).toBe(0);
    expect(JSON.parse(readFileSync(join(dir, '.todo-baseline.json'), 'utf8')).productionTodoCount).toBe(1);
  });
});

describe('seo-sanity-check valida o HOST do canonical', () => {
  const page = (url) =>
    `<html><head><link rel="canonical" href="${url}"><meta property="og:url" content="${url}"><meta name="twitter:url" content="${url}"></head></html>`;
  const check = (url) => {
    const dir = sandbox(['scripts/seo-sanity-check.mjs']);
    writeFileSync(join(dir, 'index.html'), page(url));
    return run(dir, 'scripts/seo-sanity-check.mjs').status;
  };
  it('domínio correto passa', () => expect(check('https://promogifts.com.br/')).toBe(0));
  it('subdomínio passa', () => expect(check('https://www.promogifts.com.br/')).toBe(0));
  it('domínio só na query string reprova', () => expect(check('https://preview.exemplo.dev/?ref=promogifts.com.br')).toBe(1));
  it('domínio parecido reprova', () => expect(check('https://evilpromogifts.com.br/')).toBe(1));
});

describe('check-collapse-baselines', () => {
  it('--viewport desconhecido → exit 2 (antes: "Baselines OK (0 viewport(s))")', () => {
    const dir = sandbox(['scripts/qa/check-collapse-baselines.mjs']);
    expect(run(dir, 'scripts/qa/check-collapse-baselines.mjs', ['--viewport', 'tablett']).status).toBe(2);
  });
});
