/**
 * Leitura e formatação da telemetria operacional interna do banco.
 *
 * Fonte: RPC dev-gated `fn_dev_ops_infra_telemetry(_days, _top)`
 * (supabase/migrations/20261126052000_ops_infra_telemetry_dev_rpc.sql), que lê o
 * schema `ops` — deny-all no PostgREST, sem GRANT a anon/authenticated e, até a
 * tela /admin/infra-ops (DevRoute), sem nenhum consumidor em app:
 *
 *   - ops.table_size_history     (E30) tamanho de tabela dia a dia
 *   - ops.pgss_history           (E40) top funções/consultas por tempo total
 *   - ops.wraparound_monitor_log (E33) risco de wraparound de xid/mxid, uso de
 *                                      sequence e retenção de replication slot
 *
 * Este módulo é puro (sem React, sem Supabase) para ser testável direto.
 */

export interface OpsTableGrowthRow {
  schema_name: string;
  table_name: string;
  first_bytes: number;
  last_bytes: number;
  delta_bytes: number;
  live_tup: number | null;
  first_captured_at: string;
  last_captured_at: string;
}

export interface OpsPgssRow {
  label: string;
  fn_name: string | null;
  queryid: number | string | null;
  calls: number;
  total_exec_time: number;
  mean_exec_time: number | null;
  max_exec_time: number | null;
}

export interface OpsWraparoundRow {
  metric: string;
  object_name: string;
  value_numeric: number | null;
  value_pct: number | null;
  unit: string | null;
}

export interface OpsPgssSummary {
  labels: number;
  calls: number;
  total_exec_time: number;
}

export interface OpsInfraTelemetry {
  window_days: number;
  captured_at: {
    table_size: string | null;
    pgss: string | null;
    wraparound: string | null;
  };
  table_growth: OpsTableGrowthRow[];
  pgss_summary: OpsPgssSummary;
  pgss_top: OpsPgssRow[];
  wraparound: OpsWraparoundRow[];
}

/** Estado de saúde de uma métrica: verde, atenção, crítico ou sem dado. */
export type InfraStatus = 'critical' | 'ok' | 'unknown' | 'warn';

/** Crescimento de tabela na janela: >= 500 MB crítico, >= 100 MB atenção. */
export const GROWTH_WARN_BYTES = 100 * 1024 * 1024;
export const GROWTH_CRITICAL_BYTES = 500 * 1024 * 1024;

/** Percentual de consumo de uma métrica: >= 90% crítico, >= 75% atenção. */
export const PCT_WARN = 75;
export const PCT_CRITICAL = 90;

/** Retenção de WAL de replication slot sem percentual: 1 GiB crítico, 256 MiB atenção. */
export const RETAINED_WARN_BYTES = 256 * 1024 * 1024;
export const RETAINED_CRITICAL_BYTES = 1024 * 1024 * 1024;

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/** Bytes em unidade binária legível (1024). Negativo recebe sinal. */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return '—';
  if (bytes === 0) return '0 B';
  const sign = bytes < 0 ? '-' : '';
  let value = Math.abs(bytes);
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = value >= 100 || unit === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${sign}${value.toFixed(digits)} ${BYTE_UNITS[unit]}`;
}

/** Variação de bytes com sinal explícito, para mostrar tendência. */
export function formatSignedBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return '—';
  if (bytes === 0) return '0 B';
  return `${bytes > 0 ? '+' : '-'}${formatBytes(Math.abs(bytes))}`;
}

/** Milissegundos de `pg_stat_statements` em unidade legível. */
export function formatDurationMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${ms.toFixed(2)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)} s`;
  if (ms < 3_600_000) return `${(ms / 60_000).toFixed(1)} min`;
  return `${(ms / 3_600_000).toFixed(1)} h`;
}

/** Inteiro com separador de milhar pt-BR. */
export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value);
}

