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
  '20260922210500_increment_quote_version_explicit_bump.sql',
  '20260922211000_update_quote_lineage_lock.sql',
];
const rows = JSON.parse(read('tests/fixtures/quote-rpc-live-20260922.json')).rows;
const manifest = JSON.parse(read('tests/fixtures/quote-rpc-proposal-manifest.json'));
const promotionPath = 'supabase/migrations/20260923114500_quote_rpc_lineage_atomicity.sql';
describe('quote RPC proposal boundaries (static, not PostgreSQL simulation)', () => {
  it.each(names)('%s stays outside the auto-apply migration directory', (name) => {
    expect(existsSync(`${root}supabase/migrations/${name}`)).toBe(false);
    expect(existsSync(`${root}docs/db/proposals/${name}`)).toBe(true);
  });
  it.each([0, 2])('proposal %i changes one RPC, never schema/ACL/other functions', (index) => {
    const sql = read(`docs/db/proposals/${names[index]}`);
    const executable = sql.replace(/--[^\n]*/g, '');
    const row = rows[index === 0 ? 0 : 1];
    expect(executable.match(/CREATE\s+OR\s+REPLACE\s+FUNCTION/gi)).toHaveLength(1);
    expect(executable.toLowerCase()).toContain(`function public.${row.proname}(`);
    expect(executable).not.toMatch(
      /\b(?:CREATE\s+TABLE|ALTER\s+TABLE|CREATE\s+TRIGGER|DROP|GRANT|REVOKE|SECURITY\s+DEFINER)\b/i,
    );
    expect(executable).toContain(`md5(p.prosrc)='${row.body_md5}'`);
    const body = row.definition.split('$function$')[1];
    expect(createHash('md5').update(body).digest('hex')).toBe(row.body_md5);
    expect(executable).toContain(row.acl);
  });
  it('version helper changes one trigger function and preserves metadata', () => {
    const executable = read(`docs/db/proposals/${names[1]}`).replace(/--[^\n]*/g, '');
    expect(executable.match(/CREATE\s+OR\s+REPLACE\s+FUNCTION/gi)).toHaveLength(1);
    expect(executable).toContain('public.increment_quote_version()');
    expect(executable).toContain("md5(p.prosrc)='8dc69376bb204fa774c7b193a7bbce4f'");
    expect(executable).not.toMatch(
      /\b(?:CREATE\s+TABLE|ALTER\s+TABLE|CREATE\s+TRIGGER|DROP|GRANT|REVOKE|SECURITY\s+DEFINER)\b/i,
    );
  });
  it('machine manifest pins every reviewed artifact and the immutable PG17 image', () => {
    expect(manifest.canonical_project_ref).toBe('doufsxqlfjyuvxuezpln');
    expect(manifest.postgres_image).toMatch(/^postgres@sha256:[a-f0-9]{64}$/);
    for (const [path, expected] of Object.entries(manifest.files)) {
      expect(createHash('sha256').update(read(path)).digest('hex'), path).toBe(expected);
    }
    for (const [index, signature] of [
      [0, 'create_quote_transactional(jsonb,jsonb)'],
      [1, 'increment_quote_version()'],
      [2, 'update_quote_transactional(uuid,jsonb,jsonb,integer)'],
    ]) {
      const body = read(`docs/db/proposals/${names[index]}`).split('$function$')[1];
      expect(createHash('md5').update(body).digest('hex'), signature).toBe(
        manifest.expected_prosrc_md5[signature],
      );
    }
  });
  it('promotion manifest applies exactly the three reviewed proposals in dependency order', () => {
    const source = read(promotionPath);
    const executableLines = source
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('--'));

    expect(source).toContain('Projeto canônico: doufsxqlfjyuvxuezpln');
    expect(source).toContain('Escopo fechado: somente as três funções');
    expect(source).toContain('94ec0a32148ddccd2a71f8a67783a8f64f7c3d2d5968a28aa82855c975a90d55');
    expect(source).toContain('502caec43349a3bd5e88e3dbb989f96f4401f9d2b9440e7790124dd4534142be');
    expect(source).toContain('ae87ae018f88ab9b9c8496de9fcdafe8b2321778135de79ed46377fb429c57bc');
    expect(executableLines).toEqual(
      names.map((name) => `\\ir ../../docs/db/proposals/${name}`),
    );
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
    expect(source).toContain('SIMULATION_PASS_LOCAL_ONLY');
    expect(source).toContain('manifest.postgres_image');
  });
});
