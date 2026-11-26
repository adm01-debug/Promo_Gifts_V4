import { describe, it, expect } from 'vitest';
import {
  countWraparoundStatus,
  formatBytes,
  formatCount,
  formatDurationMs,
  formatPct,
  formatSignedBytes,
  formatCapturedAt,
  freshnessStatus,
  growthStatus,
  isEmptyTelemetry,
  maxGrowthBytes,
  parseOpsInfraTelemetry,
  wraparoundStatus,
  GROWTH_CRITICAL_BYTES,
  GROWTH_WARN_BYTES,
  RETAINED_CRITICAL_BYTES,
  type OpsTableGrowthRow,
  type OpsWraparoundRow,
} from '@/lib/ops/infra-telemetry';

const growthRow = (delta: number): OpsTableGrowthRow => ({
  schema_name: 'public',
  table_name: 'products',
  first_bytes: 1000,
  last_bytes: 1000 + delta,
  delta_bytes: delta,
  live_tup: 10,
  first_captured_at: '2026-11-01T00:00:00Z',
  last_captured_at: '2026-11-20T00:00:00Z',
});

const wrapRow = (
  metric: string,
  pct: number | null,
  numeric: number | null = null,
  unit = 'pct',
): OpsWraparoundRow => ({
  metric,
  object_name: 'public.orders',
  value_numeric: numeric,
  value_pct: pct,
  unit,
});

describe('formatBytes / formatSignedBytes', () => {
  it('formata unidades binárias e trata ausência de dado', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.50 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.00 MB');
    expect(formatBytes(null)).toBe('—');
    expect(formatBytes(Number.NaN)).toBe('—');
  });

  it('mostra sinal explícito na variação', () => {
    expect(formatSignedBytes(2048)).toBe('+2.00 KB');
    expect(formatSignedBytes(-2048)).toBe('-2.00 KB');
    expect(formatSignedBytes(0)).toBe('0 B');
    expect(formatSignedBytes(null)).toBe('—');
  });
});

describe('formatDurationMs / formatCount / formatPct / formatCapturedAt', () => {
  it('escala ms até horas', () => {
    expect(formatDurationMs(12.345)).toBe('12.35 ms');
    expect(formatDurationMs(2500)).toBe('2.50 s');
    expect(formatDurationMs(120_000)).toBe('2.0 min');
    expect(formatDurationMs(null)).toBe('—');
  });

  it('inteiro com milhar pt-BR e percentual com duas casas', () => {
    expect(formatCount(1234567)).toBe('1.234.567');
    expect(formatCount(null)).toBe('—');
    expect(formatPct(87.456)).toBe('87.46%');
    expect(formatPct(null)).toBe('—');
  });

  it('data inválida degrada para travessão', () => {
    expect(formatCapturedAt(null)).toBe('—');
    expect(formatCapturedAt('não é data')).toBe('—');
    expect(formatCapturedAt('2026-11-20T12:00:00Z')).not.toBe('—');
  });
});

describe('growthStatus', () => {
  it('classifica pelo crescimento absoluto na janela', () => {
    expect(growthStatus(0)).toBe('ok');
    expect(growthStatus(GROWTH_WARN_BYTES - 1)).toBe('ok');
    expect(growthStatus(GROWTH_WARN_BYTES)).toBe('warn');
    expect(growthStatus(GROWTH_CRITICAL_BYTES)).toBe('critical');
    expect(growthStatus(null)).toBe('unknown');
  });
});

describe('wraparoundStatus', () => {
  it('usa percentual quando existe', () => {
    expect(wraparoundStatus(wrapRow('xid_age', 10))).toBe('ok');
    expect(wraparoundStatus(wrapRow('xid_age', 75))).toBe('warn');
    expect(wraparoundStatus(wrapRow('sequence_pct_used', 92))).toBe('critical');
  });

  it('cai para faixa de bytes em replication slot sem percentual', () => {
    expect(
      wraparoundStatus(wrapRow('replication_slot_retained_bytes', null, 10 * 1024 * 1024, 'bytes')),
    ).toBe('ok');
    expect(
      wraparoundStatus(
        wrapRow('replication_slot_retained_bytes', null, RETAINED_CRITICAL_BYTES, 'bytes'),
      ),
    ).toBe('critical');
  });

  it('sem percentual nem bytes devolve desconhecido', () => {
    expect(wraparoundStatus(wrapRow('toast_pct_of_heap', null, null))).toBe('unknown');
  });
});

describe('freshnessStatus', () => {
  const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

  it('detecta cron parado', () => {
    expect(freshnessStatus(null)).toBe('unknown');
    expect(freshnessStatus(daysAgo(0))).toBe('ok');
    expect(freshnessStatus(daysAgo(3))).toBe('warn');
    expect(freshnessStatus(daysAgo(30))).toBe('critical');
  });
});

describe('parseOpsInfraTelemetry', () => {
  it('janela sem dados devolve estrutura vazia, não quebra', () => {
    const parsed = parseOpsInfraTelemetry(null);
    expect(parsed.window_days).toBe(30);
    expect(parsed.captured_at).toEqual({ table_size: null, pgss: null, wraparound: null });
    expect(parsed.table_growth).toEqual([]);
    expect(parsed.pgss_top).toEqual([]);
    expect(parsed.wraparound).toEqual([]);
    expect(parsed.pgss_summary).toEqual({ labels: 0, calls: 0, total_exec_time: 0 });
    expect(isEmptyTelemetry(parsed)).toBe(true);
  });

  it('preserva payload completo e normaliza números textuais', () => {
    const parsed = parseOpsInfraTelemetry({
      window_days: 7,
      captured_at: {
        table_size: '2026-11-20T00:00:00Z',
        pgss: null,
        wraparound: '2026-11-19T00:00:00Z',
      },
      table_growth: [growthRow(4096)],
      pgss_summary: { labels: '3', calls: '120', total_exec_time: '987.5' },
      pgss_top: [],
      wraparound: [wrapRow('xid_age', 80)],
    });
    expect(parsed.window_days).toBe(7);
    expect(parsed.pgss_summary).toEqual({ labels: 3, calls: 120, total_exec_time: 987.5 });
    expect(parsed.table_growth).toHaveLength(1);
    expect(isEmptyTelemetry(parsed)).toBe(false);
  });
});

describe('agregados da tela', () => {
  it('conta riscos por estado', () => {
    const tally = countWraparoundStatus([
      wrapRow('xid_age', 10),
      wrapRow('mxid_age', 80),
      wrapRow('sequence_pct_used', 95),
      wrapRow('toast_pct_of_heap', null, null),
    ]);
    expect(tally).toEqual({ ok: 1, warn: 1, critical: 1, unknown: 1 });
  });

  it('maior crescimento da lista', () => {
    expect(maxGrowthBytes([])).toBe(0);
    expect(maxGrowthBytes([growthRow(10), growthRow(5000), growthRow(100)])).toBe(5000);
  });
});
