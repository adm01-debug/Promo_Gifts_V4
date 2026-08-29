import { afterEach, describe, expect, it, vi } from 'vitest';
import { querySupabaseReadOnly } from '../../scripts/supabase-read-only-query.mjs';

const ENV_KEYS = [
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_PROJECT_REF',
  'VITE_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function clearQueryEnv() {
  for (const key of ENV_KEYS) delete process.env[key];
}

describe('querySupabaseReadOnly', () => {
  it('prioriza a Management API read-only quando PAT e project ref existem', async () => {
    clearQueryEnv();
    process.env.SUPABASE_ACCESS_TOKEN = 'pat-test';
    process.env.SUPABASE_PROJECT_REF = 'canonical-ref';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ fn: 'public.test()' }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await querySupabaseReadOnly('SELECT 1');

    expect(result).toMatchObject({
      kind: 'live',
      source: 'management-api',
      rows: [{ fn: 'public.test()' }],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.supabase.com/v1/projects/canonical-ref/database/query/read-only',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer pat-test' }),
        body: JSON.stringify({ query: 'SELECT 1' }),
      }),
    );
  });

  it('mantém pg-meta como fallback para ambiente local que o exponha', async () => {
    clearQueryEnv();
    process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54323/';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal('fetch', fetchMock);

    const result = await querySupabaseReadOnly('SELECT 1');

    expect(result).toMatchObject({ kind: 'live', source: 'pg-meta', rows: [] });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:54323/pg-meta/default/query',
      expect.any(Object),
    );
  });

  it('fica inconclusivo na ausência de ambos os modos de acesso', async () => {
    clearQueryEnv();
    await expect(querySupabaseReadOnly('SELECT 1')).resolves.toEqual({
      kind: 'missing-config',
    });
  });
});
