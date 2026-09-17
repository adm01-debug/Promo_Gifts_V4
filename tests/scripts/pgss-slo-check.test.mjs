// PLANO_DBA E40 — testa scripts/pgss-slo-check.mjs, a checagem somente-leitura
// usada por .github/workflows/pgss-slo-report.yml (comparação semanal de
// ops.pgss_history contra SLO_TARGETS_MS).
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateSloBreaches } from '../../scripts/pgss-slo-check.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/pgss-slo-check.mjs');

afterEach(() => {
  delete process.env.SUPABASE_ACCESS_TOKEN;
  delete process.env.SUPABASE_PROJECT_REF;
});

function row(fnName, hoursAgo, meanMs, stddevMs = 0, calls = 100) {
  const captured_at = new Date(Date.now() - hoursAgo * 3_600_000).toISOString();
  return { fn_name: fnName, queryid: `${fnName}-${hoursAgo}`, captured_at, calls, mean_exec_time: meanMs, stddev_exec_time: stddevMs, max_exec_time: meanMs };
}

const TARGETS = { fn_slow: 500, fn_fast: 500 };

// ─── evaluateSloBreaches ────────────────────────────────────────────────────

describe('evaluateSloBreaches', () => {
  it('marca insufficientData quando não há linhas', () => {
    const result = evaluateSloBreaches({ rows: [], sloTargetsMs: TARGETS });
    expect(result.insufficientData).toBe(true);
    expect(result.breaches).toEqual([]);
    expect(result.untrackedTargets).toEqual(['fn_slow', 'fn_fast']);
  });

  it('não sinaliza RPC com p95 estimado dentro do SLO', () => {
    const rows = [row('fn_fast', 1, 100, 10)];
    const result = evaluateSloBreaches({ rows, sloTargetsMs: TARGETS });
    expect(result.insufficientData).toBe(false);
    expect(result.breaches).toEqual([]);
  });

  it('sinaliza RPC cujo p95 estimado (mean + 1.645*stddev) passa do SLO', () => {
    const rows = [row('fn_slow', 1, 600, 50)];
    const result = evaluateSloBreaches({ rows, sloTargetsMs: TARGETS });
    const breach = result.breaches.find((b) => b.fnName === 'fn_slow');
    expect(breach).toBeDefined();
    expect(breach.p95EstimateMs).toBeGreaterThan(500);
  });

  it('usa só a captura mais recente por RPC, ignorando capturas antigas', () => {
    const rows = [row('fn_slow', 48, 900, 10), row('fn_slow', 1, 100, 5)];
    const result = evaluateSloBreaches({ rows, sloTargetsMs: TARGETS });
    const evaluated = result.evaluated.find((e) => e.fnName === 'fn_slow');
    expect(evaluated.meanMs).toBe(100);
    expect(evaluated.breach).toBe(false);
  });

  it('lista em untrackedTargets os SLOs declarados sem nenhuma captura', () => {
    const rows = [row('fn_fast', 1, 100, 10)];
    const result = evaluateSloBreaches({ rows, sloTargetsMs: TARGETS });
    expect(result.untrackedTargets).toEqual(['fn_slow']);
  });

  it('ignora linhas sem fn_name', () => {
    const rows = [{ fn_name: null, queryid: 'x', captured_at: new Date().toISOString(), calls: 1, mean_exec_time: 1000, stddev_exec_time: 0 }];
    const result = evaluateSloBreaches({ rows, sloTargetsMs: TARGETS });
    expect(result.insufficientData).toBe(false);
    expect(result.evaluated).toEqual([]);
    expect(result.untrackedTargets).toEqual(['fn_slow', 'fn_fast']);
  });

  it('trata múltiplas RPCs independentemente', () => {
    const rows = [row('fn_slow', 1, 900, 20), row('fn_fast', 1, 50, 5)];
    const result = evaluateSloBreaches({ rows, sloTargetsMs: TARGETS });
    expect(result.evaluated.length).toBe(2);
    expect(result.breaches.map((b) => b.fnName)).toEqual(['fn_slow']);
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
