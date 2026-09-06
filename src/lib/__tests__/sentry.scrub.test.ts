/**
 * sentry.ts — scrubBeforeSend remove params técnicos de recovery.
 *
 * Achado da auditoria (2026-09, não confirmado até então): __bare/__bart/_cb
 * (params de cap de reload de index.html/sw-register.ts/chunk-recovery.ts)
 * podiam vazar para o Sentry via `event.request.url`/`query_string` e
 * breadcrumbs de navegação, populados automaticamente pelo SDK a partir de
 * `window.location`. Nenhum desses params é sensível, mas poluem
 * agrupamento de eventos por URL e dashboards de rota — exatamente durante
 * a janela em que um erro real de chunk está sendo capturado.
 *
 * Fix: `scrubBeforeSend` (extraído do `beforeSend` inline) remove esses
 * params de `request.url`, `request.query_string` e `breadcrumbs[].data.{to,from,url}`
 * antes do evento sair do browser.
 */
import { describe, it, expect } from 'vitest';
import { scrubBeforeSend } from '@/lib/sentry';
import type { ErrorEvent } from '@sentry/react';

function baseEvent(overrides: Partial<ErrorEvent> = {}): ErrorEvent {
  return { type: undefined, ...overrides } as ErrorEvent;
}

describe('scrubBeforeSend', () => {
  it('remove __bare/__bart/_cb de request.url preservando os demais params', () => {
    const event = baseEvent({
      request: {
        url: 'https://www.promogifts.com.br/carrinhos?status=draft&__bare=2&__bart=123&_cb=456',
      },
    });

    const out = scrubBeforeSend(event);

    const url = new URL(out.request!.url!);
    expect(url.searchParams.has('__bare')).toBe(false);
    expect(url.searchParams.has('__bart')).toBe(false);
    expect(url.searchParams.has('_cb')).toBe(false);
    expect(url.searchParams.get('status')).toBe('draft');
  });

  it('remove __bare/__bart/_cb de request.query_string (string solta, sem host)', () => {
    const event = baseEvent({
      request: { query_string: 'status=draft&__bare=1&page=2' },
    });

    const out = scrubBeforeSend(event);

    expect(out.request!.query_string).toBe('status=draft&page=2');
  });

  it('remove params de recovery de breadcrumbs de navegação (data.to/from/url)', () => {
    const event = baseEvent({
      breadcrumbs: [
        {
          category: 'navigation',
          data: {
            to: '/orcamentos?__bare=2&__bart=999',
            from: '/carrinhos?status=draft',
          },
        },
      ],
    });

    const out = scrubBeforeSend(event);

    const to = new URL((out.breadcrumbs![0].data as Record<string, string>).to, 'https://x.test');
    expect(to.searchParams.has('__bare')).toBe(false);
    expect(to.searchParams.has('__bart')).toBe(false);
    expect((out.breadcrumbs![0].data as Record<string, string>).from).toBe(
      '/carrinhos?status=draft',
    );
  });

  it('continua removendo headers sensíveis (authorization/cookie) — comportamento pré-existente preservado', () => {
    const event = baseEvent({
      request: {
        headers: { authorization: 'Bearer xyz', cookie: 'session=abc', 'x-request-id': 'r1' },
      },
    });

    const out = scrubBeforeSend(event);

    const headers = out.request!.headers as Record<string, unknown>;
    expect(headers.authorization).toBeUndefined();
    expect(headers.cookie).toBeUndefined();
    expect(headers['x-request-id']).toBe('r1');
  });

  it('não quebra quando o evento não tem request nem breadcrumbs', () => {
    const event = baseEvent();
    expect(() => scrubBeforeSend(event)).not.toThrow();
  });

  it('não mexe na URL quando não há nenhum param de recovery presente', () => {
    const original = 'https://www.promogifts.com.br/carrinhos?status=draft';
    const event = baseEvent({ request: { url: original } });

    const out = scrubBeforeSend(event);

    expect(out.request!.url).toBe(original);
  });
});
