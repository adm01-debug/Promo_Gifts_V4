import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import healthHandler from '../../api/health';
import readyHandler from '../../api/ready';

interface MockResponse {
  headers: Record<string, string>;
  statusCode: number;
  body: unknown;
  ended: boolean;
  setHeader(name: string, value: string): void;
  status(code: number): MockResponse;
  json(payload: unknown): void;
  end(): void;
}

function responseMock(): MockResponse {
  return {
    headers: {},
    statusCode: 0,
    body: undefined,
    ended: false,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
    },
    end() {
      this.ended = true;
    },
  };
}

const canonicalEnv = {
  VITE_SUPABASE_URL: 'https://doufsxqlfjyuvxuezpln.supabase.co',
  VITE_SUPABASE_PROJECT_ID: 'doufsxqlfjyuvxuezpln',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
};

describe('Vercel observability endpoints', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, ...canonicalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('reports the exact deployed commit and echoes a valid request id', () => {
    process.env.APP_COMMIT_SHA = '0123456789abcdef';
    const res = responseMock();

    healthHandler({ method: 'GET', headers: { 'x-request-id': 'gh-123-1-0123456' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toContain('no-store');
    expect(res.headers['x-request-id']).toBe('gh-123-1-0123456');
    expect(res.body).toMatchObject({
      status: 'ok',
      commit: '0123456789abcdef',
      requestId: 'gh-123-1-0123456',
    });
  });

  it('rejects unsupported health methods', () => {
    const res = responseMock();

    healthHandler({ method: 'POST', headers: {} }, res);

    expect(res.statusCode).toBe(405);
    expect(res.headers.allow).toBe('GET, HEAD');
  });

  it('reports ready only when Supabase Auth and PostgREST respond', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));
    const res = responseMock();

    await readyHandler({ method: 'GET', headers: { 'x-request-id': 'ready-check-1' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ready',
      checks: {
        config: { status: 'ok' },
        auth: { status: 'ok' },
        postgrest: { status: 'ok' },
      },
      requestId: 'ready-check-1',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://doufsxqlfjyuvxuezpln.supabase.co/auth/v1/health',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://doufsxqlfjyuvxuezpln.supabase.co/rest/v1/rpc/get_sitemap_public',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ p_limit: 1, p_offset: 0 }),
        signal: expect.any(AbortSignal),
      }),
    );
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      apikey: 'test-publishable-key',
    });
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({
      apikey: 'test-publishable-key',
      Authorization: 'Bearer test-publishable-key',
      'Content-Type': 'application/json',
    });
  });

  it('fails closed before probing when the configured project is not canonical', async () => {
    process.env.VITE_SUPABASE_PROJECT_ID = 'pqpdolkaeqlyzpdpbizo';
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const res = responseMock();

    await readyHandler({ method: 'GET', headers: {} }, res);

    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({
      status: 'not_ready',
      checks: { config: { status: 'error', reason: 'canonical_project_mismatch' } },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 503 degraded without exposing credentials when Supabase is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network unavailable'));
    const res = responseMock();

    await readyHandler({ method: 'GET', headers: {} }, res);

    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({
      status: 'degraded',
      checks: {
        config: { status: 'ok' },
        auth: { status: 'error', reason: 'unreachable' },
        postgrest: { status: 'error', reason: 'unreachable' },
      },
    });
    expect(JSON.stringify(res.body)).not.toContain('test-publishable-key');
  });

  it.each<[string, number, number]>([
    ['auth', 503, 200],
    ['postgrest', 200, 401],
  ])('returns 503 degraded when %s rejects the probe', async (_probe, authStatus, restStatus) => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: authStatus }))
      .mockResolvedValueOnce(new Response('{}', { status: restStatus }));
    const res = responseMock();

    await readyHandler({ method: 'GET', headers: {} }, res);

    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ status: 'degraded' });
  });

  it('returns the readiness status on HEAD without a response body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    const res = responseMock();

    await readyHandler({ method: 'HEAD', headers: {} }, res);

    expect(res.statusCode).toBe(200);
    expect(res.ended).toBe(true);
    expect(res.body).toBeUndefined();
  });
});
