import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import {
  CANONICAL_PROJECT,
  validateMigrationTarget,
  validateLiveMigrationPooler,
} from '../../scripts/validate-migration-target.mjs';

const valid = {
  MIGRATION_VERSION: '20260920120000',
  SUPABASE_PROJECT_REF: CANONICAL_PROJECT,
  PGHOST: `db.${CANONICAL_PROJECT}.supabase.co`,
  PGUSER: 'postgres',
  PGPASSWORD: 'fixture-only',
  PGDATABASE: 'postgres',
  PGPORT: '5432',
};
describe('controlled migration target', () => {
  it('accepts canonical direct and shared pooler targets', () => {
    expect(validateMigrationTarget(valid)).toEqual([]);
    expect(
      validateMigrationTarget({
        ...valid,
        PGHOST: 'aws-0-sa-east-1.pooler.supabase.com',
        PGUSER: `postgres.${CANONICAL_PROJECT}`,
      }),
    ).toEqual([]);
  });
  it.each([
    '',
    '$(id)',
    '20260920120000";id',
    '../20260920120000',
    '20260920120000\nexit',
    '20260920120000;id',
  ])('rejects version %j before shell execution', (MIGRATION_VERSION) => {
    expect(
      validateMigrationTarget({ ...valid, MIGRATION_VERSION }, { versionOnly: true }),
    ).toContain('MIGRATION_VERSION inválida');
  });
  it.each([
    { SUPABASE_PROJECT_REF: 'different-project' },
    { PGHOST: 'db.different-project.supabase.co' },
    { PGHOST: 'aws-0-sa-east-1.pooler.supabase.com', PGUSER: 'postgres.otherproject' },
    { PGHOST: 'aws-0-sa-east-1.pooler.supabase.com', PGUSER: 'postgres' },
    { PGHOST: `db.${CANONICAL_PROJECT}.supabase.co.attacker.invalid` },
    { PGDATABASE: 'other' },
    { PGPORT: '1234' },
    { PGPASSWORD: '' },
  ])('rejects invalid or incomplete target %j', (overrides) => {
    const problems = validateMigrationTarget({ ...valid, ...overrides });
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.join(' ')).not.toContain(valid.PGPASSWORD);
  });
  it('preflight needs only version and canonical project, not database credentials', () => {
    expect(
      validateMigrationTarget(
        { MIGRATION_VERSION: valid.MIGRATION_VERSION, SUPABASE_PROJECT_REF: CANONICAL_PROJECT },
        { versionOnly: true },
      ),
    ).toEqual([]);
  });
  it('workflow routes user input through env and validates PG target before DDL', () => {
    const path = resolve(
      dirname(fileURLToPath(import.meta.url)),
      '../../.github/workflows/db-apply-migration.yml',
    );
    const workflow = YAML.parse(readFileSync(path, 'utf8'));
    expect(workflow.env.SUPABASE_PROJECT_REF).toBe(CANONICAL_PROJECT);
    expect(workflow.env.MIGRATION_VERSION).toBe('${{ inputs.version }}');
    for (const job of Object.values(workflow.jobs)) {
      for (const step of job.steps) {
        expect(step.run || '').not.toContain('inputs.version');
        expect(step.run || '').not.toContain('secrets.PGPASSWORD');
      }
    }
    const steps = workflow.jobs.apply.steps;
    const guard = steps.findIndex(
      (step) => step.run === 'node scripts/validate-migration-target.mjs --require-live-pooler',
    );
    const apply = steps.findIndex((step) => step.run?.startsWith('psql -X -w -1'));
    expect(guard).toBeGreaterThan(-1);
    expect(apply).toBeGreaterThan(guard);
    expect(steps[apply].env.PGSSLMODE).toBe('require');
    expect(steps[guard].env.SUPABASE_ACCESS_TOKEN).toBe('${{ secrets.SUPABASE_ACCESS_TOKEN }}');
    const connection = steps.findIndex((step) => step.run?.includes('BEGIN READ ONLY'));
    expect(connection).toBeGreaterThan(guard);
    expect(connection).toBeLessThan(apply);
    expect(steps[connection].env.PGCONNECT_TIMEOUT).toBe('15');
    expect(steps[apply].env.PGCONNECT_TIMEOUT).toBe('15');
    const repair = steps.find((step) => step.name === 'migration repair --status applied');
    expect(repair.env.SUPABASE_DB_PASSWORD).toBe('${{ secrets.PGPASSWORD }}');
  });
});

