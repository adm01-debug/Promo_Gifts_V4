import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, sep } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..') + sep;
const read = (path) => readFileSync(`${root}${path}`, 'utf8');
const names = [
  '20260922210000_create_quote_lineage.sql',
  '20260922211000_update_quote_lineage_lock.sql',
];
const rows = JSON.parse(read('tests/fixtures/quote-rpc-live-20260922.json')).rows;
describe('quote RPC proposal boundaries (static, not PostgreSQL simulation)', () => {
  it.each(names)('%s stays outside the auto-apply migration directory', (name) => {
    expect(existsSync(`${root}supabase/migrations/${name}`)).toBe(false);
    expect(existsSync(`${root}docs/db/proposals/${name}`)).toBe(true);
  });
  it.each([0, 1])('proposal %i changes one function, never schema/ACL/other functions', (index) => {
    const sql = read(`docs/db/proposals/${names[index]}`);
    const executable = sql.replace(/--[^\n]*/g, '');
    expect(executable.match(/CREATE OR REPLACE FUNCTION/g)).toHaveLength(1);
    expect(executable).toContain(`FUNCTION public.${rows[index].proname}(`);
    expect(executable).not.toMatch(
      /\b(?:CREATE TABLE|ALTER TABLE|CREATE TRIGGER|DROP|GRANT|REVOKE|SECURITY DEFINER)\b/,
    );
    expect(executable).toContain(`md5(p.prosrc)='${rows[index].body_md5}'`);
    const body = rows[index].definition.split('$function$')[1];
    expect(createHash('md5').update(body).digest('hex')).toBe(rows[index].body_md5);
    expect(executable).toContain(rows[index].acl);
  });
  it('simulator rejects a deployment/remote argument before starting Docker', () => {
    const result = spawnSync(
      process.execPath,
      [`${root}scripts/simulate-quote-rpc-proposals.mjs`, '--apply'],
      { encoding: 'utf8' },
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Offline only');
  });
  it('simulator uses only its named isolated container and advertises limits', () => {
    const source = read('scripts/simulate-quote-rpc-proposals.mjs');
    expect(source).toMatch(/'--network',\s*'none'/);
    expect(source).not.toMatch(
      /querySupabaseReadOnly|SUPABASE_ACCESS_TOKEN|DATABASE_URL|PGHOST|fetch\(/,
    );
    expect(source).toMatch(/docker\(\['rm',\s*'-f',\s*container\]\)/);
    expect(source).toContain('SIMULATION_PASS_RELEASE_BLOCKED');
  });
});
