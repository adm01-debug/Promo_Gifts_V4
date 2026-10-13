#!/usr/bin/env node
/**
 * check-select-columns.mjs
 *
 * Incidente 2026-10-13: o frontend consultava colunas que não existem mais
 * no banco (ex. `external_connections_sync_log.ran_at` → `started_at`,
 * `v_products_public.category_name` → `leaf_category_name`), causando 400s
 * em produção. Este script é um lint best-effort que compara colunas usadas
 * em `supabase.from('<tabela>').select('<lista>')` (string literal, par
 * imediato) contra as colunas reais de `src/integrations/supabase/types.ts`
 * (Tables + Views do schema `public`).
 *
 * ESCOPO (deliberadamente limitado para evitar falsos positivos):
 *   - Só analisa `.from('literal')` seguido de `.select('literal')` (ou
 *     colchetes/aspas duplas) no mesmo arquivo, dentro de uma janela de
 *     poucas linhas — não resolve variáveis, template strings com
 *     interpolação, nem concatenação de constantes (`A + B`).
 *   - Ignora relações aninhadas (`outbound_webhooks(name, url)`) — só
 *     valida o nome da relação em si (hint PostgREST `!inner`/`!left`
 *     removido), não as colunas dentro dos parênteses.
 *   - Não resolve TABLE_ALIASES (products → v_products_public) nem o
 *     COLUMN_MAP PT/EN de src/lib/db/postgrest.ts — isso cobre apenas
 *     chamadas via `dbInvoke`, fora do escopo deste lint simples. Para
 *     `supabase.from()` direto (o caso mais comum e mais arriscado — foi
 *     exatamente esse padrão que causou o incidente), o nome é literal.
 *   - Tabelas/views não encontradas no inventário (nome dinâmico, schema
 *     não-public, etc.) são puladas silenciosamente — fail-open, não
 *     fail-closed, para não travar o build em casos que o parser não
 *     entende.
 *
 * Uso: node scripts/check-select-columns.mjs
 * Retorna: 0 = OK (ou nada para validar), 1 = coluna inexistente encontrada
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execSync } from 'node:child_process';
import { extractTypesContracts } from './extract-types-inventory.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const TYPES_PATH = join(ROOT, 'src/integrations/supabase/types.ts');

function buildColumnIndex() {
  const src = readFileSync(TYPES_PATH, 'utf-8');
  const entries = extractTypesContracts(src, 'types.ts');
  // name -> Set<column> (apenas Row, schema public, Tables+Views)
  const index = new Map();
  for (const entry of entries) {
    if (entry.schema !== 'public') continue;
    if (entry.category !== 'Tables' && entry.category !== 'Views') continue;
    if (entry.member[0] !== 'Row' || entry.member.length !== 2) continue;
    const col = entry.member[1];
    if (!index.has(entry.name)) index.set(entry.name, new Set());
    index.get(entry.name).add(col);
  }
  return index;
}

/** Lista arquivos .ts/.tsx rastreados pelo git (evita node_modules/dist). */
function listSourceFiles() {
  const out = execSync('git ls-files -- "src/**/*.ts" "src/**/*.tsx"', {
    cwd: ROOT,
    encoding: 'utf-8',
  });
  return out.split('\n').filter((f) => f && !f.includes('__tests__') && !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'));
}

/** Split em vírgulas de topo (ignora vírgulas dentro de parênteses). */
function splitTopLevel(str) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of str) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

/** Extrai o nome de coluna "efetivo" de um item de select, ou null se não validável. */
function resolveColumnName(rawItem) {
  let item = rawItem.trim();
  if (!item || item === '*') return null;
  // Relação aninhada (rel(...) ou apelido:rel!hint(...)) — o nome antes do
  // parêntese é uma relação/FK, não uma coluna da tabela base. As colunas
  // DENTRO dos parênteses pertencem à tabela relacionada, fora do escopo
  // deste lint simples (não resolvemos a tabela do outro lado do FK aqui).
  if (item.includes('(')) return null;
  // Remove hint PostgREST de FK (!inner, !left, !nome_constraint).
  item = item.split('!')[0].trim();
  // Alias `apelido:coluna_real` → valida a coluna real.
  if (item.includes(':')) item = item.split(':')[1].trim();
  // Cast `coluna::tipo` → remove o cast.
  if (item.includes('::')) item = item.split('::')[0].trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(item)) return null; // expressão complexa — não validável
  return item;
}

function extractSelectCalls(content) {
  const calls = [];
  const fromRe = /\.from\(\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]\s*\)/g;
  let match;
  while ((match = fromRe.exec(content))) {
    const table = match[1];
    const windowEnd = Math.min(content.length, match.index + 600);
    const window = content.slice(match.index, windowEnd);
    const selectMatch = /\.select\(\s*['"]([^'"]*)['"]/s.exec(window);
    if (!selectMatch) continue;
    const selectStr = selectMatch[1];
    const lineNo = content.slice(0, match.index + selectMatch.index).split('\n').length;
    calls.push({ table, selectStr, line: lineNo });
  }
  return calls;
}

function main() {
  if (!existsSync(TYPES_PATH)) {
    console.error(`❌ check-select-columns: ${TYPES_PATH} não encontrado.`);
    process.exit(1);
  }
  const index = buildColumnIndex();
  const files = listSourceFiles();
  const findings = [];

  for (const file of files) {
    const path = join(ROOT, file);
    if (!existsSync(path)) continue;
    const content = readFileSync(path, 'utf-8');
    for (const { table, selectStr, line } of extractSelectCalls(content)) {
      const columns = index.get(table);
      if (!columns) continue; // tabela/view não encontrada no inventário — pula (fail-open)
      for (const rawItem of splitTopLevel(selectStr)) {
        const col = resolveColumnName(rawItem);
        if (!col) continue;
        if (!columns.has(col)) {
          findings.push(`${file}:${line} — '${table}.${col}' não existe em types.ts (select: "${selectStr}")`);
        }
      }
    }
  }

  if (findings.length > 0) {
    console.error(`🚨 check-select-columns: ${findings.length} coluna(s) inexistente(s) em .select():\n`);
    for (const f of findings) console.error(`  ❌ ${f}`);
    console.error(
      '\nConfirme o nome real da coluna (ex. via MCP Supabase ou docs/SCHEMA_REFERENCE.md) e corrija o select, ou o alias PostgREST `apelido:coluna_real` se o campo precisa manter o nome antigo no objeto retornado.',
    );
    process.exit(1);
  }

  console.log('✅ check-select-columns: nenhuma coluna inexistente encontrada nos .select() analisados.');
}

main();
