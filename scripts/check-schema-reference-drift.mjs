#!/usr/bin/env node

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCHEMA_REFERENCE_PATH = path.join(ROOT, 'docs/SCHEMA_REFERENCE.md');
const PHOTO_PATH = path.join(ROOT, 'docs/FOTOGRAFIA_PG_CATALOG_2026-08-26.md');

const SCHEMA_ROWS = [
  { key: 'tables_base', regex: /\| Tabelas base \(`public`\) \| \*\*(\d+)\*\* \|/ },
  { key: 'partitioned_tables', regex: /\| Tabelas particionadas \| (\d+) / },
  { key: 'columns_public', regex: /\| Colunas \(`public`\) \| \*\*([\d.]+)\*\* \|/ },
  { key: 'views', regex: /\| Views \| \*\*(\d+)\*\* \|/ },
  { key: 'materialized_views', regex: /\| Materialized views \| (\d+) \|/ },
  { key: 'functions', regex: /\| Funções \| \*\*([\d.]+)\*\* \(([\d.]+) SECURITY DEFINER\) \|/ },
  { key: 'policies', regex: /\| Policies RLS \| \*\*([\d.]+)\*\* \|/ },
  { key: 'triggers', regex: /\| Triggers \| (\d+) \|/ },
  { key: 'indexes', regex: /\| Índices \| ([\d.]+) \|/ },
  { key: 'foreign_keys', regex: /\| Foreign keys \| ([\d.]+) \|/ },
  { key: 'enums', regex: /\| Enums \| (\d+) \|/ },
];

const PHOTO_ROWS = [
  { key: 'tables_public_total', regex: /\| Relações tabulares \(`r` \+ `p`, incluindo partições\) \| (\d+) \|/ },
  { key: 'columns_public', regex: /\| Colunas de todas as relações, incluindo views\/MVs \| ([\d.]+) \|/ },
  { key: 'views', regex: /\| Views \| (\d+) \|/ },
  { key: 'materialized_views', regex: /\| Materialized views \| (\d+) \|/ },
  { key: 'functions', regex: /\| Rotinas públicas chamáveis \(`f`\/`p`\) \| ([\d.]+) \|/ },
  { key: 'security_definer', regex: /\| Rotinas `SECURITY DEFINER` \| ([\d.]+) \|/ },
  { key: 'policies', regex: /\| Policies \| ([\d.]+) \|/ },
  { key: 'triggers', regex: /\| Triggers não internos \| ([\d.]+) \|/ },
  { key: 'indexes', regex: /\| Índices totais \| ([\d.]+) \|/ },
  { key: 'foreign_keys', regex: /\| Foreign keys \(`f`\) \| ([\d.]+) \|/ },
  { key: 'enums', regex: /\| Enums em `public` \| ([\d.]+) \|/ },
];

function toInt(raw) {
  return Number(String(raw).replace(/\./g, ''));
}

function extract(text, regex, label) {
  const match = text.match(regex);
  if (!match) throw new Error(`Não consegui extrair ${label}`);
  return match.slice(1).map(toInt);
}

function parseSchemaReference(text) {
  const metrics = {};
  for (const row of SCHEMA_ROWS) {
    const values = extract(text, row.regex, row.key);
    if (row.key === 'functions') {
      metrics.functions = values[0];
      metrics.security_definer = values[1];
    } else {
      metrics[row.key] = values[0];
    }
  }
  metrics.tables_public_total = metrics.tables_base + metrics.partitioned_tables;
  return metrics;
}

function parsePhoto(text) {
  const metrics = {};
  for (const row of PHOTO_ROWS) {
    metrics[row.key] = extract(text, row.regex, row.key)[0];
  }
  return metrics;
}

function buildRows(schema, photo) {
  return [
    ['Tabelas public (escopo histórico)', schema.tables_public_total, photo.tables_public_total],
    ['Colunas (escopo diferente)', schema.columns_public, photo.columns_public],
    ['Views', schema.views, photo.views],
    ['Materialized views', schema.materialized_views, photo.materialized_views],
    ['Funções públicas', schema.functions, photo.functions],
    ['SECURITY DEFINER', schema.security_definer, photo.security_definer],
    ['Policies RLS', schema.policies, photo.policies],
    ['Triggers', schema.triggers, photo.triggers],
    ['Índices', schema.indexes, photo.indexes],
    ['Foreign keys', schema.foreign_keys, photo.foreign_keys],
    ['Enums public', schema.enums, photo.enums],
  ].map(([label, baseline, current]) => ({ label, baseline, current, delta: current - baseline }));
}

function main() {
  const schema = parseSchemaReference(readFileSync(SCHEMA_REFERENCE_PATH, 'utf8'));
  const photo = parsePhoto(readFileSync(PHOTO_PATH, 'utf8'));
  const rows = buildRows(schema, photo);

  console.log('Schema reference drift');
  console.log(`  baseline: docs/SCHEMA_REFERENCE.md`);
  console.log(`  current:  docs/FOTOGRAFIA_PG_CATALOG_2026-08-26.md`);
  console.log('  nota: deltas são diferenças de fotografia; não provam criação, perda ou intenção por objeto.');
  console.log('');

  for (const row of rows) {
    const sign = row.delta > 0 ? '+' : '';
    console.log(
      `  ${row.label.padEnd(30)} ${String(row.baseline).padStart(5)} -> ${String(row.current).padStart(5)}  (${sign}${row.delta})`,
    );
  }

  console.log('\n✅ Diff documental reproduzido a partir das duas baselines versionadas.');
}

main();
