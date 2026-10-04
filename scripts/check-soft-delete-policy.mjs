#!/usr/bin/env node
/**
 * Gate: política soft-delete (auditoria 20-dim 2026-10-02, item processo).
 *
 * Toda tabela de NEGÓCIO criada em migration nova deve ter coluna
 * `deleted_at`/`archived_at` (soft-delete) OU justificativa explícita.
 * Baseline ratchet: só falha se a contagem de tabelas-sem-soft-delete
 * AUMENTAR — o estoque atual (tabelas pré-política) está congelado na
 * baseline `.soft-delete-baseline.json`.
 *
 * Exempt:
 *   • comentário `-- soft-delete-exempt: <motivo>` dentro do statement
 *   • tabelas explicitamente utilitárias listadas em SYSTEM_TABLES abaixo
 *     (logs, stages Bronze, junctions de cache — append-only por contrato)
 *
 * Uso:
 *   node scripts/check-soft-delete-policy.mjs           # gate
 *   node scripts/check-soft-delete-policy.mjs --update  # regravar baseline
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { runBaselineGate } from './lib/baseline-gate.mjs';

const ROOT = process.cwd();
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');

// Tabelas utilitárias onde DELETE físico / append-only é o contrato correto.
const SYSTEM_TABLES = new Set([
  'schema_migrations',
  'seed_types',
  'spatial_ref_sys',
]);

function scan() {
  const counts = new Map();
  if (!existsSync(MIGRATIONS_DIR)) return counts;

  for (const file of readdirSync(MIGRATIONS_DIR)) {
    if (!file.endsWith('.sql')) continue;
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    let violations = 0;

    // Statements separados por ';' + newline (convenção das migrations do repo).
    for (const raw of sql.split(/;\s*(?:\n|$)/)) {
      const stmt = raw.trim();
      const m = /create\s+table\s+(?:if\s+not\s+exists\s+)?([\w."']+)/i.exec(stmt);
      if (!m) continue;
      const table = m[1].replace(/["']/g, '').split('.').pop().toLowerCase();
      if (SYSTEM_TABLES.has(table)) continue;
      if (/soft-delete-exempt/i.test(stmt)) continue;
      // Tabela não-BRONZE precisa de deleted_at OU archived_at. Stages raw/*
      // (append-only por design Medallion) ficam fora — marcadas com exempt.
      if (!/\b(deleted_at|archived_at)\b/i.test(stmt)) violations += 1;
    }
    if (violations > 0) counts.set(relative(ROOT, join(MIGRATIONS_DIR, file)), violations);
  }
  return counts;
}

runBaselineGate({
  baselineFile: '.soft-delete-baseline.json',
  label: 'Soft-delete policy gate',
  description:
    'Tabelas criadas em migration sem coluna deleted_at/archived_at e sem marcação soft-delete-exempt (política em docs/db/POLITICA_SOFT_DELETE.md).',
  totalKey: 'tablesWithoutSoftDelete',
  fixHint:
    'Adicione `deleted_at timestamptz` (recomendado) ou `archived_at` na tabela nova, ' +
    'OU marque o statement com `-- soft-delete-exempt: <motivo>` quando a tabela for ' +
    'append-only/log/stage (ver docs/db/POLITICA_SOFT_DELETE.md). ' +
    'Para regravar a baseline após decisão consciente: npm run check:soft-delete-policy:update',
  scan,
});
