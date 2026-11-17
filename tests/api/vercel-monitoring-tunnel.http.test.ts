/**
 * Integração com HTTP de verdade (node:http), não mock de stream.
 *
 * Por que existe: o mock dispara `data`/`end` no ato em que o listener é
 * registrado, então ele não reproduz o estado real de um `IncomingMessage` —
 * foi assim que passou batido um guard que descartava envelope válido
 * (`complete === true` não significa "stream consumido"). Este teste faz um POST
 * real contra o handler e só passa se o envelope chegar à ingestão.
 */
import { createServer, request as httpRequest, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import monitoringHandler from '../../api/monitoring';

const ENVELOPE = [
  JSON.stringify({ event_id: 'abc', dsn: 'https://k@erros.atomicabr.com.br/4' }),
  JSON.stringify({ type: 'event' }),
  JSON.stringify({ message: 'boom' }),
].join('\n');

/** Adapta ServerResponse para a interface mínima que o handler usa. */
function adapt(res: import('node:http').ServerResponse) {
  let code = 200;
  return {
    setHeader: (n: string, v: string) => res.setHeader(n, v),
    status(c: number) {
      code = c;
      return this;
    },
    json(payload: unknown) {
      res.statusCode = code;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(payload));
    },
    end() {
      res.statusCode = code;
      res.end();
    },
  };
}

function post(porta: number, corpo: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        host: '127.0.0.1',
        port: porta,
        path: '/api/monitoring',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'Content-Length': Buffer.byteLength(corpo),
        },
      },
      (res: IncomingMessage) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
      },
    );
    req.on('error', reject);
    req.end(corpo);
  });
}

describe('api/monitoring sobre HTTP real', () => {
  let server: Server;
  let porta = 0;

  beforeEach(async () => {
    vi.restoreAllMocks();
    server = createServer((req, res) => {
      // Atrasa a entrada no handler de propósito: dá tempo de o corpo inteiro
      // chegar e `complete` virar true antes da primeira leitura — o cenário
      // em que o guard antigo descartava o envelope.
      setTimeout(() => {
        void monitoringHandler(req as never, adapt(res) as never);
      }, 25);
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    porta = (server.address() as AddressInfo).port;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await new Promise<void>((r) => server.close(() => r()));
  });

  it('repassa o envelope mesmo quando o corpo já chegou inteiro antes da leitura', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));

    const res = await post(porta, ENVELOPE);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const enviado = fetchSpy.mock.calls[0][1]?.body as Uint8Array;
    expect(new TextDecoder().decode(enviado)).toBe(ENVELOPE);
    expect(res.status).toBe(200);
  });

  it('não trava: POST sem corpo responde 400 em vez de esperar evento que não vem', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const res = await post(porta, '');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(res.status).toBe(400);
    expect(res.body).toContain('envelope_vazio');
  });
});
