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
