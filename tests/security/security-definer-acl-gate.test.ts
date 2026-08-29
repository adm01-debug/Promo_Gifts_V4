import { describe, expect, it } from 'vitest';
import { spawnSync } from 'child_process';

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
