/**
 * Contrato da edge `mockup-assistant` (teste co-localizado). Prova: sem JWT →
 * 401; corpo inválido → 422; 21ª mensagem no minuto → 429; roteador sem
 * override de modelo (o flash vem da ROTA) e só texto; erro do provedor →
 * mensagem genérica; log nunca contém o texto do usuário. Fronteiras Deno-only
 * são mockadas; a validação Zod é a REAL.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EDGE_AUTHZ_MANIFEST } from '../_shared/edge-authz-manifest.ts';

type CapturedAiCall = { functionName: string; userId: string; requestId?: string; request: Record<string, unknown> };

const h = vi.hoisted(() => ({
  authThrow: null as null | { status: number; message: string },
  userId: 'user-1',
  rateCounts: new Map<string, number>(),
  rateIds: [] as string[],
  rateLimiterUsed: null as unknown,
  aiCalls: [] as CapturedAiCall[],
  aiResult: { content: 'Posicione a logo a 8 cm da gola.', used_model_name: 'deepseek-flash' },
  aiError: null as null | Error,
  served: null as null | ((req: Request) => Promise<Response>),
}));

vi.mock('../_shared/auth.ts', () => ({
  authenticateRequest: async () => {
    if (h.authThrow) throw h.authThrow;
    return { userId: h.userId, userRole: 'vendedor', userRoles: ['vendedor'], localServiceClient: {} };
  },
  requireRole: () => undefined,
}));

vi.mock('../_shared/rate-limiter.ts', () => {
  const aiLimiter = { maxRequests: 20, windowMs: 60_000, keyPrefix: 'ai' };
  return {
    rateLimiters: { ai: aiLimiter },
    applyRateLimit: async (req: Request, limiter: unknown, getIdentifier: (r: Request) => string) => {
      h.rateLimiterUsed = limiter;
      const identifier = getIdentifier(req);
      h.rateIds.push(identifier);
      const used = (h.rateCounts.get(identifier) ?? 0) + 1;
      h.rateCounts.set(identifier, used);
      if (used > 20) {
        return new Response(JSON.stringify({ error: 'Too Many Requests' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
        });
      }
      return null;
    },
  };
});

vi.mock('../_shared/ai-router/index.ts', () => ({
  callAiForFunction: async (opts: unknown) => {
    h.aiCalls.push(opts as CapturedAiCall);
    if (h.aiError) throw h.aiError;
    return { ...h.aiResult, usage: { input_tokens: 10, output_tokens: 20 }, raw: null };
  },
}));

// A edge registra o handler via `Deno.serve`; o runner Node não tem `Deno`.
const denoGlobal = globalThis as unknown as { Deno?: { serve: (fn: (req: Request) => Promise<Response>) => unknown } };
denoGlobal.Deno = {
  serve: (fn) => {
    h.served = fn;
    return {};
  },
};

const mod = await import('./index.ts');
const { rateLimiters } = await import('../_shared/rate-limiter.ts');

const ENTRY = h.served ?? mod.serveMockupAssistant;
const AUTH_HEADER: Record<string, string> = { Authorization: 'Bearer test.jwt.token' };

function post(body: unknown, headers: Record<string, string> = AUTH_HEADER): Request {
  return new Request('https://edge.test/functions/v1/mockup-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function captureConsole() {
  const spies = (['log', 'warn', 'error', 'info'] as const).map((method) =>
    vi.spyOn(console, method).mockImplementation(() => undefined),
  );
  return {
    restore: () => spies.forEach((spy) => spy.mockRestore()),
    text: () =>
      spies
        .flatMap((spy) => spy.mock.calls)
        .flat()
        .map((part) => (typeof part === 'string' ? part : JSON.stringify(part)))
        .join('\n'),
  };
}

beforeEach(() => {
  h.authThrow = null;
  h.rateCounts.clear();
  h.rateIds.length = 0;
  h.rateLimiterUsed = null;
  h.aiCalls.length = 0;
  h.aiError = null;
  h.aiResult = { content: 'Posicione a logo a 8 cm da gola.', used_model_name: 'deepseek-flash' };
});

describe('mockup-assistant — contrato da edge', () => {
  it('sem JWT retorna 401 e não chama a IA', async () => {
    h.authThrow = { status: 401, message: 'Token de autenticação ausente' };
    const res = await ENTRY(post({ message: 'Como posiciono a logo?' }, {}));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Token de autenticação ausente');
    expect(h.aiCalls).toHaveLength(0);
  });

  it('corpo inválido é rejeitado pelo Zod com 422', async () => {
    const invalidos = [{}, { message: '' }, { message: 'ok', history: [{ role: 'x', content: 'y' }] }];
    for (const body of invalidos) {
      const res = await ENTRY(post(body));
      expect(res.status).toBe(422);
      expect((await res.json()).code).toBe('VALIDATION_FAILED');
    }
    // JSON malformado → 400 (não 422) e igualmente sem chamada de IA.
    const bad = await ENTRY(post('{nao-e-json'));
    expect(bad.status).toBe(400);
    expect(h.aiCalls).toHaveLength(0);
  });

  it('a 21ª mensagem no minuto retorna 429 (limite de 20/min por usuário)', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 21; i += 1) {
      statuses.push((await ENTRY(post({ message: `pergunta ${i + 1}` }))).status);
    }
    expect(statuses.slice(0, 20).every((status) => status === 200)).toBe(true);
    expect(statuses[20]).toBe(429);

    // O limite é delegado ao limiter SSOT de IA (20 req/min) pelo id do usuário.
    expect(h.rateLimiterUsed).toBe(rateLimiters.ai);
    expect(rateLimiters.ai.maxRequests).toBe(20);
    expect(h.rateIds.every((id) => id === h.userId)).toBe(true);

    const limited = await ENTRY(post({ message: 'pergunta 22' }));
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
  });

  it('usa o roteador (rota flash), sem override de modelo e sem imagem', async () => {
    const res = await ENTRY(
      post({
        message: 'Qual o tamanho ideal da logo?',
        context: { productName: 'Camiseta', techniqueName: 'Serigrafia', dimensions: '20x20cm', hasLogo: true },
      }),
    );

    expect(res.status).toBe(200);
    expect(h.aiCalls).toHaveLength(1);
    const call = h.aiCalls[0];
    expect(call.functionName).toBe('mockup-assistant');
    expect(call.userId).toBe('user-1');
    // O modelo é decisão da ROTA (DeepSeek Flash), nunca fixada neste código.
    expect(call.request).not.toHaveProperty('model');
    expect(call.request.modalities).toEqual(['text']);

    const messages = call.request.messages as Array<{ role: string; content: string }>;
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toContain('Camiseta');
    expect(messages[messages.length - 1]).toEqual({ role: 'user', content: 'Qual o tamanho ideal da logo?' });
    expect((await res.json()).answer).toBe('Posicione a logo a 8 cm da gola.');
  });

  it('erro do provedor devolve mensagem genérica e log sem o texto do usuário', async () => {
    const segredo = 'CANETA-AZUL-DO-CLIENTE-XYZ';
    h.aiError = new Error(`upstream 500 ao processar o prompt: ${segredo}`);

    const consoleSpy = captureConsole();
    let res: Response;
    let logged = '';
    try {
      res = await ENTRY(post({ message: `Quero gravar ${segredo} na caneca` }));
      logged = consoleSpy.text();
    } finally {
      consoleSpy.restore();
    }

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe(mod.PROVIDER_ERROR_MESSAGE);
    expect(JSON.stringify(body)).not.toContain('upstream 500');
    expect(logged).toContain('provider_error');
    expect(logged).not.toContain(segredo);
    expect(logged).not.toContain('Quero gravar');
  });

  it('no caminho de sucesso o log não contém o texto do usuário', async () => {
    const segredo = 'GRAVACAO-LASER-CONFIDENCIAL-ABC';
    const consoleSpy = captureConsole();
    let logged = '';
    try {
      const res = await ENTRY(post({ message: `Como fica ${segredo} na lateral?` }));
      logged = consoleSpy.text();
      expect(res.status).toBe(200);
    } finally {
      consoleSpy.restore();
    }

    expect(logged).toContain('mockup-assistant');
    expect(logged).not.toContain(segredo);
    expect(logged).not.toContain('Como fica');
  });

  it('o código da edge não fixa nenhum modelo Pro', () => {
    const src = readFileSync(resolve(process.cwd(), 'supabase/functions/mockup-assistant/index.ts'), 'utf8');
    expect(src).not.toMatch(/deepseek[\s_-]*pro/i);
    // Nenhum override de modelo hardcoded no request do roteador.
    expect(src).not.toMatch(/model:\s*['"]/);
  });

  it('está declarada no manifest SSOT de autorização como edge autenticada', () => {
    expect(EDGE_AUTHZ_MANIFEST['mockup-assistant']?.category).toBe('authenticated');
  });
});
