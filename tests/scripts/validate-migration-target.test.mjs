import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import {
  CANONICAL_PROJECT,
  validateMigrationTarget,
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
      (step) => step.run === 'node scripts/validate-migration-target.mjs',
    );
    const apply = steps.findIndex((step) => step.run?.startsWith('psql -1'));
    expect(guard).toBeGreaterThan(-1);
    expect(apply).toBeGreaterThan(guard);
    expect(steps[apply].env.PGSSLMODE).toBe('require');
  });
});
