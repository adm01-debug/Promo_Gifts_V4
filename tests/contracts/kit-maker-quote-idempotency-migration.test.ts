import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260911172000_kit_maker_quote_idempotency.sql',
);

describe('Kit Maker quote idempotency migration contract', () => {
  it('wraps the existing transactional writer with a non-destructive RLS-protected ledger', async () => {
    const source = await readFile(migrationPath, 'utf8');

    expect(source).toContain('CREATE TABLE IF NOT EXISTS public.kit_quote_requests');
    expect(source).toContain('CREATE OR REPLACE FUNCTION public.create_kit_quote_transactional');
    expect(source).toContain('public.create_quote_transactional(_quote, _items)');
    expect(source).toContain('pg_advisory_xact_lock');
    expect(source).toContain('payload_hash <> _payload_hash');
    expect(source).toContain('ENABLE ROW LEVEL SECURITY');
    expect(source).toContain('SECURITY INVOKER');
    expect(source).toContain('REVOKE ALL ON FUNCTION public.create_kit_quote_transactional');
    expect(source).toContain('GRANT EXECUTE ON FUNCTION public.create_kit_quote_transactional');
    expect(source).not.toMatch(/\b(?:DROP|TRUNCATE)\s+(?:TABLE|COLUMN|FUNCTION)\b/i);
    expect(source).not.toMatch(/SECURITY\s+DEFINER/i);
  });
});
