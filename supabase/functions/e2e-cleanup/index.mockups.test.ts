/**
 * Limpeza de mockups do `e2e-cleanup` (teste co-localizado, runner Vitest).
 *
 * Prova o criterio do cartao: com `dryRun:false`, a limpeza apaga as linhas de
 * `generated_mockups` do usuario de teste (filtradas por `user_id`) E os objetos
 * do bucket `mockup-assets` sob o prefixo `${userId}/` — e nada alem disso
 * (nenhuma tabela sem filtro do usuario, nenhum prefixo de outro usuario).
 * Com `dryRun` (default), apenas conta. Erro do storage vai para `errors` da
 * resposta, nunca engolido.
 *
 * O client Supabase e o REAL (npm `@supabase/supabase-js`); as fronteiras
 * Deno-only (`Deno.serve`/`Deno.env` e o cofre de credenciais) sao substitutas.
 * O `fetch` e interceptado: nenhuma chamada de rede acontece.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type EdgeHandler = (req: Request) => Response | Promise<Response>;

const TEST_USER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'e2e-mockups@example.test',
};
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';
const BUCKET = 'mockup-assets';
const TOKEN = 'cleanup-contract-token';
const SCOPED_QUOTE_ID = '33333333-3333-4333-8333-333333333333';
const SCOPED_PREFIX = '[E2E] 4242-1';

const creds = vi.hoisted(() => ({
  token: 'cleanup-contract-token' as string | undefined,
  allowedEmails: 'e2e-mockups@example.test' as string | undefined,
}));

// Fronteira Deno-only: o cofre de credenciais. Devolve os valores do cenario.
vi.mock('../_shared/credentials.ts', () => ({
  resolveCredential: async (name: string) => ({
    value:
      name === 'E2E_CLEANUP_TOKEN'
        ? creds.token
        : name === 'E2E_CLEANUP_ALLOWED_EMAILS'
          ? creds.allowedEmails
          : undefined,
  }),
}));

// O mesmo source Deno importa `@supabase/supabase-js` por URL esm.sh; aqui o
// runner Node usa o pacote npm REAL (mesma API) para que o request shape
// (PostgREST/Storage) seja o de producao.
vi.mock('https://esm.sh/@supabase/supabase-js@2.49.4', async () => {
  const real = await import('@supabase/supabase-js');
  return { createClient: real.createClient };
});

// `index.ts` registra o handler via `Deno.serve` e le env no carregamento.
const envMap = new Map<string, string>();
let handler: EdgeHandler | undefined;
(globalThis as unknown as { Deno: unknown }).Deno = {
  serve: (fn: EdgeHandler) => {
    handler = fn;
    return {};
  },
  env: {
    get: (key: string) => envMap.get(key),
    set: (key: string, value: string) => envMap.set(key, value),
    delete: (key: string) => envMap.delete(key),
  },
};

envMap.set('SUPABASE_URL', 'https://e2e-cleanup-contract.invalid');
envMap.set('SUPABASE_SERVICE_ROLE_KEY', 'service-role-contract-only');
envMap.set('E2E_CLEANUP_RATE_LIMIT_MAX', '30');
envMap.set('E2E_CLEANUP_RATE_LIMIT_WINDOW_SECONDS', '60');

await import('./index.ts');
expect(handler).toBeTypeOf('function');

// Export consumido pelo carregador em `tests/edge-functions/` (o include do
// Vitest cobre `tests/**`, nunca `supabase/functions/**`). Ele so pode ser
// `true` se o import acima tiver registrado o handler real via `Deno.serve`,
// provando que a suite carregou o codigo de producao — nao um stub.
export const mockupSuiteHandlerLoaded = typeof handler === 'function';

type Recorded = { method: string; pathname: string; query: string; body: string };
const recorded: Recorded[] = [];
const originalFetch = globalThis.fetch;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Objetos de storage por prefixo. O prefixo do OUTRO usuario existe para provar
// que a limpeza nunca o alcanca.
const STORAGE_OBJECTS: Record<string, Array<{ name: string; id: string }>> = {
  [`${TEST_USER.id}/logos`]: [{ name: '1700000000-logo.png', id: 'obj-logo-1' }],
  [`${TEST_USER.id}/mockups`]: [{ name: '1700000001-abcd.png', id: 'obj-mockup-1' }],
  [`${OTHER_USER_ID}/logos`]: [{ name: '1700000002-outro.png', id: 'obj-outro-1' }],
};

let storageListError: string | null = null;
let scopedQuoteDeleted = false;
let scopedQuoteDeleteError: string | null = null;
let userLookupPage = 1;
let rateLimitError: string | null = null;

async function contractFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const request = new Request(input, init);
  const url = new URL(request.url);
  const body =
    request.method === 'GET' || request.method === 'HEAD' ? '' : await request.clone().text();
  recorded.push({ method: request.method, pathname: url.pathname, query: url.search, body });

  if (url.pathname === '/auth/v1/admin/users') {
    const page = Number(url.searchParams.get('page') ?? '1');
    if (page === userLookupPage) {
      return json({ users: [{ id: TEST_USER.id, email: TEST_USER.email }] });
    }
    // Uma página cheia força o código de produção a continuar paginando.
    return json({
      users: Array.from({ length: 1000 }, (_, index) => ({
        id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
        email: `other-${page}-${index}@example.test`,
      })),
    });
  }
  if (url.pathname === '/rest/v1/rpc/e2e_cleanup_check_rate_limit') {
    if (rateLimitError) return json({ message: rateLimitError }, 500);
    return json({ allowed: true });
  }
  if (url.pathname === '/rest/v1/e2e_cleanup_audit') {
    return json({ id: '00000000-0000-4000-8000-000000000045' }, 201);
  }
  if (url.pathname === `/storage/v1/object/list/${BUCKET}`) {
    if (storageListError) return json({ message: storageListError }, 500);
    const { prefix } = JSON.parse(body || '{}') as { prefix?: string };
    return json(STORAGE_OBJECTS[prefix ?? ''] ?? []);
  }
  if (url.pathname === `/storage/v1/object/${BUCKET}`) {
    return json([]);
  }
  if (
    url.pathname === '/rest/v1/quotes' &&
    request.method === 'DELETE' &&
    url.searchParams.has('client_name')
  ) {
    if (scopedQuoteDeleteError) return json({ message: scopedQuoteDeleteError }, 500);
    scopedQuoteDeleted = true;
    return new Response(null, { status: 204, headers: { 'Content-Range': '0-0/1' } });
  }
  if (url.pathname === '/rest/v1/quotes' && url.searchParams.has('client_name')) {
    const rows = scopedQuoteDeleted ? [] : [{ id: SCOPED_QUOTE_ID }];
    const contentRange = rows.length > 0 ? '0-0/1' : '*/0';
    return new Response(request.method === 'HEAD' ? null : JSON.stringify(rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Content-Range': contentRange },
    });
  }
  if (url.pathname === '/rest/v1/quotes' && request.method === 'GET') {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Content-Range': '*/0' },
    });
  }
  if (url.pathname.startsWith('/rest/v1/')) {
    return request.method === 'DELETE'
      ? new Response(null, { status: 204, headers: { 'Content-Range': '0-0/1' } })
      : new Response(null, { status: 200, headers: { 'Content-Range': '0-0/2' } });
  }
  return json({ error: 'unexpected_local_request', pathname: url.pathname }, 500);
}

