#!/usr/bin/env node
/**
 * extract-types-inventory.mjs
 * ------------------------------------------------------------------------
 * PLANO_DBA E41 — substitui o proxy `grep -c "export type" types.ts` (REGRA
 * #4 do CLAUDE.md) por um inventário estrutural real.
 *
 * `grep -c "export type"` conta 7 aliases de topo (`Json`, `Database`,
 * `Tables`, `TablesInsert`, `TablesUpdate`, `Enums`, `CompositeTypes` —
 * varia por versão do gerador). Esse número não muda quando uma tabela é
 * removida de dentro do union `Database['public']['Tables']` — foi
 * exatamente assim que o incidente `magazine_*` (2026-07-16, commit
 * `7716ae9`) passou despercebido até quebrar `magazineService.ts` em
 * runtime com 80+ erros TS.
 *
 * Este script faz o oposto: usa o TypeScript Compiler API (já é
 * devDependency do repo — não regex frágil) para abrir a declaração
 * `export type Database = { ... }` gerada por `supabase gen types
 * typescript` e listar, por schema (`public`, `graphql_public`, e
 * qualquer outro schema exposto no futuro), os nomes de:
 *   - Tables
 *   - Views
 *   - Functions
 *   - Enums
 *   - CompositeTypes
 *
 * Isso é o mesmo shape que `Database['<schema>']` tem no arquivo gerado —
 * lido estruturalmente (AST), não por contagem de string.
 *
 * Uso:
 *   node scripts/extract-types-inventory.mjs
 *     → lê src/integrations/supabase/types.ts, imprime JSON no stdout e um
 *       resumo de contagens no stderr.
 *   node scripts/extract-types-inventory.mjs caminho/alternativo/types.ts
 *   node scripts/extract-types-inventory.mjs --stdin
 *     → lê o source de stdin em vez de um arquivo (usado por
 *       check-types-inventory-drift.mjs para inventariar `git show
 *       HEAD~1:...` sem escrever um arquivo temporário).
 *
 * Import como módulo (usado pelo gate e pelos testes):
 *   import { extractTypesInventory, countsOf } from './extract-types-inventory.mjs';
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

export const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
export const DEFAULT_TYPES_PATH = resolve(ROOT, 'src/integrations/supabase/types.ts');

/** Categorias reconhecidas dentro de cada bloco de schema do `Database`. */
export const CATEGORY_KEYS = ['Tables', 'Views', 'Functions', 'Enums', 'CompositeTypes'];

/**
 * Chaves de nível de schema que não são schemas reais — hoje só o
 * `__InternalSupabase` (metadado da versão do PostgREST, não um schema
 * do banco). Se o gerador adicionar outra chave de metadado no futuro,
 * ela também cairia aqui.
 */
const NON_SCHEMA_KEYS = new Set(['__InternalSupabase']);

function propertyName(member) {
  if (!member.name) return null;
  if (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)) {
    return member.name.text;
  }
  return null;
}

/**
 * Extrai os nomes de propriedade de um TypeLiteral (`{ a: ...; b: ... }`).
 *
 * Uma categoria vazia é gerada pelo Supabase CLI como um mapped type sobre
 * `never` (`{ [_ in never]: never }`), que o parser do TS representa como
 * `MappedTypeNode`, não `TypeLiteralNode` — nesse caso devolve `[]`.
 */
function extractPropertyNames(typeNode) {
  if (!typeNode || !ts.isTypeLiteralNode(typeNode)) return [];
  const names = [];
  for (const member of typeNode.members) {
    if (!ts.isPropertySignature(member)) continue;
    const name = propertyName(member);
    if (name) names.push(name);
  }
  return names.sort((a, b) => a.localeCompare(b, 'en'));
}

/**
 * Percorre o texto-fonte de um `types.ts` gerado e devolve o inventário
 * estrutural: `{ [schema]: { Tables: string[], Views: string[], ... } }`.
 *
 * Lança erro se não encontrar `export type Database = { ... }` como um
 * TypeLiteral de topo — isso normalmente significa que o gerador mudou de
 * formato (breaking change do Supabase CLI), não que o schema mudou; o
 * chamador deve tratar como falha de parsing, não como remoção de objeto.
 */
export function extractTypesInventory(sourceText, fileName = 'types.ts') {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  let databaseType = null;
  sourceFile.forEachChild((node) => {
    if (databaseType) return;
    if (ts.isTypeAliasDeclaration(node) && node.name.text === 'Database') {
      databaseType = node.type;
    }
  });

  if (!databaseType || !ts.isTypeLiteralNode(databaseType)) {
    throw new Error(
      `Não encontrei "export type Database = { ... }" como um TypeLiteral em ${fileName}. ` +
        'O formato gerado pelo Supabase CLI pode ter mudado — trate como falha de parsing, não como remoção de schema.',
    );
  }

  const inventory = {};
  for (const schemaMember of databaseType.members) {
    if (!ts.isPropertySignature(schemaMember)) continue;
    const schemaName = propertyName(schemaMember);
    if (!schemaName || NON_SCHEMA_KEYS.has(schemaName)) continue;

    const schemaType = schemaMember.type;
    if (!schemaType || !ts.isTypeLiteralNode(schemaType)) continue;

    const schemaInventory = {};
    for (const categoryMember of schemaType.members) {
      if (!ts.isPropertySignature(categoryMember)) continue;
      const categoryName = propertyName(categoryMember);
      if (!categoryName || !CATEGORY_KEYS.includes(categoryName)) continue;
      schemaInventory[categoryName] = extractPropertyNames(categoryMember.type);
    }

    // Garante as 5 chaves mesmo quando o gerador omite uma categoria vazia.
    for (const key of CATEGORY_KEYS) {
      if (!(key in schemaInventory)) schemaInventory[key] = [];
    }

    inventory[schemaName] = schemaInventory;
  }

  return inventory;
}

/** Reduz o inventário completo (nomes) a apenas contagens por schema/categoria. */
export function countsOf(inventory) {
  const counts = {};
  for (const [schema, categories] of Object.entries(inventory)) {
    counts[schema] = {};
    for (const key of CATEGORY_KEYS) {
      counts[schema][key] = (categories[key] ?? []).length;
    }
  }
  return counts;
}

/** Lê stdin de forma síncrona (usado pelo modo `--stdin`). */
function readStdinSync() {
  return readFileSync(0, 'utf8');
}

export function extractTypesInventoryFromFile(filePath = DEFAULT_TYPES_PATH) {
  const resolved = resolve(filePath);
  const sourceText = readFileSync(resolved, 'utf8');
  return extractTypesInventory(sourceText, resolved);
}

function formatCountsSummary(counts) {
  const lines = [];
  for (const [schema, byCategory] of Object.entries(counts)) {
    const parts = CATEGORY_KEYS.map((key) => `${key}=${byCategory[key]}`).join(', ');
    lines.push(`  ${schema}: ${parts}`);
  }
  return lines.join('\n');
}

function runCli(argv) {
  const useStdin = argv.includes('--stdin');
  const positional = argv.filter((a) => a !== '--stdin' && !a.startsWith('--'));
  const targetPath = positional[0] ?? DEFAULT_TYPES_PATH;

  const inventory = useStdin
    ? extractTypesInventory(readStdinSync(), '<stdin>')
    : extractTypesInventoryFromFile(targetPath);

  process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);

  const counts = countsOf(inventory);
  console.error(`[extract-types-inventory] fonte: ${useStdin ? '<stdin>' : resolve(targetPath)}`);
  console.error(formatCountsSummary(counts));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    runCli(process.argv.slice(2));
  } catch (error) {
    console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  }
}
