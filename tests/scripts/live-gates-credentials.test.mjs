import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
let dir;
let mock;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'livegate-'));
  mock = join(dir, 'mock-fetch.mjs');
  // Simula a Management API: MOCK_ROWS (JSON) ou MOCK_STATUS (HTTP de erro); conta chamadas em MOCK_CALLS.
  writeFileSync(
    mock,
    `import { appendFileSync } from 'node:fs';
globalThis.fetch = async (url) => {
  if (process.env.MOCK_CALLS) appendFileSync(process.env.MOCK_CALLS, String(url) + '\\n');
  const status = Number(process.env.MOCK_STATUS || 200);
  if (status !== 200) return new Response('x', { status });
  return new Response(process.env.MOCK_ROWS || '[]', { status: 200 });
};
`,
  );
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const run = (script, env = {}) => {
  const clean = { ...process.env };
  for (const k of ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_PROJECT_REF', 'VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CI', 'GITHUB_ACTIONS', 'REQUIRE_LIVE'])
    delete clean[k];
  return spawnSync('node', ['--import', mock, script, '--gate'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...clean, ...env },
  });
};
const live = { SUPABASE_ACCESS_TOKEN: 'sbp_fake', SUPABASE_PROJECT_REF: 'doufsxqlfjyuvxuezpln' };
const allowlist = () =>
  JSON.parse(readFileSync(join(ROOT, '.security/rls-no-policy-allowlist.json'), 'utf8')).tables.map((t) => ({ table: t.table }));

describe('check-rls-no-policy-drift --gate', () => {
  const S = 'scripts/check-rls-no-policy-drift.mjs';

  it('sem credencial: continua estático (não consulta o banco)', () => {
    const calls = join(dir, 'rls-nocred.log');
    const r = run(S, { MOCK_CALLS: calls });
    expect(r.status).toBe(0);
    expect(() => readFileSync(calls)).toThrow();
  });

  it('com credencial: consulta a Management API e reprova tabela nova sem policy', () => {
    const calls = join(dir, 'rls-drift.log');
    const rows = JSON.stringify([...allowlist(), { table: 'public.tabela_nova_sem_policy' }]);
    const r = run(S, { ...live, MOCK_ROWS: rows, MOCK_CALLS: calls });
    expect(readFileSync(calls, 'utf8')).toContain('api.supabase.com/v1/projects/doufsxqlfjyuvxuezpln/database/query/read-only');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('public.tabela_nova_sem_policy');
  });

  it('com credencial e banco igual à allowlist: passa', () => {
    const r = run(S, { ...live, MOCK_ROWS: JSON.stringify(allowlist()) });
    expect(r.status).toBe(0);
  });

  it('com credencial e API fora do ar (500): inconclusivo, não verde', () => {
    const r = run(S, { ...live, MOCK_STATUS: '500' });
    expect(r.status).toBe(2);
  });
});

describe('check-migration-receipts --gate', () => {
  const S = 'scripts/check-migration-receipts.mjs';

  it('sem credencial: continua estático', () => {
    const calls = join(dir, 'rec-nocred.log');
    const r = run(S, { MOCK_CALLS: calls });
    expect(r.status).toBe(0);
    expect(() => readFileSync(calls)).toThrow();
  });

  it('com credencial: migration aplicada há >24h sem recibo reprova', () => {
    const calls = join(dir, 'rec-drift.log');
    const r = run(S, { ...live, MOCK_ROWS: JSON.stringify([{ version: '20200101000000' }]), MOCK_CALLS: calls });
    expect(readFileSync(calls, 'utf8')).toContain('database/query/read-only');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('20200101000000');
  });

  it('com credencial e nenhuma migration pendente de recibo: passa', () => {
    expect(run(S, { ...live, MOCK_ROWS: '[]' }).status).toBe(0);
  });

  it('com credencial e API fora do ar (500): inconclusivo', () => {
    expect(run(S, { ...live, MOCK_STATUS: '500' }).status).toBe(2);
  });
});
