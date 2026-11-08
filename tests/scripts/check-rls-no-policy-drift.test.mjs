import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/check-rls-no-policy-drift.mjs');
const temporaryRoots = [];
const CREDENTIAL_KEYS = [
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_PROJECT_REF',
  'VITE_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function tempDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  temporaryRoots.push(dir);
  return dir;
}

function run(args, envOverrides = {}, preloadPath) {
  const env = { ...process.env };
  for (const key of CREDENTIAL_KEYS) delete env[key];
  Object.assign(env, envOverrides);
  const nodeArgs = preloadPath ? ['--import', preloadPath, SCRIPT, ...args] : [SCRIPT, ...args];
  return spawnSync(process.execPath, nodeArgs, { cwd: ROOT, env, encoding: 'utf8' });
}

function mockFetchModule(dir, status = 200) {
  const path = join(dir, 'mock-fetch.mjs');
  writeFileSync(
    path,
    `globalThis.fetch = async (url, options) => {
      if (!String(url).endsWith('/database/query/read-only')) throw new Error('unexpected endpoint');
      if (options.method !== 'POST') throw new Error('unexpected HTTP method');
      const body = JSON.parse(options.body);
      if (!/^SELECT\\b/i.test(body.query)) throw new Error('query is not read-only SELECT');
      if (options.headers.Authorization !== 'Bearer unit-test-token') throw new Error('missing auth header');
      process.stdout.write('MOCK_READ_ONLY_QUERY_CALLED\\n');
      return new Response(${JSON.stringify(status === 200 ? '[]' : 'gateway error')}, { status: ${status} });
    };\n`,
  );
  return path;
}

describe('CLI --gate', () => {
  it('consulta a Management API read-only quando as credenciais completas estão disponíveis', () => {
    const dir = tempDir('rls-no-policy-live-');
    const preload = mockFetchModule(dir);
    const result = run(
      ['--gate'],
      { SUPABASE_ACCESS_TOKEN: 'unit-test-token', SUPABASE_PROJECT_REF: 'project-test' },
      preload,
    );
    const output = result.stdout + result.stderr;

    expect(result.status).toBe(0);
    expect(output).toContain('MOCK_READ_ONLY_QUERY_CALLED');
    expect(output).toContain('✅ rls-no-policy:');
    expect(output).not.toContain('static-pass');
    expect(output).not.toContain('unit-test-token');
  });

  it('não transforma uma falha da Management API em static-pass', () => {
    const dir = tempDir('rls-no-policy-live-error-');
    const preload = mockFetchModule(dir, 404);
    const result = run(
      ['--gate'],
      { SUPABASE_ACCESS_TOKEN: 'unit-test-token', SUPABASE_PROJECT_REF: 'project-test' },
      preload,
    );
    const output = result.stdout + result.stderr;

    expect(result.status).toBe(2);
    expect(output).toContain('MOCK_READ_ONLY_QUERY_CALLED');
    expect(output).toContain('[rls-no-policy] inconclusive:');
    expect(output).not.toContain('static-pass');
    expect(output).not.toContain('unit-test-token');
  });

  it('preserva static-pass para forks sem credenciais', () => {
    const result = run(['--gate']);
    const output = result.stdout + result.stderr;

    expect(result.status).toBe(0);
    expect(output).toContain('[rls-no-policy] static-pass:');
    expect(output).not.toContain('MOCK_READ_ONLY_QUERY_CALLED');
  });

  it('respeita --require-live e retorna inconclusive sem credenciais', () => {
    const result = run(['--gate', '--require-live']);
    const output = result.stdout + result.stderr;

    expect(result.status).toBe(2);
    expect(output).toContain('[rls-no-policy] inconclusive:');
  });

  it('falha inconclusivo se --gate recebe credenciais parciais em vez de degradação estática', () => {
    const result = run(['--gate'], { SUPABASE_ACCESS_TOKEN: 'unit-test-token' });
    const output = result.stdout + result.stderr;

    expect(result.status).toBe(2);
    expect(output).toContain('[rls-no-policy] inconclusive:');
    expect(output).not.toContain('unit-test-token');
  });
});
