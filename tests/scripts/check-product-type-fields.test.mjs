/**
 * Tests for scripts/check-product-type-fields.mjs
 *
 * O script é o gate E111: usa a TypeScript Compiler API pra garantir que os
 * campos críticos (price, sale_price, shortDescription, category_id — mais
 * o aviso não-bloqueante category_name) são membros diretos de
 * `export interface Product` (ou `type Product = {...}`) em
 * src/types/product-catalog.ts. Sai com:
 *   - 0 se todos os campos críticos estão presentes (avisos não bloqueiam)
 *   - 1 se a interface não existe, ou se falta campo crítico, ou se o
 *     arquivo canônico não existe/não pôde ser lido
 *
 * O script executa lógica de topo de módulo (sem export) e usa
 * `process.cwd()` como ROOT (não aceita argv), então é testado como
 * subprocesso via spawnSync com `cwd` apontando pra sandboxes reais em
 * /tmp — mesmo padrão de tests/scripts/check-no-prod-leak.test.mjs.
 *
 * Casos cobertos por esta extensão (achados reais, com evidência de
 * execução antes da correção):
 *
 * 1. `src/types/product-catalog.ts` existente mas ILEGÍVEL como arquivo
 *    (um diretório no lugar do arquivo, reproduzido com `mkdirSync` — EISDIR)
 *    fazia `readFileSync` estourar uma exceção não tratada (stack trace cru
 *    do Node) em vez de uma falha limpa do gate.
 *
 * 2. Uma `interface Product` (ou `type Product`) DECLARADA DENTRO de uma
 *    função/classe/namespace (não exportada, não relacionada ao contrato
 *    real) tinha seus membros somados aos da interface real top-level,
 *    porque a varredura do AST recursava em QUALQUER escopo (`ts.forEachChild`
 *    irrestrito). Isso produzia falso-positivo: o gate aprovava
 *    (exit 0, "✅ Todos os campos críticos... estão presentes") mesmo com a
 *    interface real exportada faltando TODOS os campos críticos — exatamente
 *    o tipo de furo que a própria doc do script diz que ele foi criado para
 *    evitar (ver cabeçalho do script, caso do "blob-grep").
 */

import assert from 'node:assert/strict';
import {
  mkdtempSync, mkdirSync, writeFileSync, rmSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { test, describe } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/check-product-type-fields.mjs');

function run(cwd) {
  return spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8', cwd });
}

function writeCanonical(sandbox, content) {
  const dir = join(sandbox, 'src/types');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'product-catalog.ts'), content);
}

const ALL_FIELDS_OK = `
export interface Product {
  price: number;
  sale_price?: number;
  shortDescription: string;
  category_id?: string;
  category_name?: string;
}
`;

describe('check-product-type-fields.mjs — comportamento básico', () => {
  test('exit=0 quando interface Product tem todos os campos críticos e o opcional', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'ptf-ok-'));
    try {
      writeCanonical(sandbox, ALL_FIELDS_OK);
      const result = run(sandbox);
      assert.equal(result.status, 0);
      assert.match(result.stdout, /Todos os campos críticos/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('exit=0 (aviso, não bloqueante) quando só falta o campo opcional category_name', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'ptf-warn-'));
    try {
      writeCanonical(
        sandbox,
        `export interface Product {
          price: number;
          sale_price?: number;
          shortDescription: string;
          category_id?: string;
        }`,
      );
      const result = run(sandbox);
      assert.equal(result.status, 0);
      assert.match(result.stderr, /1 aviso\(s\)/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('exit=1 quando falta campo crítico (ex.: category_id removido)', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'ptf-missing-'));
    try {
      writeCanonical(
        sandbox,
        `export interface Product {
          price: number;
          sale_price?: number;
          shortDescription: string;
        }`,
      );
      const result = run(sandbox);
      assert.equal(result.status, 1);
      assert.match(result.stdout, /AUSENTE category_id/);
      assert.match(result.stderr, /campo\(s\) crítico\(s\) ausente\(s\)/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('exit=1 quando `interface Product` não existe (renomeada/deletada)', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'ptf-renamed-'));
    try {
      writeCanonical(sandbox, 'export interface ProductX { price: number; }');
      const result = run(sandbox);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /não encontrada/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('exit=1 quando src/types/product-catalog.ts não existe', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'ptf-nofile-'));
    try {
      const result = run(sandbox);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /não encontrado/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('exit=0 também reconhece `type Product = {...}` (alias)', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'ptf-alias-'));
    try {
      writeCanonical(
        sandbox,
        `export type Product = {
          price: number;
          sale_price?: number;
          shortDescription: string;
          category_id?: string;
          category_name?: string;
        };`,
      );
      const result = run(sandbox);
      assert.equal(result.status, 0);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
});

describe('check-product-type-fields.mjs — leitura de arquivo falha (regressão)', () => {
  test('product-catalog.ts existente mas que é um DIRETÓRIO (EISDIR) não deve estourar stack trace — falha o gate com mensagem legível', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'ptf-eisdir-'));
    try {
      // src/types/product-catalog.ts existe como diretório em vez de
      // arquivo — readFileSync lança EISDIR.
      mkdirSync(join(sandbox, 'src/types/product-catalog.ts'), { recursive: true });
      const result = run(sandbox);

      // Antes da correção: crash com stack trace do Node (sem mensagem
      // "❌ ... não pôde ser lido", sem exit controlado pelo script).
      assert.equal(result.status, 1);
      assert.doesNotMatch(result.stderr, /at readFileSync/);
      assert.doesNotMatch(result.stderr, /Error: EISDIR/);
      assert.match(result.stderr, /não pôde ser lido \(EISDIR\)/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
});

describe('check-product-type-fields.mjs — falso-positivo com interface aninhada (regressão)', () => {
  test('uma interface Product local, DENTRO de uma função, não pode suprir os campos da interface real top-level', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'ptf-decoy-'));
    try {
      writeCanonical(
        sandbox,
        `export interface Product {
          id: string;
        }

        function helper() {
          interface Product {
            price: number;
            sale_price: number;
            shortDescription: string;
            category_id: string;
            category_name: string;
          }
          const x: Product = {} as Product;
          return x;
        }`,
      );
      const result = run(sandbox);

      // Antes da correção: a varredura recursava em QUALQUER escopo e
      // somava os membros da interface Product aninhada em `helper()` aos
      // da interface real, dando falso "✅ Todos os campos críticos...
      // estão presentes" (exit 0) mesmo com a interface real exportada
      // tendo só `id`.
      assert.equal(result.status, 1);
      assert.match(result.stdout, /AUSENTE price/);
      assert.match(result.stdout, /AUSENTE sale_price/);
      assert.match(result.stdout, /AUSENTE shortDescription/);
      assert.match(result.stdout, /AUSENTE category_id/);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('declaration merging LEGÍTIMO (duas `interface Product` top-level) continua funcionando', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'ptf-merge-'));
    try {
      writeCanonical(
        sandbox,
        `export interface Product {
          price: number;
          sale_price?: number;
        }
        export interface Product {
          shortDescription: string;
          category_id?: string;
          category_name?: string;
        }`,
      );
      const result = run(sandbox);
      assert.equal(result.status, 0);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
});
