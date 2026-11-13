/**
 * Tests for scripts/classify-unledgered-migrations.mjs
 *
 * O script é E07 do plano DBA: classifica (por regex, sem AST) migrations
 * locais sem linha no ledger, a partir de um <lista.json> = [{path, version,
 * sha256}], e escreve `classificacao_bruta.json` + `nomes_<kind>.json` em
 * <saida-dir>. Read-only sobre o filesystem, não consulta banco.
 *
 * O script executa lógica de topo de módulo (sem export), então é testado
 * como subprocesso via spawnSync contra diretórios/arquivos reais em /tmp,
 * seguindo o mesmo padrão de tests/scripts/check-mojibake.test.mjs.
 *
 * BUG real encontrado e corrigido nesta sessão: `JSON.parse(readFileSync(...))`
 * sem try/catch e sem validar o shape do array fazia o script abortar com
 * stack trace Node cru (exceção não tratada, sem mensagem útil) em três
 * cenários plausíveis de entrada real: arquivo de lista ausente, JSON
 * malformado, JSON com BOM (comum em arquivos gerados no Windows — mesma
 * classe de bug já corrigida em check-rls-no-policy-drift.mjs) e lista cujo
 * JSON não é um array. Além disso, uma única entrada sem `path` (string)
 * fazia `join(ROOT, entry.path)` lançar TypeError e descartar TODA a
 * classificação já computada para as demais entradas (mesma classe de bug
 * já corrigida em check-mojibake.mjs: um item ruim não deve descartar os
 * resultados válidos já calculados).
 */

import assert from 'node:assert/strict';
import {
  mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { test, describe } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/classify-unledgered-migrations.mjs');

function run(cwd, args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

function makeSandbox() {
  const sandbox = mkdtempSync(join(tmpdir(), 'classify-unledgered-'));
  mkdirSync(join(sandbox, 'supabase', 'migrations'), { recursive: true });
  return sandbox;
}

describe('classify-unledgered-migrations.mjs — uso básico', () => {
  test('exit=2 e mensagem de uso quando faltam argumentos', () => {
    const sandbox = makeSandbox();
    try {
      const result = run(sandbox, []);
      assert.equal(result.status, 2);
      assert.match(result.stderr, /Uso: node scripts\/classify-unledgered-migrations\.mjs/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('classifica CREATE TABLE corretamente em lista válida', () => {
    const sandbox = makeSandbox();
    try {
      writeFileSync(
        join(sandbox, 'supabase', 'migrations', 'a.sql'),
        'CREATE TABLE normal_table (id int);\n',
      );
      writeFileSync(
        join(sandbox, 'list.json'),
        JSON.stringify([{ path: 'supabase/migrations/a.sql', version: '1', sha256: 'x' }]),
      );
      const result = run(sandbox, ['list.json', 'out']);
      assert.equal(result.status, 0);
      const raw = readFileSync(join(sandbox, 'out', 'classificacao_bruta.json'), 'utf8');
      const parsed = JSON.parse(raw);
      assert.equal(parsed[0].kind, 'table');
      assert.equal(parsed[0].object, 'normal_table');
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('lista vazia produz classificacao_bruta.json vazio, exit=0', () => {
    const sandbox = makeSandbox();
    try {
      writeFileSync(join(sandbox, 'list.json'), '[]');
      const result = run(sandbox, ['list.json', 'out']);
      assert.equal(result.status, 0);
      const raw = readFileSync(join(sandbox, 'out', 'classificacao_bruta.json'), 'utf8');
      assert.deepEqual(JSON.parse(raw), []);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
});

describe('classify-unledgered-migrations.mjs — regressão: leitura robusta de <lista.json>', () => {
  test('arquivo de lista inexistente: mensagem clara + exit=2, sem stack trace cru', () => {
    const sandbox = makeSandbox();
    try {
      const result = run(sandbox, ['nao-existe.json', 'out']);
      assert.equal(result.status, 2);
      assert.match(result.stderr, /Falha ao ler\/parsear nao-existe\.json/);
      assert.doesNotMatch(result.stderr, /at JSON\.parse/);
      assert.doesNotMatch(result.stderr, /ModuleJob\.run/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('JSON malformado: mensagem clara + exit=2, sem stack trace cru', () => {
    const sandbox = makeSandbox();
    try {
      writeFileSync(join(sandbox, 'bad.json'), '{not valid json');
      const result = run(sandbox, ['bad.json', 'out']);
      assert.equal(result.status, 2);
      assert.match(result.stderr, /Falha ao ler\/parsear bad\.json/);
      assert.doesNotMatch(result.stderr, /ModuleJob\.run/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('JSON é um objeto em vez de array: mensagem clara + exit=2', () => {
    const sandbox = makeSandbox();
    try {
      writeFileSync(join(sandbox, 'obj.json'), '{"foo":"bar"}');
      const result = run(sandbox, ['obj.json', 'out']);
      assert.equal(result.status, 2);
      assert.match(result.stderr, /deve conter um array JSON; recebido: object/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('BOM no início de <lista.json> não quebra o parse (classe de bug de check-rls-no-policy-drift)', () => {
    const sandbox = makeSandbox();
    try {
      writeFileSync(
        join(sandbox, 'supabase', 'migrations', 'noop.sql'),
        'SELECT 1;\n',
      );
      const listWithBom = `﻿${JSON.stringify([
        { path: 'supabase/migrations/noop.sql', version: '1', sha256: 'x' },
      ])}`;
      writeFileSync(join(sandbox, 'list.json'), listWithBom, 'utf8');
      const result = run(sandbox, ['list.json', 'out']);
      assert.equal(result.status, 0, `esperado exit=0, obtido status=${result.status}; stderr:\n${result.stderr}`);
      const raw = readFileSync(join(sandbox, 'out', 'classificacao_bruta.json'), 'utf8');
      const parsed = JSON.parse(raw);
      assert.equal(parsed[0].kind, 'diagnostic_noop');
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
});

describe('classify-unledgered-migrations.mjs — regressão: entrada com path ausente não descarta o resto da lista', () => {
  test('entrada sem `path` é marcada file_missing em vez de abortar o script (TypeError em join())', () => {
    const sandbox = makeSandbox();
    try {
      writeFileSync(
        join(sandbox, 'supabase', 'migrations', 'ok.sql'),
        'CREATE TABLE ok_table (id int);\n',
      );
      writeFileSync(
        join(sandbox, 'list.json'),
        JSON.stringify([
          { path: 'supabase/migrations/ok.sql', version: '1', sha256: 'x' },
          { version: '2', sha256: 'y' }, // sem `path` — entrada malformada
        ]),
      );
      const result = run(sandbox, ['list.json', 'out']);
      assert.equal(result.status, 0, `esperado exit=0, obtido status=${result.status}; stderr:\n${result.stderr}`);
      const raw = readFileSync(join(sandbox, 'out', 'classificacao_bruta.json'), 'utf8');
      const parsed = JSON.parse(raw);
      assert.equal(parsed.length, 2, 'a entrada válida não deve ser descartada junto com a malformada');
      assert.equal(parsed[0].kind, 'table');
      assert.equal(parsed[1].kind, 'file_missing');
      assert.equal(parsed[1].version, '2');
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
});
