import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import monitoringHandler, { resolveUpstream } from '../../api/monitoring';

interface MockResponse {
  headers: Record<string, string>;
  statusCode: number;
  body: unknown;
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
    end() {},
  };
}

/** Requisição falsa que entrega `payload` pelos eventos data/end, como o Node. */
function requestMock(payload: string, method = 'POST') {
  return {
    method,
    headers: { 'content-type': 'application/x-sentry-envelope' },
    on(event: string, listener: (arg?: unknown) => void) {
      if (event === 'data') listener(new TextEncoder().encode(payload));
      if (event === 'end') listener();
    },
  };
}

const ENVELOPE = [
  JSON.stringify({
    event_id: '9ec79c33ec9942ab8353589fcb2e04dc',
    dsn: 'https://66323199858e42958e4dfcde3cd77b7e@erros.atomicabr.com.br/4',
  }),
  JSON.stringify({ type: 'event' }),
  JSON.stringify({ message: 'boom' }),
].join('\n');

describe('api/monitoring — túnel de envelopes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('repassa o envelope para o endpoint derivado do DSN do próprio envelope', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));
    const res = responseMock();

    await monitoringHandler(requestMock(ENVELOPE), res);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe('https://erros.atomicabr.com.br/api/4/envelope/');
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store, max-age=0');
  });

  it('não é proxy aberto: DSN de host não liberado é recusado SEM fazer requisição', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = responseMock();
    const hostil = [JSON.stringify({ dsn: 'https://k@attacker.example.com/4' }), '{}'].join('\n');

    await monitoringHandler(requestMock(hostil), res);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'dsn_nao_permitido' });
  });

  it('recusa método diferente de POST', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = responseMock();

    await monitoringHandler(requestMock(ENVELOPE, 'GET'), res);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(405);
    expect(res.headers['allow']).toBe('POST');
  });

  it('devolve 502 quando a ingestão falha, sem derrubar a função', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
    const res = responseMock();

    await monitoringHandler(requestMock(ENVELOPE), res);

    expect(res.statusCode).toBe(502);
    expect(res.body).toEqual({ error: 'ingest_indisponivel' });
  });

  describe('resolveUpstream — fecha fechado', () => {
    it('aceita só https + host liberado + project id numérico', () => {
      expect(resolveUpstream(JSON.stringify({ dsn: 'https://k@erros.atomicabr.com.br/4' }))).toBe(
        'https://erros.atomicabr.com.br/api/4/envelope/',
      );
    });

    it.each([
      ['cabeçalho não-JSON', 'isto nao e json'],
      ['sem dsn', JSON.stringify({ event_id: 'abc' })],
      ['dsn vazio', JSON.stringify({ dsn: '' })],
      ['http em vez de https', JSON.stringify({ dsn: 'http://k@erros.atomicabr.com.br/4' })],
      ['host não liberado', JSON.stringify({ dsn: 'https://k@evil.example.com/4' })],
      ['project id não numérico', JSON.stringify({ dsn: 'https://k@erros.atomicabr.com.br/abc' })],
      ['project id ausente', JSON.stringify({ dsn: 'https://k@erros.atomicabr.com.br/' })],
    ])('recusa %s', (_caso, header) => {
      expect(resolveUpstream(header)).toBeNull();
    });
  });
});
