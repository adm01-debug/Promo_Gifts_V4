import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEGRADATION_LOG_CAP,
  aggregateDegradations,
  clearDegradationLog,
  getDegradationLog,
  hydrateDegradationLog,
  recordDegradation,
  subscribeDegradationLog,
  type DegradationEvent,
} from '@/lib/intelligence/degradationRegistry';
import { degradeOrThrow } from '@/lib/intelligence/degradation';

const STORAGE_KEY = 'intel_degradation_log_v1';

describe('degradationRegistry', () => {
  beforeEach(() => {
    clearDegradationLog();
    sessionStorage.clear();
  });

  it('registra evento e mantém snapshot estável por referência', () => {
    const before = getDegradationLog();
    expect(before).toHaveLength(0);
    expect(getDegradationLog()).toBe(before);

    recordDegradation({ scope: 'kpi.revenue', reason: 'permission_denied', code: '42501' });
    const after = getDegradationLog();
    expect(after).toHaveLength(1);
    expect(after).not.toBe(before);
    expect(getDegradationLog()).toBe(after);
  });

  it('notifica assinantes e permite unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeDegradationLog(listener);
    recordDegradation({ scope: 'a', reason: 'missing_relation', code: null });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    recordDegradation({ scope: 'a', reason: 'missing_relation', code: null });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('um listener que lança não impede os demais', () => {
    const ok = vi.fn();
    subscribeDegradationLog(() => {
      throw new Error('boom');
    });
    subscribeDegradationLog(ok);
    expect(() =>
      recordDegradation({ scope: 'a', reason: 'quota_exceeded', code: '429' }),
    ).not.toThrow();
    expect(ok).toHaveBeenCalled();
  });

  it('respeita a capacidade do ring buffer', () => {
    for (let i = 0; i < DEGRADATION_LOG_CAP + 57; i += 1) {
      recordDegradation({ scope: `s${i}`, reason: 'missing_relation', code: null });
    }
    const log = getDegradationLog();
    expect(log).toHaveLength(DEGRADATION_LOG_CAP);
    // Mantém os mais recentes
    expect(log[log.length - 1].scope).toBe(`s${DEGRADATION_LOG_CAP + 56}`);
  });

  it('persiste e re-hidrata a partir do sessionStorage', () => {
    recordDegradation({ scope: 'stock.rupture', reason: 'schema_mismatch', code: '42703', at: 10 });
    expect(sessionStorage.getItem(STORAGE_KEY)).toContain('stock.rupture');

    clearDegradationLog();
    expect(getDegradationLog()).toHaveLength(0);

    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { scope: 'stock.rupture', reason: 'schema_mismatch', code: '42703', at: 10 },
      ]),
    );
    hydrateDegradationLog();
    expect(getDegradationLog()).toHaveLength(1);
  });

  it.each([
    'not json',
    'null',
    '{}',
    '[1,2,3]',
    '[{"scope":"a"}]',
    '[{"scope":"","reason":"permission_denied","code":null,"at":1}]',
    '[{"scope":"a","reason":"permission_denied","code":null,"at":"x"}]',
  ])('ignora payload corrompido: %s', (raw) => {
    sessionStorage.setItem(STORAGE_KEY, raw);
    expect(() => hydrateDegradationLog()).not.toThrow();
    expect(getDegradationLog()).toHaveLength(0);
  });

  it('agrega por scope+reason e ordena por ocorrências', () => {
    const events: DegradationEvent[] = [
      { scope: 'a', reason: 'permission_denied', code: '42501', at: 1 },
      { scope: 'a', reason: 'permission_denied', code: 'PGRST301', at: 3 },
      { scope: 'b', reason: 'missing_relation', code: '42P01', at: 2 },
      { scope: 'a', reason: 'missing_relation', code: null, at: 4 },
    ];
    const agg = aggregateDegradations(events);
    expect(agg[0]).toMatchObject({ scope: 'a', reason: 'permission_denied', count: 2, lastAt: 3 });
    expect(agg[0].codes).toEqual(['42501', 'PGRST301']);
    expect(agg.reduce((acc, r) => acc + r.count, 0)).toBe(events.length);
  });

  it('degradeOrThrow alimenta o registry apenas em erros estruturais', () => {
    expect(degradeOrThrow({ code: '42501' }, 'kpi.revenue', [])).toEqual([]);
    expect(getDegradationLog()).toHaveLength(1);

    expect(() => degradeOrThrow({ message: 'Failed to fetch' }, 'kpi.revenue', [])).toThrow();
    expect(getDegradationLog()).toHaveLength(1);
  });

  it('fuzz: soma dos agregados sempre igual ao total retido', () => {
    const reasons = ['permission_denied', 'missing_relation', 'quota_exceeded', 'schema_mismatch'] as const;
    for (let run = 0; run < 100; run += 1) {
      clearDegradationLog();
      const n = 1 + ((run * 13) % 300);
      for (let i = 0; i < n; i += 1) {
        recordDegradation({
          scope: `scope-${(i * 7) % 9}`,
          reason: reasons[(i + run) % reasons.length],
          code: i % 3 === 0 ? null : `C${i % 5}`,
          at: 1000 + i,
        });
      }
      const log = getDegradationLog();
      expect(log.length).toBe(Math.min(n, DEGRADATION_LOG_CAP));
      expect(aggregateDegradations(log).reduce((acc, r) => acc + r.count, 0)).toBe(log.length);
    }
  });
});
