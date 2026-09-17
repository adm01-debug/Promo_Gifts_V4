// PLANO_DBA E30 — testa scripts/capacity-growth-projection.mjs, a checagem
// somente-leitura usada por .github/workflows/capacity-growth-report.yml
// (projeção semanal de crescimento a partir de ops.table_size_history).
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeProjections } from '../../scripts/capacity-growth-projection.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/capacity-growth-projection.mjs');

afterEach(() => {
  delete process.env.SUPABASE_ACCESS_TOKEN;
  delete process.env.SUPABASE_PROJECT_REF;
});

function row(schema, table, daysAgo, totalBytes) {
  const captured_at = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  return { schema_name: schema, table_name: table, captured_at, total_bytes: totalBytes, live_tup: 1 };
}

// ─── computeProjections ─────────────────────────────────────────────────────

describe('computeProjections', () => {
  it('marca insufficientData quando não há linhas', () => {
    const result = computeProjections({ rows: [], totalDbBytes: 1_000_000 });
    expect(result.insufficientData).toBe(true);
    expect(result.flags).toEqual([]);
  });

  it('marca insufficientData quando a série tem menos que minSeriesDays', () => {
    const rows = [row('public', 'x', 2, 100), row('public', 'x', 0, 110)];
    const result = computeProjections({ rows, totalDbBytes: 1_000_000, minSeriesDays: 7 });
    expect(result.insufficientData).toBe(true);
  });

  it('não sinaliza tabela com crescimento estável e pequena fração do banco', () => {
    const rows = [row('public', 'stable', 10, 1000), row('public', 'stable', 0, 1010)];
    const result = computeProjections({ rows, totalDbBytes: 1_000_000_000 });
    expect(result.insufficientData).toBe(false);
    expect(result.flags).toEqual([]);
  });

  it('sinaliza tabela cuja projeção passa de objectSharePct do banco', () => {
    // total do banco pequeno o bastante para que a tabela projetada ultrapasse 20%.
    const rows = [row('public', 'big', 10, 100_000), row('public', 'big', 0, 200_000)];
    const result = computeProjections({ rows, totalDbBytes: 500_000 });
    expect(result.insufficientData).toBe(false);
    expect(result.flags.some((f) => f.table === 'public.big')).toBe(true);
  });

  it('sinaliza tabela cujo crescimento mensal projetado passa de monthlyGrowthPct', () => {
    // dobrou de tamanho em 10 dias — crescimento mensal >> 30%.
    const rows = [row('public', 'fast', 10, 1_000_000), row('public', 'fast', 0, 2_000_000)];
    const result = computeProjections({ rows, totalDbBytes: 1_000_000_000_000 });
    const flagged = result.flags.find((f) => f.table === 'public.fast');
    expect(flagged).toBeDefined();
    expect(flagged.growthPctPerMonth).toBeGreaterThan(30);
  });

  it('ignora divisão por zero quando o ponto mais antigo tem total_bytes=0 (tabela nova)', () => {
    const rows = [row('public', 'new', 10, 0), row('public', 'new', 0, 500)];
    const result = computeProjections({ rows, totalDbBytes: 1_000_000_000 });
    const flagged = result.projections.find((p) => p.table === 'public.new');
    expect(flagged.growthPctPerMonth).toBeNull();
  });

  it('trata múltiplas tabelas independentemente', () => {
    const rows = [
      ...[row('public', 'a', 10, 1000), row('public', 'a', 0, 1010)],
      ...[row('public', 'b', 10, 100_000), row('public', 'b', 0, 200_000)],
    ];
    const result = computeProjections({ rows, totalDbBytes: 500_000 });
    expect(result.projections.length).toBe(2);
    expect(result.flags.map((f) => f.table)).toEqual(['public.b']);
  });
});

// ─── CLI (sem credenciais Supabase) ─────────────────────────────────────────

describe('CLI (sem credenciais Supabase)', () => {
  it('degrada para static-pass (exit 0) sem credenciais', () => {
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
