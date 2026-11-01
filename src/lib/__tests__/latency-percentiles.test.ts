import { describe, expect, it } from 'vitest';
import { formatLatencyMs, latencyPercentile } from '../latency-percentiles';

describe('latencyPercentile', () => {
  it('retorna null sem amostras', () => {
    expect(latencyPercentile(undefined, 50)).toBeNull();
    expect(latencyPercentile([], 99)).toBeNull();
  });

  it('usa amostras reais (nearest-rank), ignorando valores inválidos e ordem', () => {
    const samples = [100, 20, Number.NaN, 40, 10, 30, 50, 60, 70, 80, 90];
    expect(latencyPercentile(samples, 50)).toBe(50);
    expect(latencyPercentile(samples, 90)).toBe(90);
    expect(latencyPercentile(samples, 99)).toBe(100);
  });

  it('com uma amostra todos os percentis são ela', () => {
    expect(latencyPercentile([42], 50)).toBe(42);
    expect(latencyPercentile([42], 99)).toBe(42);
  });
});

describe('formatLatencyMs', () => {
  it('formata e usa traço quando não há dado', () => {
    expect(formatLatencyMs(null)).toBe('—');
    expect(formatLatencyMs(123.4)).toBe('123ms');
  });
});
