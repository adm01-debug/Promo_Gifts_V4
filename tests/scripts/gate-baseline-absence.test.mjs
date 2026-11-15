/**
 * Regressão: allowlist com placeholder "TODO" satisfazia o gate e baseline apagada era
 * recriada em silêncio (exit 0), desligando o ratchet.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');
const dirs = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

function zodSandbox() {
  const dir = sandbox(['scripts/check-edge-zod-ratchet.mjs']);
  mkdirSync(join(dir, 'tests/contracts'), { recursive: true });
  cpSync(join(ROOT, 'tests/contracts/webhook-schemas.ts'), join(dir, 'tests/contracts/webhook-schemas.ts'));
  mkdirSync(join(dir, 'supabase/functions/nova-edge'), { recursive: true });
  writeFileSync(join(dir, 'supabase/functions/nova-edge/index.ts'), 'Deno.serve(async (req) => { const b = await req.json(); return new Response(JSON.stringify(b)); });\n');
  return dir;
}

function sandbox(scripts) {
  const dir = mkdtempSync(join(tmpdir(), 'gate-abs-'));
  dirs.push(dir);
  mkdirSync(join(dir, 'scripts/lib'), { recursive: true });
  mkdirSync(join(dir, '.security'), { recursive: true });
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
  for (const f of scripts) cpSync(join(ROOT, f), join(dir, f));
  // dependências relativas comuns dos scripts de drift
  for (const f of ['scripts/check-result-contract.mjs', 'scripts/supabase-read-only-query.mjs', 'scripts/lib/canonical-pg-connection.mjs']) {
    try { cpSync(join(ROOT, f), join(dir, f)); } catch { /* opcional */ }
  }
  return dir;
}

const run = (dir, script, args = [], env = {}) =>
  spawnSync('node', [join(dir, script), ...args], {
    cwd: dir,
    encoding: 'utf8',
    env: { PATH: process.env.PATH, ...env },
  });

describe.each([
  ['scripts/check-lint-0011-drift.mjs', '.security/lint-0011-allowlist.json', 'functions', 'fn'],
  ['scripts/check-lint-0029-drift.mjs', '.security/lint-0029-allowlist.json', 'functions', 'fn'],
  ['scripts/check-secdef-anon-drift.mjs', '.security/secdef-anon-allowlist.json', 'functions', 'fn'],
])('%s: reason placeholder não satisfaz o gate', (script, allowlist, key, idKey) => {
  const prepare = (reason) => {
    const dir = sandbox([script]);
    writeFileSync(join(dir, allowlist), JSON.stringify({ [key]: [{ [idKey]: 'public.zz_probe()', reason }] }));
    writeFileSync(join(dir, 'live.json'), JSON.stringify([{ [idKey]: 'public.zz_probe()' }]));
    return dir;
  };

  it('reason "TODO: documentar motivo…" → exit 1', () => {
    const dir = prepare('TODO: documentar motivo antes de aprovar PR');
    const r = run(dir, script, ['--from-file=live.json']);
    expect(r.status, r.stdout + r.stderr).toBe(1);
  });

  it('reason real → exit 0 (inclusive com a palavra "todo" em português)', () => {
    const dir = prepare('Função de extensão do sistema; todo o acesso é mediado pelo Supabase.');
    const r = run(dir, script, ['--from-file=live.json']);
    expect(r.status, r.stdout + r.stderr).toBe(0);
  });
});

describe('baseline ausente não é recriada em silêncio', () => {
  it('check-edge-zod-ratchet sem baseline → exit 2 e não cria o arquivo', () => {
    const dir = zodSandbox();
    const r = run(dir, 'scripts/check-edge-zod-ratchet.mjs');
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('baseline ausente');
    const created = spawnSync('test', ['-f', join(dir, '.security/edge-zod-ratchet.json')]);
    expect(created.status).not.toBe(0);
  });

  it('check-edge-zod-ratchet --update-baseline continua criando a baseline', () => {
    const dir = zodSandbox();
    const r = run(dir, 'scripts/check-edge-zod-ratchet.mjs', ['--update-baseline']);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(spawnSync('test', ['-f', join(dir, '.security/edge-zod-ratchet.json')]).status).toBe(0);
  });

  it('check-invoke-direct-calls sem baseline → exit 2; com UPDATE_BASELINE=1 cria', () => {
    const dir = sandbox(['scripts/check-invoke-direct-calls.mjs']);
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(join(dir, 'src/a.ts'), "export const x = () => supabase.functions.invoke('fn');\n");
    const missing = run(dir, 'scripts/check-invoke-direct-calls.mjs');
    expect(missing.status).toBe(2);
    expect(missing.stderr).toContain('baseline ausente');
    const created = run(dir, 'scripts/check-invoke-direct-calls.mjs', [], { UPDATE_BASELINE: '1' });
    expect(created.status, created.stdout + created.stderr).toBe(0);
    expect(run(dir, 'scripts/check-invoke-direct-calls.mjs').status).toBe(0);
  });
});
