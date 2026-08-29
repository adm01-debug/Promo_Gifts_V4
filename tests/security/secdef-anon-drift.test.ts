import { describe, it, expect, beforeAll } from 'vitest';
import { spawnSync } from 'child_process';
import { writeFileSync, mkdtempSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

function fixture(list: string[]) {
  const dir = mkdtempSync(join(tmpdir(), 'secdef-anon-'));
  const p = join(dir, 'lints.json');
  writeFileSync(p, JSON.stringify(list.map((fn) => ({ fn }))));
  return p;
}

function run(fromFile: string) {
  return spawnSync('node', ['scripts/check-secdef-anon-drift.mjs', `--from-file=${fromFile}`], {
    encoding: 'utf8',
  });
}

function runWithoutCreds(args: string[] = []) {
  return spawnSync('node', ['scripts/check-secdef-anon-drift.mjs', ...args], {
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      TMPDIR: process.env.TMPDIR,
    },
  });
}

describe('check-secdef-anon-drift', () => {
  let allowlisted: string[] = [];

  beforeAll(() => {
    const doc = JSON.parse(readFileSync('.security/secdef-anon-allowlist.json', 'utf8'));
    allowlisted = doc.functions.map((e: { fn: string }) => e.fn);
  });

  it('passa quando todos os findings do snapshot estão documentados', () => {
    const p = fixture(allowlisted);
    const r = run(p);
    expect(r.status).toBe(0);
    expect(r.stderr).toMatch(/todos documentados/);
  });

  it('falha quando surge SECURITY DEFINER exposta a anon sem revisão', () => {
    const p = fixture([
      ...allowlisted,
      'public.leaky_admin_helper(user_id uuid)',
    ]);
    const r = run(p);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/leaky_admin_helper/);
    expect(r.stderr).toMatch(/SEM revisão/);
    expect(r.stderr).toMatch(/REVOKE EXECUTE/);
  });

  it('avisa (mas não falha) quando allowlist tem entradas órfãs', () => {
    // Se a allowlist inicial estiver vazia, este cenário não se aplica.
    if (allowlisted.length === 0) {
      expect(true).toBe(true);
      return;
    }
    const p = fixture([]);
    const r = run(p);
    expect(r.status).toBe(0);
    expect(r.stderr).toMatch(/não existem mais no DB/);
  });

  it('reporta static-pass quando falta credencial e live não é obrigatório', () => {
    const r = runWithoutCreds();
    expect(r.status).toBe(0);
    expect(r.stderr).toMatch(/static-pass/);
    expect(r.stderr).toMatch(/modo estático/);
  });

  it('reporta inconclusive quando falta credencial e live é obrigatório', () => {
    const r = runWithoutCreds(['--require-live']);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/inconclusive/);
    expect(r.stderr).toMatch(/evidência live obrigatória/);
  });
});
