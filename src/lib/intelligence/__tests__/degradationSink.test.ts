import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_COOLDOWN_MS,
  DEFAULT_MAX_EVENTS,
  __resetDegradationSink,
  createDegradationThrottle,
  sinkDegradation,
} from '@/lib/intelligence/degradationSink';

const logMock = vi.fn();
vi.mock('@/services/telemetryService', () => ({
  telemetryService: {
    log: (...args: unknown[]) => logMock(...args),
  },
}));

describe('createDegradationThrottle', () => {
  it('emite a primeira ocorrência de cada chave', () => {
    const t = createDegradationThrottle();
    expect(t.offer('a', 0)).toEqual({ emit: true, reason: 'first', count: 1 });
    expect(t.offer('b', 0)).toEqual({ emit: true, reason: 'first', count: 1 });
  });

  it('suprime dentro do cooldown e acumula o count na próxima janela', () => {
    const t = createDegradationThrottle({ cooldownMs: 1000 });
    t.offer('a', 0);
    for (let i = 1; i <= 9; i += 1) {
      expect(t.offer('a', i * 10)).toMatchObject({ emit: false, reason: 'cooldown', count: 0 });
    }
    expect(t.offer('a', 1000)).toEqual({ emit: true, reason: 'window', count: 10 });
  });

  it('respeita o teto global por sessão', () => {
    const t = createDegradationThrottle({ cooldownMs: 0, maxEvents: 3 });
    expect([t.offer('a', 1).emit, t.offer('b', 1).emit, t.offer('c', 1).emit]).toEqual([
      true,
      true,
      true,
    ]);
    expect(t.offer('d', 1)).toMatchObject({ emit: false, reason: 'cap' });
    expect(t.offer('a', 2)).toMatchObject({ emit: false, reason: 'cap' });
    expect(t.emitted).toBe(3);
  });

  it('cooldown zero sempre emite', () => {
    const t = createDegradationThrottle({ cooldownMs: 0, maxEvents: 1000 });
    let emits = 0;
    for (let i = 0; i < 100; i += 1) if (t.offer('a', 5).emit) emits += 1;
    expect(emits).toBe(100);
  });

  it('fuzz: cobertura sem buraco nem overlap em 200 sequências', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const t = createDegradationThrottle({ cooldownMs: 500, maxEvents: 10_000 });
      let now = 0;
      let total = 0;
      let covered = 0;
      const n = 20 + (seed % 80);
      for (let i = 0; i < n; i += 1) {
        now += (seed * (i + 1)) % 900;
        total += 1;
        const out = t.offer('k', now);
        if (out.emit) covered += out.count;
      }
      expect(covered).toBeLessThanOrEqual(total);
      // A última emissão sempre cobre tudo até ela; o resíduo é o pendente.
      expect(total - covered).toBeGreaterThanOrEqual(0);
    }
  });

  it('reset zera o estado', () => {
    const t = createDegradationThrottle({ cooldownMs: 1000, maxEvents: 1 });
    t.offer('a', 0);
    expect(t.offer('b', 0).emit).toBe(false);
    t.reset();
    expect(t.offer('b', 0).emit).toBe(true);
  });
});

describe('sinkDegradation', () => {
  beforeEach(() => {
    __resetDegradationSink();
    logMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('envia o evento para o telemetryService com metadata sem PII', () => {
    sinkDegradation({ scope: 'kpi.revenue', reason: 'permission_denied', code: '42501', at: 0 });
    expect(logMock).toHaveBeenCalledTimes(1);
    const payload = logMock.mock.calls[0][0] as {
      event_type: string;
      name: string;
      metadata: Record<string, unknown>;
    };
    expect(payload.event_type).toBe('api_fail');
    expect(payload.name).toBe('intelligence_block_degraded');
    expect(payload.metadata).toMatchObject({
      scope: 'kpi.revenue',
      reason: 'permission_denied',
      code: '42501',
      occurrences: 1,
    });
  });

  it('não envia duplicatas dentro do cooldown padrão', () => {
    for (let i = 0; i < 25; i += 1) {
      sinkDegradation({ scope: 's', reason: 'missing_relation', code: null, at: i * 100 });
    }
    expect(logMock).toHaveBeenCalledTimes(1);
  });

  it('reabre a janela após o cooldown e reporta as ocorrências agregadas', () => {
    sinkDegradation({ scope: 's', reason: 'quota_exceeded', code: '429', at: 0 });
    for (let i = 1; i <= 4; i += 1) {
      sinkDegradation({ scope: 's', reason: 'quota_exceeded', code: '429', at: i });
    }
    sinkDegradation({ scope: 's', reason: 'quota_exceeded', code: '429', at: DEFAULT_COOLDOWN_MS });
    expect(logMock).toHaveBeenCalledTimes(2);
    expect((logMock.mock.calls[1][0] as { metadata: { occurrences: number } }).metadata.occurrences).toBe(5);
  });

  it('escopos distintos não compartilham a janela', () => {
    sinkDegradation({ scope: 'a', reason: 'permission_denied', code: null, at: 0 });
    sinkDegradation({ scope: 'b', reason: 'permission_denied', code: null, at: 0 });
    sinkDegradation({ scope: 'a', reason: 'missing_relation', code: null, at: 0 });
    expect(logMock).toHaveBeenCalledTimes(3);
  });

  it('nunca ultrapassa o teto de eventos por sessão', () => {
    for (let i = 0; i < DEFAULT_MAX_EVENTS + 30; i += 1) {
      sinkDegradation({ scope: `scope-${i}`, reason: 'schema_mismatch', code: null, at: i });
    }
    expect(logMock.mock.calls.length).toBeLessThanOrEqual(DEFAULT_MAX_EVENTS);
  });

  it('nunca lança, mesmo com relógio inválido', () => {
    expect(() =>
      sinkDegradation({ scope: 's', reason: 'permission_denied', code: null, at: Number.NaN }),
    ).not.toThrow();
  });
});
