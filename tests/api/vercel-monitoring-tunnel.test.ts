import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import monitoringHandler, { config, readEnvelope, resolveUpstream } from '../../api/monitoring';

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

  describe('corpo bruto — não pode ficar pendurado no parser da Vercel', () => {
    it('desliga o bodyParser (sem isto o stream chega drenado e o túnel engole tudo)', () => {
      expect(config).toEqual({ api: { bodyParser: false } });
    });

    it('usa req.body quando algum runtime já consumiu o stream (Buffer)', async () => {
      const drenado = {
        method: 'POST',
        headers: {},
        readableEnded: true,
        body: new TextEncoder().encode(ENVELOPE),
        on() {
          throw new Error('não deve tentar ler o stream já consumido');
        },
      };
      const lido = await readEnvelope(drenado);
      expect(new TextDecoder().decode(lido!)).toBe(ENVELOPE);
    });

    it('usa req.body quando ele chega como string', async () => {
      const lido = await readEnvelope({
        method: 'POST',
        headers: {},
        readableEnded: true,
        body: ENVELOPE,
        on() {},
      });
      expect(new TextDecoder().decode(lido!)).toBe(ENVELOPE);
    });

    it('complete=true com bytes ainda no buffer NÃO descarta o envelope (le o stream)', async () => {
      // IncomingMessage real: mensagem HTTP completa, corpo ainda por consumir.
      const lido = await readEnvelope({
        method: 'POST',
        headers: {},
        complete: true,
        readableEnded: false,
        on(evento: string, listener: (arg?: unknown) => void) {
          if (evento === 'data') listener(new TextEncoder().encode(ENVELOPE));
          if (evento === 'end') listener();
        },
      } as never);
      expect(new TextDecoder().decode(lido!)).toBe(ENVELOPE);
    });

    it('stream drenado e sem corpo devolve null em vez de esperar evento que não vem', async () => {
      const lido = await readEnvelope({
        method: 'POST',
        headers: {},
        readableEnded: true,
        on() {},
      });
      expect(lido).toBeNull();
    });

    it('handler responde 400 em envelope vazio, sem chamar a ingestão', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const res = responseMock();

      await monitoringHandler({ method: 'POST', headers: {}, readableEnded: true, on() {} }, res);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: 'envelope_vazio' });
    });
  });

  describe('limite de ingestão — o SDK precisa do status e dos headers', () => {
    it('repassa 429 com Retry-After e X-Sentry-Rate-Limits', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(null, {
          status: 429,
          headers: { 'Retry-After': '60', 'X-Sentry-Rate-Limits': '60:error:organization' },
        }),
      );
      const res = responseMock();

      await monitoringHandler(requestMock(ENVELOPE), res);

      expect(res.statusCode).toBe(429);
      expect(res.headers['retry-after']).toBe('60');
      expect(res.headers['x-sentry-rate-limits']).toBe('60:error:organization');
    });

    it('NAO repassa 404 da ingestao: devolve 202 para o console do vendedor ficar limpo', async () => {
      // O DSN em producao aponta para um projeto que o GlitchTip nao tem; o
      // handler devolvia 404 cru e o navegador registrava falha a cada erro.
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const res = responseMock();

      await monitoringHandler(requestMock(ENVELOPE), res);

      expect(res.statusCode).toBe(202);
      expect(res.body).toEqual({ ok: false, descartado: 'dsn_recusado_pela_ingestao' });
      // O status real nao some: vai no header, para quem inspeciona.
      expect(res.headers['x-tunnel-upstream-status']).toBe('404');
    });

    it('trata 401 e 403 como recusa permanente tambem', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      for (const status of [401, 403]) {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status }));
        const res = responseMock();
        await monitoringHandler(requestMock(ENVELOPE), res);
        expect(res.statusCode).toBe(202);
        expect(res.headers['x-tunnel-upstream-status']).toBe(String(status));
      }
    });

    it('500 da ingestao continua sendo repassado (falha transitoria, o SDK reenvia)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));
      const res = responseMock();

      await monitoringHandler(requestMock(ENVELOPE), res);

      expect(res.statusCode).toBe(500);
    });

    it('repassa limite por categoria que vem junto com 200', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(null, {
          status: 200,
          headers: { 'X-Sentry-Rate-Limits': '30:replay:organization' },
        }),
      );
      const res = responseMock();

      await monitoringHandler(requestMock(ENVELOPE), res);

      expect(res.statusCode).toBe(200);
      expect(res.headers['x-sentry-rate-limits']).toBe('30:replay:organization');
    });
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
