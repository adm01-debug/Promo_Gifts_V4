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

  it('reports ready when the canonical Supabase auth service responds', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));
    const res = responseMock();

    await readyHandler({ method: 'GET', headers: { 'x-request-id': 'ready-check-1' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ready',
      checks: { config: { status: 'ok' }, supabase: { status: 'ok' } },
      requestId: 'ready-check-1',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://doufsxqlfjyuvxuezpln.supabase.co/auth/v1/health',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    const [, options] = fetchMock.mock.calls[0];
    expect(options?.headers).toMatchObject({ apikey: 'test-publishable-key' });
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

  it('reports degraded without exposing credentials when Supabase is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network unavailable'));
    const res = responseMock();

    await readyHandler({ method: 'GET', headers: {} }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: 'degraded',
      checks: { config: { status: 'ok' }, supabase: { status: 'error', reason: 'unreachable' } },
    });
    expect(JSON.stringify(res.body)).not.toContain('test-publishable-key');
  });
});
