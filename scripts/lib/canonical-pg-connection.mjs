import { CANONICAL_PROJECT, validateMigrationTarget } from '../validate-migration-target.mjs';

const PG_KEYS = ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD'];

function validatedEnv(env) {
  const candidate = {
    ...env,
    SUPABASE_PROJECT_REF: env.SUPABASE_PROJECT_REF || CANONICAL_PROJECT,
    PGSSLMODE: env.PGSSLMODE || 'require',
    PGCONNECT_TIMEOUT: env.PGCONNECT_TIMEOUT || '15',
  };
  if (candidate.PGPORT !== '5432') return null;
  return validateMigrationTarget(candidate, { targetOnly: true }).length ? null : candidate;
}

function fromDatabaseUrl(databaseUrl, env) {
  try {
    const url = new URL(databaseUrl);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) return null;
    const candidate = {
      ...env,
      PGHOST: url.hostname,
      PGPORT: url.port || '5432',
      PGDATABASE: decodeURIComponent(url.pathname.replace(/^\/+/, '')) || 'postgres',
      PGUSER: decodeURIComponent(url.username),
      PGPASSWORD: decodeURIComponent(url.password),
      PGSSLMODE: url.searchParams.get('sslmode') || env.PGSSLMODE || 'require',
    };
    return validatedEnv(candidate);
  } catch {
    return null;
  }
}

export function canonicalPgConnection(env = process.env) {
  const configuredPgKeys = PG_KEYS.filter((key) => env[key]);
  if (configuredPgKeys.length === PG_KEYS.length) {
    const candidate = validatedEnv(env);
    return candidate ? { args: [], env: candidate } : null;
  }
  if (configuredPgKeys.length > 0) return null;

  if (env.DATABASE_URL) {
    const candidate = fromDatabaseUrl(env.DATABASE_URL, env);
    return candidate ? { args: [], env: candidate } : null;
  }

  if (env.SUPABASE_PROJECT_REF === CANONICAL_PROJECT && env.SUPABASE_DB_PASSWORD) {
    const candidate = validatedEnv({
      ...env,
      PGHOST: `db.${CANONICAL_PROJECT}.supabase.co`,
      PGPORT: '5432',
      PGDATABASE: 'postgres',
      PGUSER: 'postgres',
      PGPASSWORD: env.SUPABASE_DB_PASSWORD,
    });
    return candidate ? { args: [], env: candidate } : null;
  }
  return null;
}
