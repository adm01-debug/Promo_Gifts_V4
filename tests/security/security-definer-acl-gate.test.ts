import { describe, expect, it } from 'vitest';
import { spawnSync } from 'child_process';
import { readFileSync } from 'node:fs';

function runWithoutCreds(args: string[] = []) {
  return spawnSync('node', ['scripts/check-security-definer-acl.mjs', ...args], {
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      TMPDIR: process.env.TMPDIR,
    },
  });
}

describe('check-security-definer-acl gate', () => {
  it('reporta static-pass quando falta credencial e live não é obrigatório', () => {
    const r = runWithoutCreds();
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/static-pass/);
    expect(r.stdout).toMatch(/modo estático/);
  });

  it('reporta inconclusive quando falta credencial e live é obrigatório', () => {
    const r = runWithoutCreds(['--require-live']);
    expect(r.status).toBe(2);
    expect(r.stdout).toMatch(/inconclusive/);
    expect(r.stdout).toMatch(/evidência live obrigatória/);
  });
});

describe('rollback do cleanup de funções de auditoria', () => {
  const rollback = readFileSync('supabase/rollbacks/20261101202000_rollback.sql', 'utf8');

  it('não reabre EXECUTE para papéis públicos', () => {
    expect(rollback).not.toMatch(/GRANT\s+EXECUTE[\s\S]*\b(?:PUBLIC|anon|authenticated)\b/i);
  });

  it('mantém o ACL canônico fail-closed e idempotente', () => {
    expect(rollback).toMatch(
      /REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+public\.cleanup_expired_auth_sessions\(\)\s+FROM\s+PUBLIC,\s*anon,\s*authenticated\s*;/i,
    );
  });
});