describe('live canonical pooler validation', () => {
  const pooler = {
    ...valid,
    PGHOST: 'aws-1-sa-east-1.pooler.supabase.com',
    PGUSER: `postgres.${CANONICAL_PROJECT}`,
    SUPABASE_ACCESS_TOKEN: 'test-access-token',
  };
  const row = {
    database_type: 'PRIMARY',
    db_host: pooler.PGHOST,
    db_user: pooler.PGUSER,
    db_name: 'postgres',
    db_port: 6543,
    pool_mode: 'transaction',
  };
  const response = (rows) => async () => ({ ok: true, json: async () => rows });

  it('validates session endpoint against live PRIMARY pooler, with bounded read-only discovery', async () => {
    let called = false;
    expect(
      await validateLiveMigrationPooler(pooler, async (url, options) => {
        called = true;
        expect(url).toBe(
          `https://api.supabase.com/v1/projects/${CANONICAL_PROJECT}/config/database/pooler`,
        );
        expect(options.method).toBe('GET');
        expect(options.redirect).toBe('error');
        expect(options.headers.Authorization).toBe(`Bearer ${pooler.SUPABASE_ACCESS_TOKEN}`);
        expect(options.signal).toBeInstanceOf(AbortSignal);
        return { ok: true, json: async () => [row] };
      }),
    ).toEqual([]);
    expect(called).toBe(true);
  });
  it('reproduces ENOTFOUND risk: syntactically valid old cluster fails live validation', async () => {
    const stale = { ...pooler, PGHOST: 'aws-0-sa-east-1.pooler.supabase.com' };
    expect(validateMigrationTarget(stale)).toEqual([]);
    expect(await validateLiveMigrationPooler(stale, response([row]))).toHaveLength(1);
  });
  it.each([
    { database_type: 'READ_REPLICA' },
    { db_user: 'postgres.other' },
    { db_name: 'other' },
    { db_host: 'aws-0-sa-east-1.pooler.supabase.com' },
    { db_port: 1234 },
    { pool_mode: 'unknown' },
  ])('rejects mismatched discovery %j', async (override) => {
    expect(
      await validateLiveMigrationPooler(pooler, response([{ ...row, ...override }])),
    ).toHaveLength(1);
  });
  it('accepts explicit session config and ignores unrelated replicas', async () => {
    expect(
      await validateLiveMigrationPooler(
        pooler,
        response([
          { ...row, database_type: 'READ_REPLICA', db_host: 'another-host' },
          { ...row, db_port: 5432, pool_mode: 'session' },
        ]),
      ),
    ).toEqual([]);
  });
  it.each([null, {}, [], [null], [false], [{ secret: 'do-not-print' }]])(
    'fails closed on response %j',
    async (rows) => {
      const result = await validateLiveMigrationPooler(pooler, response(rows));
      expect(result).toHaveLength(1);
      expect(result.join()).not.toContain('do-not-print');
    },
  );
  it.each([401, 403, 404, 429, 500])(
    'fails closed on HTTP %d without parsing body',
    async (status) => {
      expect(
        await validateLiveMigrationPooler(pooler, async () => ({ ok: false, status })),
      ).toEqual([`Consulta do pooler indisponível (HTTP ${status})`]);
    },
  );
  it('sanitizes network and invalid JSON exceptions', async () => {
    for (const fetchImpl of [
      async () => {
        throw new Error('test-access-token fixture-only');
      },
      async () => ({
        ok: true,
        json: async () => {
          throw new Error('test-access-token fixture-only');
        },
      }),
    ]) {
      const result = await validateLiveMigrationPooler(pooler, fetchImpl);
      expect(result).toHaveLength(1);
      expect(result.join()).not.toContain(pooler.SUPABASE_ACCESS_TOKEN);
      expect(result.join()).not.toContain(pooler.PGPASSWORD);
    }
  });
  it('rejects bad local target or missing PAT before any network request', async () => {
    const unexpected = async () => {
      throw new Error('should not fetch');
    };
    expect(
      await validateLiveMigrationPooler({ ...pooler, SUPABASE_PROJECT_REF: 'other' }, unexpected),
    ).toContain('Project ref não canônico');
    expect(
      await validateLiveMigrationPooler({ ...pooler, SUPABASE_ACCESS_TOKEN: '' }, unexpected),
    ).toEqual(['SUPABASE_ACCESS_TOKEN ausente para conferir pooler']);
  });
  it('requires session port for pooler and standard port for direct connection', async () => {
    expect(
      await validateLiveMigrationPooler({ ...pooler, PGPORT: '6543' }, response([row])),
    ).toEqual(['Migration exige pooler em modo session (porta 5432)']);
    expect(await validateLiveMigrationPooler(valid, response([]))).toEqual([]);
    expect(await validateLiveMigrationPooler({ ...valid, PGPORT: '6543' }, response([]))).toEqual([
      'Conexão direta exige porta 5432',
    ]);
  });
});
