import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock do Sentry para evitar import real
vi.mock('@/lib/sentry', () => ({ captureException: vi.fn() }));

import { createClientLogger } from '@/lib/telemetry/structuredLogger';
import { captureException } from '@/lib/sentry';

describe('structuredLogger (client)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it('emite payload JSON com campos canônicos', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const log = createClientLogger('test.scope', { requestId: 'rid-123' });
    log.info('hello', { foo: 'bar' });

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toBe('[test.scope:hello]');
    const payloadObj: unknown = spy.mock.calls[0][1];

    expect(payloadObj).toMatchObject({
      level: 'info',
      scope: 'test.scope',
      request_id: 'rid-123',
      event: 'hello',
      foo: 'bar',
    });
    expect(payloadObj).toHaveProperty('ts', expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/));
    spy.mockRestore();
  });

  it('encaminha erros para o Sentry com tag request_id', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = createClientLogger('auth.signIn', { requestId: 'rid-err' });
    const err = new Error('boom');
    log.error('failed', { err });

    expect(captureException).toHaveBeenCalledWith(
      err,
      expect.objectContaining({
        tags: expect.objectContaining({ scope: 'auth.signIn', event: 'failed', request_id: 'rid-err' }),
      }),
    );
  });

  it('headers() retorna X-Request-Id propagável', () => {
    const log = createClientLogger('x', { requestId: 'rid-h' });
    expect(log.headers()).toEqual({ 'X-Request-Id': 'rid-h' });
  });

  it('child preserva request_id e prefixa scope', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const log = createClientLogger('parent', { requestId: 'rid-c', base: { trace: 'parent' } });
    const child = log.child('sub', { source: 'child' });
    expect(child.requestId).toBe('rid-c');
    expect(child.scope).toBe('parent.sub');
    child.info('event', { field: 'value' });
    expect(spy).toHaveBeenCalledExactlyOnceWith('[parent.sub:event]', expect.objectContaining({
      request_id: 'rid-c', scope: 'parent.sub', trace: 'parent', source: 'child', field: 'value',
    }));
  });

  it('serializa o alias error e encaminha o mesmo erro original sem perder correlação', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = createClientLogger('checkout', { requestId: 'rid-alias' });
    const error = new TypeError('invalid input');
    log.error('failed', { error });
    expect(spy).toHaveBeenCalledExactlyOnceWith('[checkout:failed]', expect.objectContaining({
      level: 'error', request_id: 'rid-alias', scope: 'checkout', event: 'failed',
      error: expect.objectContaining({ name: 'TypeError', message: 'invalid input', stack: expect.any(String) }),
    }));
    expect(captureException).toHaveBeenCalledExactlyOnceWith(error, expect.objectContaining({
      tags: { scope: 'checkout', event: 'failed', request_id: 'rid-alias' },
      extra: expect.objectContaining({ request_id: 'rid-alias', event: 'failed' }),
    }));
    expect(error.message).toBe('invalid input');
  });

  it('preserva o nível warn no console nativo com o payload completo', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    createClientLogger('inventory', { requestId: 'rid-warn' }).warn('retry', { attempt: 2 });
    expect(spy).toHaveBeenCalledExactlyOnceWith('[inventory:retry]', expect.objectContaining({
      level: 'warn', scope: 'inventory', request_id: 'rid-warn', event: 'retry', attempt: 2,
      ts: expect.any(String),
    }));
  });
});
