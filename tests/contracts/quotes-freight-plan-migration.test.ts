import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20261120040000_add_quotes_freight_plan.sql',
);
const rollbackPath = resolve(process.cwd(), 'supabase/rollbacks/20261120040000_rollback.sql');

const withoutComments = (sql: string): string =>
  sql
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n');

describe('quotes.freight_plan migration contract', () => {
  it('adds the 3 columns idempotently, with a constant default', async () => {
    const source = await readFile(migrationPath, 'utf8');

    expect(source.split('\n')[0]).toBe(
      '-- Rollback: supabase/rollbacks/20261120040000_rollback.sql',
    );
    expect(source).toContain('ADD COLUMN IF NOT EXISTS freight_plan jsonb,');
    expect(source).toContain('ADD COLUMN IF NOT EXISTS freight_mix_mode text,');
    expect(source).toContain(
      'ADD COLUMN IF NOT EXISTS show_freight_plan_to_client boolean NOT NULL DEFAULT false',
    );
    expect(withoutComments(source)).not.toMatch(/\b(?:DROP|TRUNCATE|UPDATE|DELETE)\b\s/i);
  });

  it.each([
    ['quotes_freight_mix_mode_check', "freight_mix_mode IN ('misturar', 'separar')"],
    ['quotes_freight_plan_shape_check', "jsonb_typeof(freight_plan) = 'object'"],
    ['quotes_freight_plan_shape_check', 'pg_column_size(freight_plan) < 262144'],
  ])('creates named CHECK %s guarded by pg_constraint (%s)', async (name, rule) => {
    const source = await readFile(migrationPath, 'utf8');

    expect(source).toContain(`conname = '${name}'`);
    expect(source).toContain(`ADD CONSTRAINT ${name}`);
    expect(source).toContain(rule);
  });

  it.each(['freight_plan', 'freight_mix_mode', 'show_freight_plan_to_client'])(
    'documents column %s with COMMENT',
    async (column) => {
      const source = await readFile(migrationPath, 'utf8');

      expect(source).toContain(`COMMENT ON COLUMN public.quotes.${column} IS`);
    },
  );

  it('does not touch RLS policies or functions', async () => {
    const source = await readFile(migrationPath, 'utf8');

    expect(withoutComments(source)).not.toMatch(
      /CREATE\s+POLICY|ALTER\s+POLICY|CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION/i,
    );
  });
});

describe('quotes.freight_plan rollback contract', () => {
  it('backs up used rows with RLS and no public access before dropping', async () => {
    const source = await readFile(rollbackPath, 'utf8');

    expect(source).toContain("'_backup_quotes_freight_plan_'");
    expect(source).toContain(
      'freight_plan IS NOT NULL OR freight_mix_mode IS NOT NULL OR show_freight_plan_to_client',
    );
    expect(source).toContain('ENABLE ROW LEVEL SECURITY');
    expect(source).toContain('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated');
    expect(source).toContain('IF usados <> copiados THEN');
    expect(source).toContain('Restaurar:');
  });

  it('only drops after the backup count check', async () => {
    const source = await readFile(rollbackPath, 'utf8');
    const check = source.indexOf('IF usados <> copiados THEN');
    const drop = source.indexOf('DROP COLUMN IF EXISTS freight_plan');

    expect(check).toBeGreaterThan(0);
    expect(drop).toBeGreaterThan(check);
    expect(source).toContain('DROP CONSTRAINT IF EXISTS quotes_freight_mix_mode_check');
    expect(source).toContain('DROP CONSTRAINT IF EXISTS quotes_freight_plan_shape_check');
    expect(source).toContain('DROP COLUMN IF EXISTS freight_mix_mode');
    expect(source).toContain('DROP COLUMN IF EXISTS show_freight_plan_to_client');
  });
});
