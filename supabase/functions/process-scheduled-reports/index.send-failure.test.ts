/**
 * `process-scheduled-reports` — o status tem que refletir a resposta real do Resend.
 *
 * Prova o critério: quando o provedor recusa o e-mail (ou a chave não existe), o
 * relatório NÃO recebe `last_sent_at`/`next_run_at` (não é marcado como enviado),
 * o resultado volta `status: "error"` com o motivo, e o motivo é registrado no log.
 * Quando o Resend aceita, o relatório é marcado normalmente.
 *
 * Fronteiras Deno-only (`Deno.serve`/`Deno.env`, cofre de credenciais e auth de
 * cron) são substitutas; o client Supabase é o REAL (npm `@supabase/supabase-js`),
 * então o request shape PostgREST é o de produção. O `fetch` é interceptado:
 * nenhuma chamada de rede acontece.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type EdgeHandler = (req: Request) => Response | Promise<Response>;

const REPORT_ID = '44444444-4444-4444-8444-444444444444';

const creds = vi.hoisted(() => ({ resendKey: 'rsnd_test_key' as string | undefined }));

// Fronteira Deno-only: cofre de credenciais.
vi.mock('../_shared/credentials.ts', () => ({
  resolveCredential: async (name: string) => ({
    value: name === 'RESEND_API_KEY' ? creds.resendKey : undefined,
  }),
}));

// Fronteira Deno-only: autorização do cron (lê secret do vault via RPC).
vi.mock('../_shared/dispatcher-auth.ts', () => ({
  authorizeCron: async () => ({ ok: true, mode: 'secret' }),
}));

// O mesmo source Deno importa `@supabase/supabase-js` pelo especificador npm:;
// aqui o runner Node usa o pacote REAL (mesma API).
vi.mock('npm:@supabase/supabase-js@2.49.4', async () => {
  const real = await import('@supabase/supabase-js');
  return { createClient: real.createClient };
});

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

envMap.set('SUPABASE_URL', 'https://scheduled-reports-contract.invalid');
envMap.set('SUPABASE_SERVICE_ROLE_KEY', 'service-role-contract-only');

await import('./index.ts');
expect(handler).toBeTypeOf('function');

// Consumido pelo shim em `tests/edge-functions/` (o include do Vitest cobre
// `tests/**`, nunca `supabase/functions/**`). Só pode ser `true` se o import
// acima tiver registrado o handler real via `Deno.serve`.
export const sendFailureHandlerLoaded = typeof handler === 'function';

type Recorded = { method: string; url: string; pathname: string; query: string; body: string };
const recorded: Recorded[] = [];
const originalFetch = globalThis.fetch;

let resendStatus = 200;
let resendBody = '{"id":"email-1"}';

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

async function contractFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const request = new Request(input, init);
  const url = new URL(request.url);
  const body =
    request.method === 'GET' || request.method === 'HEAD' ? '' : await request.clone().text();
  recorded.push({
    method: request.method,
    url: request.url,
    pathname: url.pathname,
    query: url.search,
    body,
  });

  if (url.host === 'api.resend.com') {
    return new Response(resendBody, {
      status: resendStatus,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (url.pathname === '/rest/v1/scheduled_reports' && request.method === 'GET') {
    return json(
      [
        {
          id: REPORT_ID,
          report_name: 'Orçamentos da semana',
          report_type: 'sales',
          frequency: 'weekly',
          email_to: 'dono@example.test',
          filters: null,
          is_active: true,
          next_run_at: '2020-01-01T08:00:00.000Z',
        },
      ],
      200,
      { 'Content-Range': '0-0/1' },
    );
  }
  if (url.pathname === '/rest/v1/scheduled_reports' && request.method === 'PATCH') {
    return new Response(null, { status: 204, headers: { 'Content-Range': '0-0/1' } });
  }
  if (url.pathname === '/rest/v1/quotes') {
    return json(
      [
        {
          id: '55555555-5555-4555-8555-555555555555',
          quote_number: 'ORC-1',
          status: 'approved',
          total: 1200,
          created_at: '2020-01-01T00:00:00.000Z',
          client_name: 'Cliente',
          client_company: 'Empresa',
        },
      ],
      200,
      { 'Content-Range': '0-0/1' },
    );
  }
  return json({ error: 'unexpected_local_request', pathname: url.pathname }, 500);
}

function cronRequest(): Request {
  return new Request('https://edge-contract.invalid/functions/v1/process-scheduled-reports', {
    method: 'POST',
    headers: { 'x-cron-secret': 'cron-contract-secret' },
  });
}

const resendCalls = () => recorded.filter((r) => r.url.startsWith('https://api.resend.com/'));
const reportPatches = () =>
  recorded.filter((r) => r.method === 'PATCH' && r.pathname === '/rest/v1/scheduled_reports');

type ProcessBody = {
  processed: number;
  results: Array<{ id: string; status: string; email?: string; error?: string }>;
};

let errorLog: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  creds.resendKey = 'rsnd_test_key';
  resendStatus = 200;
  resendBody = '{"id":"email-1"}';
  recorded.length = 0;
  globalThis.fetch = contractFetch as typeof fetch;
  errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  errorLog.mockRestore();
});

describe('process-scheduled-reports — status reflete a resposta do Resend', () => {
  it('recusa do provedor: não marca como enviado e registra o motivo', async () => {
    resendStatus = 422;
    resendBody = JSON.stringify({ message: 'The promobrindes.com.br domain is not verified' });

    const res = await handler!(cronRequest());
    const body = (await res.json()) as ProcessBody;

    // 1. O envio foi tentado de verdade.
    expect(resendCalls()).toHaveLength(1);

    // 2. O relatório NÃO foi marcado como enviado (nenhum PATCH com last_sent_at).
    expect(reportPatches()).toEqual([]);

    // 3. O resultado diz erro, com o status e o motivo do provedor.
    expect(body.results).toHaveLength(1);
    expect(body.results[0].id).toBe(REPORT_ID);
    expect(body.results[0].status).toBe('error');
    expect(body.results[0].error).toContain('Resend 422');
    expect(body.results[0].error).toContain('domain is not verified');

    // 4. O motivo ficou registrado no log.
    expect(errorLog).toHaveBeenCalled();
    expect(JSON.stringify(errorLog.mock.calls)).toContain('Resend 422');
  });

  it('sem RESEND_API_KEY: não chama o provedor nem marca como enviado', async () => {
    creds.resendKey = undefined;

    const res = await handler!(cronRequest());
    const body = (await res.json()) as ProcessBody;

    expect(resendCalls()).toEqual([]);
    expect(reportPatches()).toEqual([]);
    expect(body.results[0].status).toBe('error');
    expect(body.results[0].error).toContain('RESEND_API_KEY');
  });

  it('provedor aceita: marca last_sent_at e devolve sent', async () => {
    const res = await handler!(cronRequest());
    const body = (await res.json()) as ProcessBody;

    expect(resendCalls()).toHaveLength(1);
    const patches = reportPatches();
    expect(patches).toHaveLength(1);
    expect(patches[0].query).toContain(`id=eq.${REPORT_ID}`);
    expect(JSON.parse(patches[0].body)).toMatchObject({
      last_sent_at: expect.any(String),
      next_run_at: expect.any(String),
    });
    expect(body.results[0].status).toBe('sent');
    expect(errorLog).not.toHaveBeenCalled();
  });
});
