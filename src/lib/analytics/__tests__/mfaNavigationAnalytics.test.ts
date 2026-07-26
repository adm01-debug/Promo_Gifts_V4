/**
 * Telemetria de navegação do MFA Challenge — contrato do payload e inferência
 * de origem (deep link vs. navegação interna vs. referrer externo).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  trackMfaGoBack,
  trackMfaGuardDismissedRedirect,
  inferGoBackOrigin,
  hasSameOriginReferrer,
  type MfaNavigationEvent,
} from '../mfaNavigationAnalytics';

function buffer(): MfaNavigationEvent[] {
  return (window as unknown as { __e2eAnalytics__?: MfaNavigationEvent[] }).__e2eAnalytics__ ?? [];
}

beforeEach(() => {
  (window as unknown as Record<string, unknown>).__e2eAnalytics__ = [];
});

describe('inferGoBackOrigin', () => {
  it('idx > 0 → internal', () => {
    expect(
      inferGoBackOrigin({ historyIdx: 3, rememberedRoute: null, sameOriginReferrer: false }),
    ).toBe('internal');
  });

  it('rota lembrada presente → internal mesmo com idx 0', () => {
    expect(
      inferGoBackOrigin({ historyIdx: 0, rememberedRoute: '/catalogo', sameOriginReferrer: false }),
    ).toBe('internal');
  });

  it('referrer da mesma origem → internal', () => {
    expect(
      inferGoBackOrigin({ historyIdx: 0, rememberedRoute: null, sameOriginReferrer: true }),
    ).toBe('internal');
  });

  it('sem sinais → deep_link', () => {
    expect(
      inferGoBackOrigin({ historyIdx: 0, rememberedRoute: null, sameOriginReferrer: false }),
    ).toBe('deep_link');
  });
});

describe('hasSameOriginReferrer', () => {
  it('false quando referrer vazio', () => {
    vi.spyOn(document, 'referrer', 'get').mockReturnValue('');
    expect(hasSameOriginReferrer()).toBe(false);
  });

  it('false quando referrer é de outra origem', () => {
    vi.spyOn(document, 'referrer', 'get').mockReturnValue('https://evil.example/x');
    expect(hasSameOriginReferrer()).toBe(false);
  });

  it('true quando referrer é da mesma origem', () => {
    vi.spyOn(document, 'referrer', 'get').mockReturnValue(`${window.location.origin}/catalogo`);
    expect(hasSameOriginReferrer()).toBe(true);
  });

  it('false quando referrer é inválido (não lança)', () => {
    vi.spyOn(document, 'referrer', 'get').mockReturnValue('not-a-url');
    expect(() => hasSameOriginReferrer()).not.toThrow();
    expect(hasSameOriginReferrer()).toBe(false);
  });
});

describe('trackMfaGoBack', () => {
  const base = {
    fromPath: '/admin/usuarios',
    rememberedRoute: '/catalogo',
    historyIdx: 2,
    origin: 'internal' as const,
    sameOriginReferrer: true,
    guard: 'admin' as const,
  };

  it('grava no buffer com nome, ts ISO e payload completo', () => {
    trackMfaGoBack({ ...base, toPath: '/catalogo', strategy: 'remembered_route' });
    const events = buffer();
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe('mfa.challenge_go_back');
    expect(events[0].ts).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    expect(events[0].payload).toMatchObject({
      fromPath: '/admin/usuarios',
      toPath: '/catalogo',
      rememberedRoute: '/catalogo',
      historyIdx: 2,
      origin: 'internal',
      strategy: 'remembered_route',
      sameOriginReferrer: true,
      guard: 'admin',
    });
  });

  it('despacha CustomEvent lovable:analytics com o mesmo evento', () => {
    const seen: MfaNavigationEvent[] = [];
    const handler = (e: Event) => seen.push((e as CustomEvent<MfaNavigationEvent>).detail);
    window.addEventListener('lovable:analytics', handler);
    trackMfaGoBack({ ...base, toPath: '/', strategy: 'home_fallback' });
    window.removeEventListener('lovable:analytics', handler);
    expect(seen).toHaveLength(1);
    expect(seen[0].payload).toMatchObject({ strategy: 'home_fallback', toPath: '/' });
  });

  it.each([
    ['remembered_route', '/catalogo'],
    ['history_back', '-1'],
    ['home_fallback', '/'],
  ] as const)('registra estratégia %s → destino %s', (strategy, toPath) => {
    trackMfaGoBack({ ...base, toPath, strategy });
    expect(buffer()[0].payload).toMatchObject({ strategy, toPath });
  });

  it('deep link (idx 0, sem rota lembrada) fica auditável no payload', () => {
    trackMfaGoBack({
      fromPath: '/dev/status',
      toPath: '/',
      rememberedRoute: null,
      historyIdx: 0,
      origin: 'deep_link',
      sameOriginReferrer: false,
      strategy: 'home_fallback',
      guard: 'dev',
    });
    expect(buffer()[0].payload).toMatchObject({
      origin: 'deep_link',
      historyIdx: 0,
      rememberedRoute: null,
      guard: 'dev',
    });
  });

  it('não estoura o buffer (limite 200)', () => {
    for (let i = 0; i < 260; i++) {
      trackMfaGoBack({ ...base, toPath: `/p/${i}`, strategy: 'remembered_route' });
    }
    const events = buffer();
    expect(events.length).toBeLessThanOrEqual(200);
    expect(events[events.length - 1].payload.toPath).toBe('/p/259');
  });
});

describe('trackMfaGuardDismissedRedirect', () => {
  it('registra o redirect de loop-break do guard', () => {
    trackMfaGuardDismissedRedirect({
      guard: 'dev',
      fromPath: '/dev/status',
      toPath: '/estoque',
      rememberedRoute: '/estoque',
    });
    const [evt] = buffer();
    expect(evt.name).toBe('mfa.guard_dismissed_redirect');
    expect(evt.payload).toMatchObject({
      guard: 'dev',
      fromPath: '/dev/status',
      toPath: '/estoque',
    });
  });

  it('gap detectável: destino "/" apesar de rota lembrada existente', () => {
    trackMfaGuardDismissedRedirect({
      guard: 'admin',
      fromPath: '/admin/usuarios',
      toPath: '/',
      rememberedRoute: '/admin/usuarios',
    });
    expect(buffer()[0].payload).toMatchObject({ toPath: '/', rememberedRoute: '/admin/usuarios' });
  });

  it('nunca lança quando o buffer está poluído com valor inválido', () => {
    (window as unknown as Record<string, unknown>).__e2eAnalytics__ = 'not-an-array';
    expect(() =>
      trackMfaGuardDismissedRedirect({
        guard: 'dev',
        fromPath: '/dev',
        toPath: '/',
        rememberedRoute: null,
      }),
    ).not.toThrow();
  });
});