function cleanupRequest(body: Record<string, unknown>): Request {
  return new Request('https://edge-contract.invalid/functions/v1/e2e-cleanup', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-e2e-cleanup-token': TOKEN,
      'x-forwarded-for': '192.0.2.45',
    },
    body: JSON.stringify(body),
  });
}

const listCalls = () => recorded.filter((r) => r.pathname === `/storage/v1/object/list/${BUCKET}`);
const restDeletes = () =>
  recorded.filter((r) => r.method === 'DELETE' && r.pathname.startsWith('/rest/v1/'));
const storageDeletes = () =>
  recorded.filter((r) => r.method === 'DELETE' && r.pathname === `/storage/v1/object/${BUCKET}`);

type CleanupBody = {
  ok: boolean;
  dryRun: boolean;
  deleted: Record<string, number>;
  errors?: Record<string, string>;
  cleanupProtocol?: string;
  scope?: { mode: string; nameFilterPrefix?: string; sellerId: string };
};

beforeEach(() => {
  creds.token = TOKEN;
  creds.allowedEmails = TEST_USER.email;
  storageListError = null;
  scopedQuoteDeleted = false;
  scopedQuoteDeleteError = null;
  userLookupPage = 1;
  rateLimitError = null;
  recorded.length = 0;
  globalThis.fetch = contractFetch as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('e2e-cleanup — limpeza de mockups', () => {
  it('apaga generated_mockups e os objetos do prefixo do usuario de teste, e nada alem disso', async () => {
    const res = await handler!(cleanupRequest({ email: TEST_USER.email, dryRun: false }));
    const body = (await res.json()) as CleanupBody;

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(false);

    // 1. Linha do historico de mockups removida, filtrada pelo user_id resolvido.
    const mockupDeletes = restDeletes().filter((r) => r.pathname === '/rest/v1/generated_mockups');
    expect(mockupDeletes).toHaveLength(1);
    expect(mockupDeletes[0].query).toContain(`user_id=eq.${TEST_USER.id}`);

    // 2. Todo DELETE de tabela e escopado ao usuario — nunca um DELETE amplo.
    for (const del of restDeletes()) {
      expect(del.query).toMatch(/(user_id|seller_id)=eq\./);
    }

    // 3. Lista APENAS as duas subpastas do usuario de teste.
    expect(
      listCalls()
        .map((c) => (JSON.parse(c.body) as { prefix: string }).prefix)
        .sort(),
    ).toEqual([`${TEST_USER.id}/logos`, `${TEST_USER.id}/mockups`]);

    // 4. Remove exatamente os objetos listados, todos sob `${userId}/`.
    const removes = storageDeletes();
    expect(removes).toHaveLength(1);
    const prefixes = (JSON.parse(removes[0].body) as { prefixes: string[] }).prefixes;
    expect(prefixes.sort()).toEqual([
      `${TEST_USER.id}/logos/1700000000-logo.png`,
      `${TEST_USER.id}/mockups/1700000001-abcd.png`,
    ]);
    expect(prefixes.every((p) => p.startsWith(`${TEST_USER.id}/`))).toBe(true);

    // 5. Nenhuma requisicao toca o prefixo de outro usuario e o total e reportado.
    expect(recorded.some((r) => r.body.includes(OTHER_USER_ID))).toBe(false);
    expect(body.deleted['storage:mockup-assets']).toBe(2);
    expect(body.deleted['generated_mockups']).toBe(1);
  });

  it('dryRun conta os mockups do usuario sem apagar linhas nem objetos', async () => {
    const res = await handler!(cleanupRequest({ email: TEST_USER.email }));
    const body = (await res.json()) as CleanupBody;

    expect(body.dryRun).toBe(true);
    expect(restDeletes()).toHaveLength(0);
    expect(storageDeletes()).toHaveLength(0);
    expect(body.deleted['generated_mockups']).toBe(2);
    expect(body.deleted['storage:mockup-assets']).toBe(2);
  });

  it('erro de listagem do storage vira `errors` na resposta e nao tenta remover', async () => {
    storageListError = 'storage offline';
    const res = await handler!(cleanupRequest({ email: TEST_USER.email, dryRun: false }));
    const body = (await res.json()) as CleanupBody;

    expect(res.status).toBe(500);
    expect(body.ok).toBe(false);
    expect(body.errors).toMatchObject({
      [`storage:${BUCKET}/logos`]: 'storage offline',
      [`storage:${BUCKET}/mockups`]: 'storage offline',
    });
    expect(storageDeletes()).toHaveLength(0);
    // O banco ainda foi limpo apesar da falha do storage.
    expect(restDeletes().some((r) => r.pathname === '/rest/v1/generated_mockups')).toBe(true);
  });
});

describe('e2e-cleanup — escopo de quotes por prefixo', () => {
  it('falha fechado quando o rate limiter não responde', async () => {
    rateLimitError = 'rpc unavailable';
    const res = await handler!(
      cleanupRequest({
        email: TEST_USER.email,
        dryRun: false,
        nameFilterPrefix: SCOPED_PREFIX,
      }),
    );

    expect(res.status).toBe(503);
    expect(restDeletes()).toHaveLength(0);
  });

  it('encontra o email allowlisted depois da primeira página de usuários', async () => {
    userLookupPage = 2;
    const res = await handler!(
      cleanupRequest({
        email: TEST_USER.email,
        dryRun: true,
        nameFilterPrefix: SCOPED_PREFIX,
      }),
    );

    expect(res.status).toBe(200);
    expect(recorded.filter((call) => call.pathname === '/auth/v1/admin/users')).toHaveLength(2);
  });

  it('apaga somente quotes/items do prefixo e confirma zero remanescentes', async () => {
    const res = await handler!(
      cleanupRequest({
        email: TEST_USER.email,
        dryRun: false,
        nameFilterPrefix: SCOPED_PREFIX,
      }),
    );
    const body = (await res.json()) as CleanupBody;

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      dryRun: false,
      deleted: { quotes: 1, quote_items: 2 },
      cleanupProtocol: 'quotes-prefix-v2',
      scope: { mode: 'quotes-prefix', nameFilterPrefix: SCOPED_PREFIX },
    });
    expect(listCalls()).toHaveLength(0);
    expect(storageDeletes()).toHaveLength(0);

    const quoteLookup = recorded.find(
      (call) =>
        call.method === 'GET' &&
        call.pathname === '/rest/v1/quotes' &&
        call.query.includes('client_name='),
    );
    expect(quoteLookup?.query).toContain(`seller_id=eq.${TEST_USER.id}`);
    expect(new URLSearchParams(quoteLookup?.query ?? '').get('client_name')).toBe(
      `like.${SCOPED_PREFIX}%`,
    );

    const deletes = restDeletes();
    expect(deletes.map((call) => call.pathname)).toEqual(['/rest/v1/quotes']);
    expect(new URLSearchParams(deletes[0].query).get('client_name')).toBe(`like.${SCOPED_PREFIX}%`);
  });

  it('rejeita prefixo não canônico antes de qualquer DELETE', async () => {
    const res = await handler!(
      cleanupRequest({
        email: TEST_USER.email,
        dryRun: false,
        nameFilterPrefix: 'qualquer-coisa%',
      }),
    );

    expect(res.status).toBe(400);
    expect(restDeletes()).toHaveLength(0);
  });

  it('propaga erro de DELETE e falha quando a verificação encontra resíduo', async () => {
    scopedQuoteDeleteError = 'delete blocked';
    const res = await handler!(
      cleanupRequest({
        email: TEST_USER.email,
        dryRun: false,
        nameFilterPrefix: SCOPED_PREFIX,
      }),
    );
    const body = (await res.json()) as CleanupBody;

    expect(res.status).toBe(500);
    expect(body.ok).toBe(false);
    expect(body.errors).toMatchObject({
      quotes: 'delete blocked',
      quotes_verify: '1 quote(s) permaneceram após o cleanup',
    });
  });

  it('rejeita sellerId explícito divergente do email allowlisted', async () => {
    const res = await handler!(
      cleanupRequest({
        email: TEST_USER.email,
        dryRun: false,
        sellerScope: 'explicit',
        sellerId: OTHER_USER_ID,
        nameFilterPrefix: SCOPED_PREFIX,
      }),
    );

    expect(res.status).toBe(403);
    expect(restDeletes()).toHaveLength(0);
  });
});
