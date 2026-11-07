import { describe, expect, it } from 'vitest';

import { isRetryableBackendStatus, shouldRetryBackendStatus } from '../../e2e/helpers/http-status';

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
});
