#!/usr/bin/env node
/**
 * classify-unledgered-migrations.mjs
 *
 * E07 do plano DBA (2026-09-16): classifica as migrations locais sem linha
 * no ledger (`supabase_migrations.schema_migrations`) por objeto-alvo, via
 * regex leve — sem parser AST (nenhuma lib de parsing SQL existe no
 * projeto; decisão do pre-mortem de E07).
 *
 * NÃO consulta o banco. Só extrai (tipo, objeto) de cada arquivo e agrupa
 * por tipo em queries de verificação em lote, para rodar via MCP/psql
 * separadamente. Read-only sobre o filesystem.
 *
 * Uso:
 *   node scripts/classify-unledgered-migrations.mjs <lista.json> <saida-dir>
 *
 * <lista.json>: array de {path, version, sha256} — ex.:
 *   local_versioned_files_without_ledger_version de
 *   docs/MANIFESTO_LEDGER_CANONICO_SANITIZADO_*.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const [, , listArg, outDirArg] = process.argv;
if (!listArg || !outDirArg) {
  console.error('Uso: node scripts/classify-unledgered-migrations.mjs <lista.json> <saida-dir>');
  process.exit(2);
}

const ROOT = process.cwd();
const list = JSON.parse(readFileSync(resolve(listArg), 'utf8'));
const outDir = resolve(outDirArg);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

function stripComments(sql) {
  return sql
    .split('\n')
    .map((line) => {
      // remove comentário de linha, mas não dentro de string literal simples
      const idx = line.indexOf('--');
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

// Ordem importa: padrões mais específicos primeiro. Cada regex captura
// (nome-do-objeto[, tabela/coluna auxiliar]).
const PATTERNS = [
  { kind: 'materialized_view', re: /CREATE\s+MATERIALIZED\s+VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([\w.]+)"?/i },
  { kind: 'view', re: /CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+"?([\w.]+)"?/i },
  { kind: 'policy', re: /CREATE\s+POLICY\s+"?([\w]+)"?\s+ON\s+"?([\w.]+)"?/i },
  { kind: 'trigger', re: /CREATE\s+TRIGGER\s+"?([\w]+)"?\s+[\s\S]{0,200}?\bON\s+"?([\w.]+)"?/i },
  { kind: 'function', re: /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+"?([\w.]+)"?\s*\(/i },
  { kind: 'index', re: /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?"?([\w]+)"?/i },
  { kind: 'schema', re: /CREATE\s+SCHEMA\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([\w]+)"?/i },
  { kind: 'table', re: /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([\w.]+)"?/i },
  { kind: 'alter_function_search_path', re: /ALTER\s+FUNCTION\s+"?([\w.]+)"?\s*(?:\([^)]*\))?\s*SET\s+search_path/i },
  { kind: 'add_column', re: /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?"?([\w.]+)"?\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([\w]+)"?/i },
  { kind: 'enum_value', re: /ALTER\s+TYPE\s+"?([\w.]+)"?\s+ADD\s+VALUE\s+(?:IF\s+NOT\s+EXISTS\s+)?'([\w]+)'/i },
  { kind: 'diagnostic_noop', re: /^SELECT\s+1(\s+WHERE\s+FALSE)?\s*;?\s*$/i },
  { kind: 'comment', re: /COMMENT\s+ON\s+(?:TABLE|VIEW|MATERIALIZED\s+VIEW|FUNCTION|COLUMN|POLICY)\s+"?([\w."().,\s]+?)"?\s+IS\s/i },
  { kind: 'grant', re: /GRANT\s+[\w,\s]+\s+ON\s+(?:TABLE\s+)?"?([\w.]+)"?\s+TO\s+"?(\w+)"?/i },
  { kind: 'revoke', re: /REVOKE\s+[\w,\s]+\s+(?:ON\s+(?:TABLE\s+)?"?([\w.]+)"?\s+)?FROM\s+"?(\w+)"?/i },
  { kind: 'drop', re: /DROP\s+(TABLE|VIEW|MATERIALIZED\s+VIEW|FUNCTION|INDEX|POLICY|TRIGGER)\s+(?:IF\s+EXISTS\s+)?"?([\w.]+)"?/i },
];

const results = [];
for (const entry of list) {
  const fullPath = join(ROOT, entry.path);
  let raw;
  try {
    raw = readFileSync(fullPath, 'utf8');
  } catch {
    results.push({ ...entry, kind: 'file_missing' });
    continue;
  }
  const clean = stripComments(raw).trim();
  if (clean.length === 0) {
    results.push({ ...entry, kind: 'marker_noop' });
    continue;
  }
  let matched = null;
  for (const { kind, re } of PATTERNS) {
    const m = clean.match(re);
    if (m) {
      matched = { kind, object: (m[1] || '').trim(), aux: (m[2] || '').trim() || null };
      break;
    }
  }
  if (matched) {
    results.push({ ...entry, ...matched });
  } else {
    results.push({
      ...entry,
      kind: 'indeterminada',
      preview: clean.slice(0, 160).replace(/\s+/g, ' '),
    });
  }
}

const byKind = {};
for (const r of results) {
  byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
}

writeFileSync(join(outDir, 'classificacao_bruta.json'), JSON.stringify(results, null, 2));

// Gera um arquivo de nomes distintos por kind, para checagem em lote no pg_catalog.
for (const kind of Object.keys(byKind)) {
  if (['marker_noop', 'diagnostic_noop', 'file_missing', 'indeterminada', 'drop', 'comment', 'grant', 'revoke'].includes(kind)) {
    continue; // esses tratamos à parte / não têm checagem de "existe" simples
  }
  const names = [...new Set(results.filter((r) => r.kind === kind).map((r) => r.object))].sort();
  writeFileSync(join(outDir, `nomes_${kind}.json`), JSON.stringify(names, null, 2));
}

console.log('Classificação por tipo:');
for (const [kind, n] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${kind.padEnd(28)} ${n}`);
}
console.log(`\nTotal: ${results.length}`);
console.log(`\nArquivos gerados em ${outDir}/`);
