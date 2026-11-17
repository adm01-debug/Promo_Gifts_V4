/**
 * Túnel de envelopes do Sentry/GlitchTip (mesma origem).
 *
 * Por que existe: o host de erros (`erros.atomicabr.com.br`) não responde
 * `Access-Control-Allow-Origin` para `https://www.promogifts.com.br`, então TODO
 * relatório de erro do navegador morria em CORS ("has been blocked by CORS policy"
 * + `net::ERR_FAILED`) — o monitoramento de produção estava 100% cego. Com
 * `Sentry.init({ tunnel: '/api/monitoring' })` o navegador fala só com a própria
 * origem (já liberada no `connect-src 'self'` do CSP) e o repasse acontece aqui,
 * server-side, onde CORS não se aplica. Também imuniza contra bloqueadores de
 * anúncio, que barram caminhos conhecidos de telemetria.
 *
 * GUARD: isto NÃO é um proxy aberto. O destino não vem da requisição: vem do
 * campo `dsn` do cabeçalho do envelope, e só é aceito se o host estiver em
 * ALLOWED_HOSTS e o project id for numérico. Qualquer desvio responde 400 sem
 * fazer requisição alguma.
 */

const ALLOWED_HOSTS = ['erros.atomicabr.com.br'];

/** Envelope maior que isto é recusado (replay de sessão grande, body hostil). */
const MAX_BODY_BYTES = 20 * 1024 * 1024;

interface TunnelRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  on(event: string, listener: (arg?: unknown) => void): void;
}

interface TunnelResponse {
  setHeader(name: string, value: string): void;
  status(code: number): TunnelResponse;
  json(payload: unknown): void;
  end(): void;
}

function readRawBody(req: TunnelRequest): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let total = 0;

    req.on('data', (chunk) => {
      const part = chunk as Uint8Array;
      total += part.byteLength;
      if (total > MAX_BODY_BYTES) {
        reject(new Error('envelope_too_large'));
        return;
      }
      chunks.push(part);
    });
    req.on('end', () => {
      const out = new Uint8Array(total);
      let offset = 0;
      for (const part of chunks) {
        out.set(part, offset);
        offset += part.byteLength;
      }
      resolve(out);
    });
    req.on('error', (err) => reject(err instanceof Error ? err : new Error(String(err))));
  });
}

/**
 * Resolve o endpoint de ingestão a partir do cabeçalho do envelope.
 * Devolve `null` (fecha fechado) se o envelope não tiver um DSN aceitável.
 */
export function resolveUpstream(envelopeHeaderLine: string): string | null {
  let dsn: unknown;
  try {
    dsn = (JSON.parse(envelopeHeaderLine) as { dsn?: unknown }).dsn;
  } catch {
    return null;
  }
  if (typeof dsn !== 'string' || dsn.length === 0) return null;

  let url: URL;
  try {
    url = new URL(dsn);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (!ALLOWED_HOSTS.includes(url.hostname)) return null;

  const projectId = url.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!/^\d+$/.test(projectId)) return null;

  return `https://${url.hostname}/api/${projectId}/envelope/`;
}

export default async function handler(req: TunnelRequest, res: TunnelResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  let body: Uint8Array;
  try {
    body = await readRawBody(req);
  } catch (err) {
    const tooLarge = err instanceof Error && err.message === 'envelope_too_large';
    res.status(tooLarge ? 413 : 400).json({ error: tooLarge ? 'envelope_too_large' : 'bad_request' });
    return;
  }

  const text = new TextDecoder().decode(body);
  const firstLine = text.slice(0, text.indexOf('\n') === -1 ? text.length : text.indexOf('\n'));
  const upstream = resolveUpstream(firstLine);
  if (!upstream) {
    res.status(400).json({ error: 'dsn_nao_permitido' });
    return;
  }

  try {
    const forwarded = await fetch(upstream, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
      body,
    });
    // O SDK só precisa saber se foi aceito; o corpo da ingestão não interessa.
    res.status(forwarded.ok ? 200 : 502).json({ ok: forwarded.ok, upstreamStatus: forwarded.status });
  } catch {
    res.status(502).json({ error: 'ingest_indisponivel' });
  }
}
