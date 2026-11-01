/** Percentil por posição (nearest-rank) sobre amostras reais; null sem amostras. */
export function latencyPercentile(samples: readonly number[] | undefined, p: number): number | null {
  const valid = (samples ?? []).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (valid.length === 0) return null;
  const rank = Math.min(valid.length, Math.max(1, Math.ceil((p / 100) * valid.length)));
  return valid[rank - 1];
}

export function formatLatencyMs(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(0)}ms`;
}
