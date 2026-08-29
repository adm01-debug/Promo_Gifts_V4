import { describe, it, expect, beforeAll } from 'vitest';
import { spawnSync } from 'child_process';
import { writeFileSync, mkdtempSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

function fixture(list: string[]) {
  const dir = mkdtempSync(join(tmpdir(), 'lint29-'));
  const p = join(dir, 'lints.json');
  writeFileSync(p, JSON.stringify(list.map((fn) => ({ fn }))));
  return p;
}

function run(fromFile: string) {
  return spawnSync('node', ['scripts/check-lint-0029-drift.mjs', `--from-file=${fromFile}`], {
    encoding: 'utf8',
  });
}

function runWithoutCreds(args: string[] = []) {
  return spawnSync('node', ['scripts/check-lint-0029-drift.mjs', ...args], {
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      TMPDIR: process.env.TMPDIR,
    },
  });
}

describe('check-lint-0029-drift', () => {
  let allowlisted: string[] = [];

  beforeAll(() => {
    const doc = JSON.parse(readFileSync('.security/lint-0029-allowlist.json', 'utf8'));
    allowlisted = doc.functions.map((entry: { fn: string }) => entry.fn);
  });

  it('passa quando todos os findings estão na allowlist', () => {
    const p = fixture(allowlisted.slice(0, 2));
    const r = run(p);
    expect(r.status).toBe(0);
    expect(r.stderr).toMatch(/todos documentados/);
  });

  it('falha quando surge finding novo não documentado', () => {
    const p = fixture([
      ...allowlisted,
      'public.nova_funcao_perigosa(param uuid)', // não está na allowlist
    ]);
    const r = run(p);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/nova_funcao_perigosa/);
    expect(r.stderr).toMatch(/NÃO documentados/);
  });

  it('avisa (mas não falha por si só) quando allowlist tem entradas órfãs', () => {
    // Só uma função no DB — resto da allowlist fica órfão.
    const p = fixture(allowlisted.slice(0, 1));
    const r = run(p);
    // Ainda passa (0) porque não há findings NOVOS; drift stale é warning.
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