/** Percentual já normalizado 0–100 (NULL vira "—"). */
export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${round(value, 2)}%`;
}

/** ISO -> data/hora local; qualquer entrada inválida vira "—". */
export function formatCapturedAt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Idade da última captura, para sinalizar cron parado. */
export function freshnessStatus(iso: string | null | undefined, warnAfterDays = 2): InfraStatus {
  if (!iso) return 'unknown';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'unknown';
  const ageDays = (Date.now() - parsed.getTime()) / 86_400_000;
  if (ageDays >= warnAfterDays * 2) return 'critical';
  if (ageDays >= warnAfterDays) return 'warn';
  return 'ok';
}

/** Crescimento absoluto da tabela na janela. */
export function growthStatus(deltaBytes: number | null | undefined): InfraStatus {
  if (deltaBytes === null || deltaBytes === undefined || !Number.isFinite(deltaBytes))
    return 'unknown';
  if (deltaBytes >= GROWTH_CRITICAL_BYTES) return 'critical';
  if (deltaBytes >= GROWTH_WARN_BYTES) return 'warn';
  return 'ok';
}

/**
 * Risco de uma métrica do monitor de wraparound.
 * Percentual é preferido quando existe (é o que o cron já calcula contra o
 * limite); métricas por bytes (replication slot) usam faixa própria.
 */
export function wraparoundStatus(row: OpsWraparoundRow): InfraStatus {
  const pct = row.value_pct;
  if (pct !== null && pct !== undefined && Number.isFinite(pct)) {
    if (pct >= PCT_CRITICAL) return 'critical';
    if (pct >= PCT_WARN) return 'warn';
    return 'ok';
  }
  const bytes = row.value_numeric;
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return 'unknown';
  if (row.unit === 'bytes' || row.metric === 'replication_slot_retained_bytes') {
    if (bytes >= RETAINED_CRITICAL_BYTES) return 'critical';
    if (bytes >= RETAINED_WARN_BYTES) return 'warn';
    return 'ok';
  }
  return 'unknown';
}

/** Contagem de métricas por estado, para os KPIs do topo da tela. */
export function countWraparoundStatus(rows: OpsWraparoundRow[]): Record<InfraStatus, number> {
  const tally: Record<InfraStatus, number> = { ok: 0, warn: 0, critical: 0, unknown: 0 };
  for (const row of rows) tally[wraparoundStatus(row)] += 1;
  return tally;
}

/** Maior `delta_bytes` da lista (0 quando vazia). */
export function maxGrowthBytes(rows: OpsTableGrowthRow[]): number {
  return rows.reduce((max, row) => (row.delta_bytes > max ? row.delta_bytes : max), 0);
}

/**
 * Normaliza o payload da RPC. A função sempre devolve as chaves, mas uma janela
 * sem dados (cron recém-instalado) devolve `null` em `captured_at`/agregados —
 * a tela precisa disto para mostrar estado vazio em vez de quebrar.
 */
export function parseOpsInfraTelemetry(raw: unknown): OpsInfraTelemetry {
  const payload = isRecord(raw) ? raw : {};
  const captured = isRecord(payload.captured_at) ? payload.captured_at : {};
  const summary = isRecord(payload.pgss_summary) ? payload.pgss_summary : {};
  return {
    window_days: toNumber(payload.window_days) ?? 30,
    captured_at: {
      table_size: toTimestamp(captured.table_size),
      pgss: toTimestamp(captured.pgss),
      wraparound: toTimestamp(captured.wraparound),
    },
    table_growth: toRows<OpsTableGrowthRow>(payload.table_growth, 'table_name'),
    pgss_summary: {
      labels: toNumber(summary.labels) ?? 0,
      calls: toNumber(summary.calls) ?? 0,
      total_exec_time: toNumber(summary.total_exec_time) ?? 0,
    },
    pgss_top: toRows<OpsPgssRow>(payload.pgss_top, 'label'),
    wraparound: toRows<OpsWraparoundRow>(payload.wraparound, 'metric'),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Filtra linhas do payload pela chave identificadora de cada série. */
function toRows<T>(value: unknown, key: string): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is T => isRecord(row) && typeof row[key] === 'string');
}

function toTimestamp(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/** true quando nenhuma das três séries tem dado na janela. */
export function isEmptyTelemetry(data: OpsInfraTelemetry): boolean {
  return (
    data.table_growth.length === 0 && data.pgss_top.length === 0 && data.wraparound.length === 0
  );
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
