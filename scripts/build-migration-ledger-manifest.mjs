#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [, , sanitizedRowsArg, outputArg] = process.argv;

if (!sanitizedRowsArg || !outputArg) {
  console.error(
    'Uso: node scripts/build-migration-ledger-manifest.mjs <ledger-sanitizado.json> <saida.json>',
  );
  process.exit(2);
}

const sha256 = (value) => createHash('sha256').update(value, 'utf8').digest('hex');

const rowsPath = resolve(sanitizedRowsArg);
const outputPath = resolve(outputArg);
const localManifestPath = resolve('docs/MANIFESTO_MIGRATIONS_FORWARD_ONLY_2026-08-26.json');

const ledgerRows = JSON.parse(readFileSync(rowsPath, 'utf8'));
const localManifest = JSON.parse(readFileSync(localManifestPath, 'utf8'));

if (!Array.isArray(ledgerRows) || !Array.isArray(localManifest.entries)) {
  throw new TypeError('Manifestos de entrada não possuem o formato esperado');
}

const localByVersion = new Map();
for (const entry of localManifest.entries) {
  if (!entry.declared_version) continue;
  const matches = localByVersion.get(entry.declared_version) ?? [];
  matches.push(entry);
  localByVersion.set(entry.declared_version, matches);
}

const ledgerVersions = new Set(ledgerRows.map(({ version }) => version));
const entries = ledgerRows
  .map((row) => {
    const localEntries = localByVersion.get(row.version) ?? [];
    const statementHashes = new Set(row.statement_sha256);
    const localMatches = localEntries.map((local) => ({
      path: local.path,
      sha256: local.sha256,
      exact_statement_bytes: statementHashes.has(local.sha256),
      exact_joined_statements_bytes: row.joined_statements_sha256 === local.sha256,
    }));
    const hasExactBytes = localMatches.some(
      (match) => match.exact_statement_bytes || match.exact_joined_statements_bytes,
    );

    return {
      version: row.version,
      name: row.name.trim() || null,
      statement_count: row.statement_count,
      statements_is_null: row.statements_is_null,
      statement_sha256: row.statement_sha256,
      joined_statements_sha256: row.joined_statements_sha256,
      rollback_statement_count: row.rollback_statement_count,
      metadata_presence: {
        created_by: row.has_created_by,
        idempotency_key: row.has_idempotency_key,
        rollback: row.has_rollback,
      },
      reconciliation:
        localMatches.length === 0
          ? 'ledger_only_version'
          : hasExactBytes
            ? 'exact_bytes'
            : 'version_only_requires_effect_review',
      local_matches: localMatches,
    };
  })
  .sort((a, b) => a.version.localeCompare(b.version));

const localWithoutLedger = localManifest.entries
  .filter(({ declared_version: version }) => version && !ledgerVersions.has(version))
  .map(({ path, declared_version, sha256: hash }) => ({
    path,
    version: declared_version,
    sha256: hash,
  }));

const count = (predicate) => entries.filter(predicate).length;
const canonicalEntryLines = entries.map((entry) => JSON.stringify(entry)).join('\n');

const manifest = {
  schema_version: 1,
  status: 'read_only_sanitized_catalog',
  captured_at: '2026-08-28',
  project_ref: 'doufsxqlfjyuvxuezpln',
  source: {
    table: 'supabase_migrations.schema_migrations',
    access: 'Supabase CLI linked data-only dump',
    raw_sql_included: false,
    excluded_fields: ['statements', 'rollback', 'created_by', 'idempotency_key'],
    hash_algorithm: 'sha256',
    local_manifest: 'docs/MANIFESTO_MIGRATIONS_FORWARD_ONLY_2026-08-26.json',
    local_migrations_tree: localManifest.source_migrations_tree,
  },
  caveats: [
    'Hash exato prova igualdade de bytes, não igualdade semântica de efeitos.',
    'Correspondência apenas por versão exige revisão de efeito; não autoriza replay, rename ou exclusão.',
    'Ausência de versão local não prova ausência de SQL equivalente sob outro identificador.',
  ],
  summary: {
    ledger_entries: entries.length,
    distinct_ledger_versions: new Set(entries.map(({ version }) => version)).size,
    ledger_min_version: entries.at(0)?.version ?? null,
    ledger_max_version: entries.at(-1)?.version ?? null,
    ledger_with_exact_local_bytes: count(({ reconciliation }) => reconciliation === 'exact_bytes'),
    ledger_with_local_version_only: count(
      ({ reconciliation }) => reconciliation === 'version_only_requires_effect_review',
    ),
    ledger_without_local_version: count(
      ({ reconciliation }) => reconciliation === 'ledger_only_version',
    ),
    ledger_with_null_statements: count(({ statements_is_null }) => statements_is_null),
    ledger_with_empty_statement_array: count(
      ({ statements_is_null, statement_count }) => !statements_is_null && statement_count === 0,
    ),
    ledger_with_name: count(({ name }) => name !== null),
    local_files: localManifest.entries.length,
    local_versioned_files_without_ledger_version: localWithoutLedger.length,
  },
  aggregate_entries_sha256: sha256(`${canonicalEntryLines}\n`),
  entries,
  local_versioned_files_without_ledger_version: localWithoutLedger,
};

writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `Manifesto sanitizado: ${manifest.summary.ledger_entries} ledger, ` +
    `${manifest.summary.ledger_with_exact_local_bytes} matches exatos, ` +
    `${manifest.summary.ledger_without_local_version} versões apenas remotas.`,
);
