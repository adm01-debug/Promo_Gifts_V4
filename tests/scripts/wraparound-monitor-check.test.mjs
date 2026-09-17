// PLANO_DBA E33 — testa scripts/wraparound-monitor-check.mjs, a checagem
// somente-leitura usada por .github/workflows/wraparound-monitor-report.yml
// (comparação diária de ops.wraparound_monitor_log contra THRESHOLDS).
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateWraparoundAlerts } from '../../scripts/wraparound-monitor-check.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(ROOT, 'scripts/wraparound-monitor-check.mjs');

afterEach(() => {
  delete process.env.SUPABASE_ACCESS_TOKEN;
  delete process.env.SUPABASE_PROJECT_REF;
});

function row(metric, objectName, { valueNumeric = null, valuePct = null, detail = {}, hoursAgo = 1 } = {}) {
  const captured_at = new Date(Date.now() - hoursAgo * 3_600_000).toISOString();
  return {
    metric, object_name: objectName, captured_at, value_numeric: valueNumeric, value_pct: valuePct, unit: 'x', detail,
  };
}

// ─── evaluateWraparoundAlerts ───────────────────────────────────────────────

describe('evaluateWraparoundAlerts', () => {
  it('marca insufficientData quando não há linhas', () => {
    const result = evaluateWraparoundAlerts({ rows: [] });
    expect(result.insufficientData).toBe(true);
    expect(result.warnings).toEqual([]);
    expect(result.criticals).toEqual([]);
  });

  it('não sinaliza xid_age abaixo do aviso', () => {
    const rows = [row('xid_age', 'postgres', { valueNumeric: 46_004_605 })];
    const result = evaluateWraparoundAlerts({ rows });
    expect(result.warnings).toEqual([]);
    expect(result.criticals).toEqual([]);
  });

  it('sinaliza xid_age acima do crítico', () => {
    const rows = [row('xid_age', 'postgres', { valueNumeric: 1_600_000_000 })];
    const result = evaluateWraparoundAlerts({ rows });
    expect(result.criticals.length).toBe(1);
    expect(result.criticals[0].object_name).toBe('postgres');
  });

  it('sinaliza xid_age em aviso (entre warn e crit)', () => {
    const rows = [row('xid_age', 'postgres', { valueNumeric: 1_100_000_000 })];
    const result = evaluateWraparoundAlerts({ rows });
    expect(result.warnings.length).toBe(1);
    expect(result.criticals).toEqual([]);
  });

  it('sinaliza sequência acima de 50% via value_pct', () => {
    const rows = [row('sequence_pct_used', 'public._qa_pct_results_id_seq', { valuePct: 55 })];
    const result = evaluateWraparoundAlerts({ rows });
    expect(result.warnings.length).toBe(1);
  });

  it('não sinaliza replication slot com WAL retido alto se está ativo', () => {
    const rows = [row('replication_slot_retained_bytes', 'slot_a', {
      valueNumeric: 2_000_000_000, detail: { active: true },
    })];
    const result = evaluateWraparoundAlerts({ rows });
    expect(result.warnings).toEqual([]);
    expect(result.criticals).toEqual([]);
  });

  it('sinaliza replication slot inativo com WAL retido acima do crítico', () => {
    const rows = [row('replication_slot_retained_bytes', 'slot_a', {
      valueNumeric: 6_000_000_000, detail: { active: false },
    })];
    const result = evaluateWraparoundAlerts({ rows });
    expect(result.criticals.length).toBe(1);
  });

  it('não sinaliza TOAST com % alto mas volume trivial (evita ruído)', () => {
    const rows = [row('toast_pct_of_heap', 'public.generated_mockups', { valueNumeric: 1_700_000, valuePct: 21700 })];
    const result = evaluateWraparoundAlerts({ rows });
    expect(result.warnings).toEqual([]);
    expect(result.criticals).toEqual([]);
  });

  it('sinaliza TOAST composto (% E volume) acima do aviso', () => {
    const rows = [row('toast_pct_of_heap', 'public.products', { valueNumeric: 78_643_200, valuePct: 210 })];
    const result = evaluateWraparoundAlerts({ rows });
    expect(result.warnings.length).toBe(1);
    expect(result.criticals).toEqual([]);
  });

  it('usa só a captura mais recente, ignorando linhas antigas', () => {
    const rows = [
      row('xid_age', 'postgres', { valueNumeric: 1_600_000_000, hoursAgo: 48 }),
      row('xid_age', 'postgres', { valueNumeric: 100, hoursAgo: 1 }),
    ];
    const result = evaluateWraparoundAlerts({ rows });
    expect(result.criticals).toEqual([]);
    expect(result.evaluated.find((e) => e.metric === 'xid_age').value_numeric).toBe(100);
  });

  it('avalia várias métricas/objetos da mesma captura independentemente', () => {
    const rows = [
      row('xid_age', 'postgres', { valueNumeric: 100 }),
      row('sequence_pct_used', 'seq_a', { valuePct: 90 }),
      row('sequence_pct_used', 'seq_b', { valuePct: 1 }),
    ];
    const result = evaluateWraparoundAlerts({ rows });
    expect(result.evaluated.length).toBe(3);
    expect(result.criticals.map((c) => c.object_name)).toEqual(['seq_a']);
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
