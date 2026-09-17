#!/usr/bin/env node
/**
 * build-local-migrations-manifest.mjs
 *
 * Gera o manifesto local de supabase/migrations/**, no formato mínimo que
 * scripts/build-migration-ledger-manifest.mjs consome: { path, declared_version,
 * sha256 } por arquivo, mais metadados de execução.
 *
 * Substitui a regeneração manual do antigo `MANIFESTO_MIGRATIONS_FORWARD_ONLY`
 * (2026-08-26), cujo script gerador não foi versionado — só o output ficou no
 * repo. Este script cobre o que build-migration-ledger-manifest.mjs
 * efetivamente lê (path/declared_version/sha256). NÃO reproduz os
 * `effect_signals`/`precondition_signals` do manifesto antigo — isso é
 * trabalho de E07 do plano DBA (classificação por objeto), não deste script.
 *
 * Uso:
 *   node scripts/build-local-migrations-manifest.mjs <saida.json>
 */

import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const [, , outputArg] = process.argv;
if (!outputArg) {
  console.error('Uso: node scripts/build-local-migrations-manifest.mjs <saida.json>');
  process.exit(2);
}

const ROOT = process.cwd();
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');
const outputPath = resolve(outputArg);

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

function declaredVersionOf(filename) {
  const m = filename.match(/^([0-9]+)_/);
  if (!m) return null;
  return m[1];
}

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const entries = files.map((f) => {
  const path = `supabase/migrations/${f}`;
  const buf = readFileSync(join(MIGRATIONS_DIR, f));
  const version = declaredVersionOf(f);
  return {
    path,
    declared_version: version,
    canonical_14_digit_version: version !== null && /^[0-9]{14}$/.test(version),
    bytes: buf.length,
    sha256: sha256(buf),
  };
});

let sourceTree = null;
try {
  sourceTree = execSync(`git rev-parse HEAD:supabase/migrations`, { encoding: 'utf8' }).trim();
} catch {
  sourceTree = null;
}

const withVersion = entries.filter((e) => e.declared_version !== null);
const versionCounts = new Map();
for (const e of withVersion) {
  versionCounts.set(e.declared_version, (versionCounts.get(e.declared_version) ?? 0) + 1);
}
const duplicateVersions = [...versionCounts.entries()].filter(([, n]) => n > 1);

const manifest = {
  schema_version: 1,
  status: 'local_migrations_manifest',
  generated_at: new Date().toISOString(),
  source_migrations_tree: sourceTree,
  file_count: entries.length,
  entries_without_declared_version: entries.filter((e) => e.declared_version === null).length,
  entries_non_canonical_version: entries.filter(
    (e) => e.declared_version !== null && !e.canonical_14_digit_version,
  ).length,
  duplicate_version_count: duplicateVersions.length,
  entries,
};

writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
console.log(
  `Manifesto local: ${manifest.file_count} arquivos, ` +
    `${manifest.entries_without_declared_version} sem versão declarada, ` +
    `${manifest.entries_non_canonical_version} fora do contrato de 14 dígitos, ` +
    `${manifest.duplicate_version_count} versões duplicadas.`,
);
