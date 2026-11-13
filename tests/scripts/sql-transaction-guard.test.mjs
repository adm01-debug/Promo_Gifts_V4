import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findTransactionControl, maskSqlNoise } from '../../scripts/lib/sql-transaction-guard.mjs';

const ROOT = resolve(import.meta.dirname, '../..');

describe('findTransactionControl', () => {
  it.each([
    ['BEGIN;\nREVOKE ALL ON FUNCTION public.f() FROM anon;\nCOMMIT;'],
    ['begin;\nrevoke execute on function public.f() from anon;\ncommit;'],
    ['-- COMMIT;\nREVOKE ALL ON FUNCTION public.f() FROM anon;'],
    ['/* ROLLBACK; */ REVOKE ALL ON FUNCTION public.f() FROM anon;'],
    ["SELECT 'COMMIT; END; ROLLBACK;';"],
    ['DO $$ BEGIN PERFORM 1; END; $$;'],
    ['CREATE FUNCTION f() RETURNS void LANGUAGE plpgsql AS $fn$ BEGIN COMMIT; END $fn$;'],
    ['SAVEPOINT a;\nROLLBACK TO SAVEPOINT a;\nRELEASE SAVEPOINT a;'],
  ])('aceita draft legítimo %#', (sql) => {
    expect(findTransactionControl(sql)).toEqual([]);
  });

  it.each([
    ['BEGIN;\nREVOKE ALL ON TABLE public.t FROM anon;\nCOMMIT TRANSACTION;\nGRANT ALL ON TABLE public.t TO anon;'],
    ['BEGIN;\nEND;\nGRANT ALL ON TABLE public.t TO anon;'],
    ['BEGIN;\nROLLBACK;\nGRANT ALL ON TABLE public.t TO anon;'],
    ['ABORT;\nGRANT ALL ON TABLE public.t TO anon;'],
    ['COMMIT AND CHAIN;'],
    ['commit\n  transaction ;'],
    ['START TRANSACTION;'],
    ['BEGIN ISOLATION LEVEL SERIALIZABLE;'],
    ['PREPARE TRANSACTION \'x\';'],
    ['\\c postgres\nGRANT ALL ON TABLE public.t TO anon;'],
    ['\\! rm -rf /tmp/x'],
    ["SELECT E'\\'; COMMIT TRANSACTION; --';\nEND;"],
  ])('recusa %#', (sql) => {
    expect(findTransactionControl(sql).length).toBeGreaterThan(0);
  });
});

describe('maskSqlNoise', () => {
  it('mascara strings, comentários aninhados e corpos dollar-quoted', () => {
    const out = maskSqlNoise("a /* x /* y */ z */ 'b''c' $t$ END; $t$ \"Id\"");
    expect(out).not.toMatch(/END|[xyzbc]'/);
  });
});

describe('dry-run-migration-draft recusa antes de tocar o banco', () => {
  it('draft com COMMIT TRANSACTION sai 1 mesmo com PGHOST definido (sem psql)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dryrun-'));
    const draft = join(dir, 'x.sql');
    writeFileSync(draft, 'BEGIN;\nREVOKE ALL ON FUNCTION public.f() FROM anon;\nCOMMIT TRANSACTION;\nGRANT ALL ON TABLE public.t TO anon;\n');
    const result = spawnSync('node', ['scripts/dry-run-migration-draft.mjs', draft], {
      cwd: ROOT,
      env: { PATH: process.env.PATH, PGHOST: '127.0.0.1' },
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('escapa do ROLLBACK');
  });
});
