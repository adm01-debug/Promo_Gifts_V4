import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { serializeFuzzPayload } from '../../scripts/fuzz-testing.mjs';

const SCRIPT_PATH = resolve(process.cwd(), 'scripts/fuzz-testing.mjs');

function runScript(env) {
  return spawnSync(process.execPath, [SCRIPT_PATH], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, ...env },
    timeout: 30_000,
  });
}

describe('fuzz-testing', () => {
  it('usa a mesma serialização no dry-run e nas requests reais', () => {
    expect(serializeFuzzPayload({ value: 1 })).toBe('{"value":1}');
    expect(serializeFuzzPayload({ rawBody: '{broken' }, true)).toBe('{broken');
    expect(() => serializeFuzzPayload({ rawBody: 123 }, true)).toThrow('rawBody deve ser string');
    expect(() => serializeFuzzPayload({ value: 1n })).toThrow();

    const cyclic = {};
    cyclic.self = cyclic;
    expect(() => serializeFuzzPayload(cyclic)).toThrow();
  });

  it('serializa e valida os 920 payloads em dry-run', () => {
    const result = runScript({
      DRY_RUN: '1',
      SUPABASE_URL: '',
      VITE_SUPABASE_URL: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
      SUPABASE_TEST_BYPASS_TOKEN: '',
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Payloads gerados:  920');
    expect(result.stdout).toContain('Requests enviados: 0');
    expect(result.stdout).toContain('920 payloads gerados e validados estruturalmente');
  });

  it('bloqueia fuzz live em produção sem autorização explícita', () => {
    const result = runScript({
      DRY_RUN: '0',
      SUPABASE_URL: 'https://doufsxqlfjyuvxuezpln.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-only-token',
      SUPABASE_TEST_BYPASS_TOKEN: '',
      ALLOW_PROD_LOAD: '',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('BLOQUEADO: produção exige ALLOW_PROD_LOAD=1');
    expect(result.stdout).toBe('');
  });
});
