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

/** Read-only discovery: a valid pooler hostname may belong to another cluster. */
export async function validateLiveMigrationPooler(env, fetchImpl = fetch) {
  const problems = validateMigrationTarget(env);
  if (problems.length) return problems;
  if (env.PGHOST === `db.${CANONICAL_PROJECT}.supabase.co`) {
    return (env.PGPORT || '5432') === '5432' ? [] : ['Conexão direta exige porta 5432'];
  }
  if (!env.SUPABASE_ACCESS_TOKEN) return ['SUPABASE_ACCESS_TOKEN ausente para conferir pooler'];
  try {
    const response = await fetchImpl(
      `https://api.supabase.com/v1/projects/${CANONICAL_PROJECT}/config/database/pooler`,
      {
        method: 'GET',
        redirect: 'error',
        headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}` },
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!response.ok) return [`Consulta do pooler indisponível (HTTP ${response.status})`];
    const rows = await response.json();
    if (!Array.isArray(rows) || !rows.length) return ['Resposta do pooler inválida ou vazia'];
    // Supavisor exposes session mode on 5432 and transaction mode on 6543.
    // The API can advertise only transaction mode; DDL uses its session endpoint.
    const matches = rows.some(
      (row) =>
        row &&
        row.database_type === 'PRIMARY' &&
        row.db_host === env.PGHOST &&
        row.db_user === env.PGUSER &&
        row.db_name === env.PGDATABASE &&
        ((row.pool_mode === 'transaction' && row.db_port === 6543) ||
          (row.pool_mode === 'session' && row.db_port === 5432)),
    );
    if (!matches) return ['PGHOST/PGUSER/PGDATABASE não correspondem ao pooler canônico atual'];
    if ((env.PGPORT || '5432') !== '5432')
      return ['Migration exige pooler em modo session (porta 5432)'];
    return [];
  } catch {
    // Never emit response bodies, credentials, connection strings or thrown URLs.
    return ['Não foi possível validar o pooler canônico (rede, timeout ou JSON inválido)'];
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = process.argv.includes('--require-live-pooler')
    ? await validateLiveMigrationPooler(process.env)
    : validateMigrationTarget(process.env, {
        versionOnly: process.argv.includes('--version-only'),
      });
  if (problems.length) {
    console.error(problems.join('; '));
    process.exitCode = 1;
  } else console.log('Migration version and canonical target: OK');
}
