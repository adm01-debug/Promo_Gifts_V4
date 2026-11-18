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

/**
 * GUARD: o parser de corpo da Vercel bufferiza a requisição ANTES de chamar o
 * handler; se ele rodasse, `on('data')` nunca mais dispararia e a promessa de
 * leitura ficaria pendurada até o timeout da função — o túnel engoliria todo
 * envelope em silêncio. Desligar o parser é o padrão documentado pela Vercel
 * para quem precisa do corpo bruto (ver docs de x-vercel-signature e de Drains).
 * `readEnvelope` ainda tem o caminho alternativo, caso algum runtime ignore isto.
 */
export const config = { api: { bodyParser: false } };

/** Headers que o transporte do SDK usa para pausar envio por categoria. */
const RATE_LIMIT_HEADERS = ['retry-after', 'x-sentry-rate-limits'];

/**
 * Status em que a ingestão recusa o envelope PARA SEMPRE: o projeto do DSN não
 * existe (404) ou a chave foi desativada (401/403). Reenviar não muda nada.
 *
 * Por que não repassar: medido em 18/11/2026 na produção, o DSN embutido no
 * bundle aponta para o projeto `4` do GlitchTip, que responde 404. Como o
 * handler devolvia `forwarded.status` cru, cada erro capturado virava um
 * `GET/POST /api/monitoring 404` no console do vendedor — o bug que o dono
 * reportou. O 404 não é do túnel (ele está no ar e repassa normalmente); é a
 * ingestão dizendo que o projeto não existe.
 *
 * Decisão: para esses status o túnel responde 202 (aceitei e descartei), para
 * o navegador parar de registrar falha a cada erro, e grava UMA linha no log da
 * função dizendo exatamente qual projeto foi recusado — a má configuração
 * continua visível para quem opera, em vez de virar ruído na tela de quem vende.
 */
const RECUSA_PERMANENTE = new Set([401, 403, 404]);

/** Evita repetir a mesma linha de log a cada envelope na mesma instância. */
const jaAvisado = new Set<string>();

interface TunnelRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  /**
   * `true` só depois que o evento `end` saiu, isto é, quando alguém REALMENTE
   * consumiu o stream. Não confundir com `complete` do `IncomingMessage`, que
   * diz apenas que a mensagem HTTP chegou inteira: com o corpo ainda no buffer,
   * `complete` é `true` e `readableEnded` é `false`. Usar `complete` aqui
   * descartava envelope válido com 400 (reproduzido em
   * tests/api/vercel-monitoring-tunnel.http.test.ts).
   */
  readableEnded?: boolean;
  body?: unknown;
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
 * Entrega o envelope bruto sem nunca ficar pendurada.
 *
 * Caminho normal (bodyParser desligado): lê o stream.
 * Caminho alternativo: se algo já consumiu o stream, usa o que deixou em
 * `req.body`; e se o stream acabou sem corpo nenhum, devolve `null` em vez de
 * esperar um evento que não vem mais.
 *
 * `ArrayBuffer.isView` em vez de `instanceof Uint8Array`: aceita `Buffer` (o que
 * a Vercel entrega) sem depender dos tipos do Node e não quebra quando o valor
 * vem de outro realm, onde `instanceof` dá falso e o corpo seria descartado.
 */
export async function readEnvelope(req: TunnelRequest): Promise<Uint8Array | null> {
  const prelido = req.body;
  if (ArrayBuffer.isView(prelido)) {
    return new Uint8Array(prelido.buffer, prelido.byteOffset, prelido.byteLength);
  }
  if (typeof prelido === 'string') return new TextEncoder().encode(prelido);
  if (req.readableEnded === true) return null;
  return readRawBody(req);
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

  let body: Uint8Array | null;
  try {
    body = await readEnvelope(req);
  } catch (err) {
    const tooLarge = err instanceof Error && err.message === 'envelope_too_large';
    res
      .status(tooLarge ? 413 : 400)
      .json({ error: tooLarge ? 'envelope_too_large' : 'bad_request' });
    return;
  }
  if (!body || body.byteLength === 0) {
    res.status(400).json({ error: 'envelope_vazio' });
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
    // GUARD: devolver o status original e os headers de limite. O transporte do
    // SDK decide pausar categoria por `429`/`Retry-After`/`X-Sentry-Rate-Limits`
    // — que também vêm em resposta 2xx. Traduzir tudo para 200/502 apagava essa
    // instrução e o navegador seguiria enviando durante a limitação, queimando
    // invocação de função e saturando a ingestão.
    for (const nome of RATE_LIMIT_HEADERS) {
      const valor = forwarded.headers.get(nome);
      if (valor) res.setHeader(nome, valor);
    }

    if (RECUSA_PERMANENTE.has(forwarded.status)) {
      if (!jaAvisado.has(upstream)) {
        jaAvisado.add(upstream);
        console.error('[monitoring] ingestao recusou o DSN de forma permanente', {
          upstream,
          status: forwarded.status,
        });
      }
      // GUARD: 202 é "aceitei e descartei", não "deu certo". O status real vai
      // no corpo e no header abaixo, para quem inspeciona a resposta.
      res.setHeader('X-Tunnel-Upstream-Status', String(forwarded.status));
      res.status(202).json({ ok: false, descartado: 'dsn_recusado_pela_ingestao' });
      return;
    }

    res.status(forwarded.status).json({ ok: forwarded.ok });
  } catch {
    res.status(502).json({ error: 'ingest_indisponivel' });
  }
}
