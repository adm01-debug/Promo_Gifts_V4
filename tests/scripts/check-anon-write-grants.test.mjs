// PLANO_DBA E22 — testa scripts/check-anon-write-grants.mjs, o gate permanente
// que falha se `anon` tiver GRANT de INSERT/UPDATE/DELETE em qualquer tabela
// `public` fora da allowlist deliberadamente vazia
// (.security/anon-write-grants-allowlist.json).
//
// Mesmo padrão de tests/scripts/check-ledger-manifest-drift.test.mjs (E46):
// funções puras testadas por unidade + injeção via --from-file, mais
// integração CLI real sem credenciais (static-pass / inconclusive).
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeViolations, loadAllowlist } from '../../scripts/check-anon-write-grants.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/check-anon-write-grants.mjs');
const REAL_ALLOWLIST = resolve(ROOT, '.security/anon-write-grants-allowlist.json');

const temporaryRoots = [];
afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function tempDir(prefix) {
  const root = mkdtempSync(join(tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
}

// ─── loadAllowlist ──────────────────────────────────────────────────────────

describe('loadAllowlist', () => {
  it('devolve grants=[] quando o arquivo não existe', () => {
    const dir = tempDir('anon-write-grants-missing-');
    expect(loadAllowlist(join(dir, 'nope.json'))).toEqual({ grants: [] });
  });

  it('lê grants de um arquivo válido', () => {
    const dir = tempDir('anon-write-grants-valid-');
    const p = join(dir, 'allowlist.json');
    writeFileSync(
      p,
      JSON.stringify({ grants: [{ table_name: 'legacy_leads', privilege_type: 'INSERT', reason: 'x' }] }),
    );
    expect(loadAllowlist(p)).toEqual({
      grants: [{ table_name: 'legacy_leads', privilege_type: 'INSERT', reason: 'x' }],
    });
  });

  it('tolera arquivo sem campo grants (array vazio)', () => {
    const dir = tempDir('anon-write-grants-empty-');
    const p = join(dir, 'allowlist.json');
    writeFileSync(p, JSON.stringify({ description: 'sem grants' }));
    expect(loadAllowlist(p)).toEqual({ grants: [] });
  });

  it('a allowlist real do repo está vazia (P1 continua fechado)', () => {
    expect(loadAllowlist(REAL_ALLOWLIST)).toEqual({ grants: [] });
  });
});

// ─── computeViolations ──────────────────────────────────────────────────────

describe('computeViolations', () => {
  it('não sinaliza nada quando não há grants ao vivo', () => {
    const result = computeViolations({ liveGrants: [], allowlist: { grants: [] } });
    expect(result).toEqual([]);
  });

  it('sinaliza qualquer grant de escrita quando a allowlist está vazia', () => {
    const liveGrants = [{ table_name: 'orders', privilege_type: 'INSERT' }];
    const result = computeViolations({ liveGrants, allowlist: { grants: [] } });
    expect(result).toEqual([{ table_name: 'orders', privilege_type: 'INSERT' }]);
  });

  it('não sinaliza um grant coberto exatamente pela allowlist (table_name + privilege_type)', () => {
    const liveGrants = [{ table_name: 'legacy_leads', privilege_type: 'INSERT' }];
    const allowlist = { grants: [{ table_name: 'legacy_leads', privilege_type: 'INSERT', reason: 'x' }] };
    const result = computeViolations({ liveGrants, allowlist });
    expect(result).toEqual([]);
  });

  it('sinaliza um privilege_type não coberto mesmo que a tabela esteja parcialmente na allowlist', () => {
    const liveGrants = [
      { table_name: 'legacy_leads', privilege_type: 'INSERT' },
      { table_name: 'legacy_leads', privilege_type: 'DELETE' },
    ];
    const allowlist = { grants: [{ table_name: 'legacy_leads', privilege_type: 'INSERT', reason: 'x' }] };
    const result = computeViolations({ liveGrants, allowlist });
    expect(result).toEqual([{ table_name: 'legacy_leads', privilege_type: 'DELETE' }]);
  });

  it('ordena os candidatos por table_name, depois privilege_type', () => {
    const liveGrants = [
      { table_name: 'zzz', privilege_type: 'UPDATE' },
      { table_name: 'aaa', privilege_type: 'UPDATE' },
      { table_name: 'aaa', privilege_type: 'DELETE' },
    ];
    const result = computeViolations({ liveGrants, allowlist: { grants: [] } });
    expect(result).toEqual([
      { table_name: 'aaa', privilege_type: 'DELETE' },
      { table_name: 'aaa', privilege_type: 'UPDATE' },
      { table_name: 'zzz', privilege_type: 'UPDATE' },
    ]);
  });
});

// ─── Integração: CLI real, sem credenciais ──────────────────────────────────

describe('CLI (sem credenciais Supabase)', () => {
  it('degrada para static-pass (exit 0) sem SUPABASE_ACCESS_TOKEN/SUPABASE_PROJECT_REF', () => {
    const env = { ...process.env };
    delete env.SUPABASE_ACCESS_TOKEN;
    delete env.SUPABASE_PROJECT_REF;
    const result = spawnSync('node', [SCRIPT], { cwd: ROOT, env, encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).toContain('static-pass');
  });

  it('degrada para inconclusive (exit 2) com --require-live e sem credenciais', () => {
    const env = { ...process.env };
    delete env.SUPABASE_ACCESS_TOKEN;
    delete env.SUPABASE_PROJECT_REF;
    const result = spawnSync('node', [SCRIPT, '--require-live'], { cwd: ROOT, env, encoding: 'utf8' });
    expect(result.status).toBe(2);
    expect(result.stdout + result.stderr).toContain('inconclusive');
  });
});

// ─── Integração: --from-file (simula achado real) ───────────────────────────

describe('CLI --from-file', () => {
  it('passa (exit 0) quando o arquivo injetado não tem grants de escrita para anon', () => {
    const dir = tempDir('anon-write-grants-fromfile-pass-');
    const p = join(dir, 'grants.json');
    writeFileSync(p, JSON.stringify([]));
    const result = spawnSync('node', [SCRIPT, `--from-file=${p}`], { cwd: ROOT, encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).toContain('passed');
  });

  it('falha (exit 1) quando o arquivo injetado tem um grant fora da allowlist — reabertura do P1', () => {
    const dir = tempDir('anon-write-grants-fromfile-fail-');
    const p = join(dir, 'grants.json');
    writeFileSync(p, JSON.stringify([{ table_name: 'orders', privilege_type: 'DELETE' }]));
    const result = spawnSync('node', [SCRIPT, `--from-file=${p}`], { cwd: ROOT, encoding: 'utf8' });
    expect(result.status).toBe(1);
    const out = result.stdout + result.stderr;
    expect(out).toContain('failed');
    expect(out).toContain('orders.DELETE');
  });
});
