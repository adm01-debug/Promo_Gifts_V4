import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260911130357_kit_maker_optimistic_persistence.sql',
);

describe('Kit Maker optimistic persistence migration contract', () => {
  it('is additive and protects writes with revision, idempotency, RLS and least privilege', async () => {
    const source = await readFile(migrationPath, 'utf8');

    expect(source).toContain('ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0');
    expect(source).toContain('CREATE TABLE IF NOT EXISTS public.kit_save_requests');
    expect(source).toContain('ENABLE ROW LEVEL SECURITY');
    expect(source).toContain('SECURITY INVOKER');
    expect(source).toContain("ERRCODE = '40001'");
    expect(source).toContain('REVOKE ALL ON FUNCTION public.save_custom_kit_atomic');
    expect(source).toContain('GRANT EXECUTE ON FUNCTION public.save_custom_kit_atomic');
    expect(source).not.toMatch(/\bDROP\s+(TABLE|COLUMN|FUNCTION)\b/i);
    expect(source).not.toMatch(/SECURITY\s+DEFINER/i);
  });
});
