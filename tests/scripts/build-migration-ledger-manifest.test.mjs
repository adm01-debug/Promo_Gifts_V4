// scripts/build-migration-ledger-manifest.mjs (E06) — reconcilia o ledger
// sanitizado (supabase_migrations.schema_migrations, sem SQL bruto) contra o
// manifesto local de supabase/migrations/**, classificando cada versão como
// exact_bytes / version_only_requires_effect_review / ledger_only_version.
//
// Bug real encontrado nesta sessão (varredura adversarial, sem edição até a
// confirmação): `row.name.trim()` quebrava com TypeError quando `name` é
// `null` no ledger. Isso não é hipotético — a migration já mergeada em main
// supabase/migrations/20261114014500_p09_reconcile_ledger_schema_migrations.sql
// faz `INSERT INTO supabase_migrations.schema_migrations (version) VALUES (...)`
// para ~361 versões, deixando `name` NULL nessas linhas do ledger real. Uma
// nova captura do ledger sanitizado (E06) após essa migration quebraria o
// script no primeiro desses registros. Corrigido com `(row.name ?? '').trim()`.
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/build-migration-ledger-manifest.mjs');

const temporaryRoots = [];
afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'build-migration-ledger-manifest-'));
  temporaryRoots.push(dir);
  return dir;
}

function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data));
}

function runScript(args) {
  return spawnSync('node', [SCRIPT, ...args], { cwd: ROOT, encoding: 'utf8' });
}

const LOCAL_MANIFEST_FIXTURE = {
  schema_version: 1,
  status: 'local_migrations_manifest',
  source_migrations_tree: 'fake-tree',
  entries: [
    { path: 'supabase/migrations/20260101000001_a.sql', declared_version: '20260101000001', sha256: 'hashA' },
  ],
};

describe('build-migration-ledger-manifest (CLI)', () => {
  it('reporta uso e sai com código 2 quando faltam argumentos', () => {
    const result = runScript([]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Uso: node scripts/build-migration-ledger-manifest.mjs');
  });

  it('rejeita manifestos que não têm o formato esperado (ledgerRows não é array)', () => {
    const dir = tempDir();
    const ledgerPath = join(dir, 'ledger.json');
    const localPath = join(dir, 'local.json');
    const outPath = join(dir, 'out.json');
    writeJson(ledgerPath, { not: 'an array' });
    writeJson(localPath, LOCAL_MANIFEST_FIXTURE);

    const result = runScript([ledgerPath, outPath, localPath]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Manifestos de entrada não possuem o formato esperado');
  });

  it('classifica exact_bytes, version_only e ledger_only corretamente', () => {
    const dir = tempDir();
    const ledgerPath = join(dir, 'ledger.json');
    const localPath = join(dir, 'local.json');
    const outPath = join(dir, 'out.json');
    writeJson(ledgerPath, [
      {
        version: '20260101000001',
        name: 'a',
        statement_count: 1,
        statements_is_null: false,
        statement_sha256: ['hashA'],
        joined_statements_sha256: 'hashA',
        rollback_statement_count: 0,
        has_created_by: true,
        has_idempotency_key: false,
        has_rollback: false,
      },
      {
        version: '20260101000003',
        name: 'c',
        statement_count: 1,
        statements_is_null: false,
        statement_sha256: ['x'],
        joined_statements_sha256: 'zz',
        rollback_statement_count: 0,
        has_created_by: false,
        has_idempotency_key: false,
        has_rollback: false,
      },
    ]);
    writeJson(localPath, LOCAL_MANIFEST_FIXTURE);

    const result = runScript([ledgerPath, outPath, localPath]);
    expect(result.status).toBe(0);

    const manifest = JSON.parse(readFileSync(outPath, 'utf8'));
    expect(manifest.summary.ledger_entries).toBe(2);
    expect(manifest.entries.find((e) => e.version === '20260101000001').reconciliation).toBe(
      'exact_bytes',
    );
    expect(manifest.entries.find((e) => e.version === '20260101000003').reconciliation).toBe(
      'ledger_only_version',
    );
    expect(manifest.local_versioned_files_without_ledger_version).toEqual([]);
  });

  // Regressão do bug real: name NULL no ledger (caso real e já em produção —
  // ver comentário de topo do arquivo) não pode derrubar o script.
  it('não quebra quando row.name é NULL no ledger (ex.: INSERT INTO ...(version) sem name)', () => {
    const dir = tempDir();
    const ledgerPath = join(dir, 'ledger.json');
    const localPath = join(dir, 'local.json');
    const outPath = join(dir, 'out.json');
    writeJson(ledgerPath, [
      {
        version: '20260101000099',
        name: null,
        statement_count: 0,
        statements_is_null: true,
        statement_sha256: [],
        joined_statements_sha256: null,
        rollback_statement_count: 0,
        has_created_by: false,
        has_idempotency_key: false,
        has_rollback: false,
      },
    ]);
    writeJson(localPath, LOCAL_MANIFEST_FIXTURE);

    const result = runScript([ledgerPath, outPath, localPath]);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');

    const manifest = JSON.parse(readFileSync(outPath, 'utf8'));
    expect(manifest.entries).toHaveLength(1);
    expect(manifest.entries[0].name).toBeNull();
    expect(manifest.entries[0].reconciliation).toBe('ledger_only_version');
  });

  it('também não quebra quando row.name é string vazia (comportamento preexistente preservado)', () => {
    const dir = tempDir();
    const ledgerPath = join(dir, 'ledger.json');
    const localPath = join(dir, 'local.json');
    const outPath = join(dir, 'out.json');
    writeJson(ledgerPath, [
      {
        version: '20260101000098',
        name: '   ',
        statement_count: 0,
        statements_is_null: true,
        statement_sha256: [],
        joined_statements_sha256: null,
        rollback_statement_count: 0,
        has_created_by: false,
        has_idempotency_key: false,
        has_rollback: false,
      },
    ]);
    writeJson(localPath, LOCAL_MANIFEST_FIXTURE);

    const result = runScript([ledgerPath, outPath, localPath]);
    expect(result.status).toBe(0);
    const manifest = JSON.parse(readFileSync(outPath, 'utf8'));
    expect(manifest.entries[0].name).toBeNull();
  });
});
