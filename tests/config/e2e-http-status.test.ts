import { describe, expect, it } from 'vitest';

import {
  isRetryableBackendStatus,
  isRetryableBrowserError,
  retryAfterDelayMs,
  shouldRetryBackendStatus,
  shouldRetryBrowserError,
} from '../../e2e/helpers/http-status';

describe('classificação de status transitório no E2E', () => {
  it.each([429, 502, 503, 504])('permite retentativa limitada para %i', (status) => {
    expect(isRetryableBackendStatus(status)).toBe(true);
  });

  it.each([200, 400, 401, 403, 404, 409, 422, 500, 501])(
    'não mascara erro determinístico %i',
    (status) => {
      expect(isRetryableBackendStatus(status)).toBe(false);
    },
  );

  it('limita a indisponibilidade transitória ao número máximo de tentativas', () => {
    expect(shouldRetryBackendStatus(503, 1, 3)).toBe(true);
    expect(shouldRetryBackendStatus(503, 2, 3)).toBe(true);
    expect(shouldRetryBackendStatus(503, 3, 3)).toBe(false);
  });

  it('não repete falha determinística mesmo antes do limite', () => {
    expect(shouldRetryBackendStatus(500, 1, 3)).toBe(false);
  });

  it.each([
    Object.assign(new Error('page.waitForResponse: timeout'), { name: 'TimeoutError' }),
    new Error('page.goto: net::ERR_CONNECTION_RESET'),
    new Error('page.goto: net::ERR_HTTP2_PROTOCOL_ERROR'),
  ])('repete somente erro de transporte/navegação transitório', (error) => {
    expect(isRetryableBrowserError(error)).toBe(true);
  });

  it.each([new Error('expect(locator).toBeVisible falhou'), new Error('HTTP 500'), 'timeout'])(
    'não mascara falha determinística do browser: %s',
    (error) => {
      expect(isRetryableBrowserError(error)).toBe(false);
    },
  );

  it('limita o retry de timeout ao número máximo de tentativas', () => {
    const timeout = Object.assign(new Error('page.waitForResponse: timeout'), {
      name: 'TimeoutError',
    });
    expect(shouldRetryBrowserError(timeout, 1, 3)).toBe(true);
    expect(shouldRetryBrowserError(timeout, 2, 3)).toBe(true);
    expect(shouldRetryBrowserError(timeout, 3, 3)).toBe(false);
  });

  it('respeita Retry-After em segundos com teto de cinco segundos', () => {
    expect(retryAfterDelayMs('2')).toBe(2_000);
    expect(retryAfterDelayMs('120')).toBe(5_000);
  });

  it('respeita Retry-After em data HTTP e aplica fallback seguro', () => {
    const now = Date.parse('2026-11-07T19:00:00.000Z');
    expect(retryAfterDelayMs('Sat, 07 Nov 2026 19:00:03 GMT', now)).toBe(3_000);
    expect(retryAfterDelayMs('inválido', now)).toBe(1_000);
    expect(retryAfterDelayMs(undefined, now)).toBe(1_000);
  });
});
