/**
 * Status que podem representar indisponibilidade curta de proxy/backend.
 *
 * O conjunto é deliberadamente estreito: erros de contrato (4xx, exceto 429)
 * e falhas 500 não são repetidos para que o E2E continue detectando regressões
 * determinísticas. A retentativa do chamador também deve permanecer limitada.
 */
export function isRetryableBackendStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

export function shouldRetryBackendStatus(
  status: number,
  attempt: number,
  maxAttempts: number,
): boolean {
  return attempt < maxAttempts && isRetryableBackendStatus(status);
}

export function isRetryableBrowserError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === 'TimeoutError' ||
    /net::ERR_(?:CONNECTION|TIMED_OUT|RESET|EMPTY_RESPONSE|HTTP2_PROTOCOL_ERROR)/i.test(
      error.message,
    )
  );
}

export function shouldRetryBrowserError(
  error: unknown,
  attempt: number,
  maxAttempts: number,
): boolean {
  return attempt < maxAttempts && isRetryableBrowserError(error);
}

export function retryAfterDelayMs(value: string | undefined, nowMs = Date.now()): number {
  const fallbackMs = 1_000;
  const maxMs = 5_000;
  const normalized = value?.trim();
  if (!normalized) return fallbackMs;

  if (/^\d+$/.test(normalized)) {
    return Math.min(Number(normalized) * 1_000, maxMs);
  }

  const retryAtMs = Date.parse(normalized);
  if (!Number.isFinite(retryAtMs)) return fallbackMs;
  return Math.min(Math.max(retryAtMs - nowMs, 0), maxMs);
}
