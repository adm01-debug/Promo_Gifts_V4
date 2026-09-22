#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

export const CANONICAL_PROJECT = 'doufsxqlfjyuvxuezpln';
export function validateMigrationTarget(env, { versionOnly = false } = {}) {
  const problems = [];
  if (!/^\d{6,19}(?:_[A-Za-z0-9]+)*$/.test(env.MIGRATION_VERSION || '')) {
    problems.push('MIGRATION_VERSION inválida');
  }
  if (env.SUPABASE_PROJECT_REF !== CANONICAL_PROJECT) problems.push('Project ref não canônico');
  if (versionOnly) return problems;
  for (const key of ['PGHOST', 'PGUSER', 'PGPASSWORD', 'PGDATABASE']) {
    if (!env[key]) problems.push(`${key} ausente`);
  }
  // Shared pooler hosts do not identify a project; the user suffix must do so.
  const direct = env.PGHOST === `db.${CANONICAL_PROJECT}.supabase.co`;
  const pooler =
    /^[a-z0-9-]+\.pooler\.supabase\.com$/.test(env.PGHOST || '') &&
    new RegExp(`^[a-zA-Z0-9_]+\\.${CANONICAL_PROJECT}$`).test(env.PGUSER || '');
  if (!direct && !pooler) problems.push('Destino PostgreSQL não identifica o projeto canônico');
  if (env.PGDATABASE !== 'postgres') problems.push('PGDATABASE inesperado');
  if (!['5432', '6543'].includes(env.PGPORT || '5432')) problems.push('PGPORT inesperado');
  // Diagnostics deliberately never include env values, especially passwords.
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = validateMigrationTarget(process.env, {
    versionOnly: process.argv.includes('--version-only'),
  });
  if (problems.length) {
    console.error(problems.join('; '));
    process.exitCode = 1;
  } else console.log('Migration version and canonical target: OK');
}
