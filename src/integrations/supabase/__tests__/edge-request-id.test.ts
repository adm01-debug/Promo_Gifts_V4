/**
 * Tracing x-request-id — o global.fetch do client injeta `X-Request-Id`
 * (UUID v4 por chamada) em TODA requisição para /functions/v1/, inclusive
 * `supabase.functions.invoke` direto (sem invokeEdgeSafe). Header explícito
 * do caller nunca é sobrescrito; chamadas fora de /functions/v1/ não ganham
 * o header.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { REQUEST_ID_HEADER } from '@/lib/telemetry/requestId';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function lastFetchCall() {
  const mock = globalThis.fetch as ReturnType<typeof vi.fn>;
  const calls = mock.mock.calls;
  return calls[calls.length - 1] as [RequestInfo | URL, RequestInit | undefined];
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('x-request-id — injeção no global.fetch do client', () => {
  it('functions.invoke direto sai com X-Request-Id UUID v4', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))),
    );

    await supabase.functions.invoke('qualquer-edge', { body: { ping: 1 } });

    const [url, options] = lastFetchCall();
    expect(String(url)).toContain('/functions/v1/qualquer-edge');
    const headers = new Headers(options?.headers);
    expect(headers.get(REQUEST_ID_HEADER)).toMatch(UUID_RE);
  });

  it('gera um id diferente por chamada', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))),
    );

    await supabase.functions.invoke('e1');
    const [, o1] = lastFetchCall();
    await supabase.functions.invoke('e2');
    const [, o2] = lastFetchCall();

    const id1 = new Headers(o1?.headers).get(REQUEST_ID_HEADER);
    const id2 = new Headers(o2?.headers).get(REQUEST_ID_HEADER);
    expect(id1).toMatch(UUID_RE);
    expect(id2).toMatch(UUID_RE);
    expect(id1).not.toBe(id2);
  });

  it('não sobrescreve X-Request-Id fornecido pelo caller', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))),
    );

    await supabase.functions.invoke('e', {
      headers: { [REQUEST_ID_HEADER]: 'caller-fixed-id-123' },
    });

    const [, options] = lastFetchCall();
    expect(new Headers(options?.headers).get(REQUEST_ID_HEADER)).toBe('caller-fixed-id-123');
  });

  it('não injeta o header em chamadas que não são de edge function', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))),
    );

    await supabase.from('products').select('id').limit(1);

    const [url, options] = lastFetchCall();
    expect(String(url)).not.toContain('/functions/v1/');
    expect(new Headers(options?.headers).get(REQUEST_ID_HEADER)).toBeNull();
  });
});
