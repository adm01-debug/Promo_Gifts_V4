/**
 * Caracterizacao local do handler REAL de bitrix-sync.
 *
 * O modulo registra o handler apenas por Deno.serve. Este teste o intercepta
 * e simula Auth, PostgREST e Bitrix em memoria via fetch. Nao chama o Bitrix,
 * nao usa credenciais reais e nao grava no Supabase.
 *
 * O objetivo e congelar o contrato observado por grupo de acao e garantir que
 * `sync_full` nunca reporte sucesso quando o upsert local falhar.
 *
 * Rodar:
 * deno test --allow-env --allow-net supabase/functions/bitrix-sync/handler_characterization_test.ts
 */

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals<T>(actual: T, expected: T, message?: string): void {
  if (!Object.is(actual, expected)) {
    throw new Error(
      message ??
        `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

function assertJsonEquals(
  actual: unknown,
  expected: unknown,
  message?: string,
): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(message ?? `Expected ${expectedJson}, got ${actualJson}`);
  }
}

type EdgeHandler = (request: Request) => Response | Promise<Response>;

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SUPABASE_URL = "https://bitrix-contract-supabase.invalid";
const BITRIX_WEBHOOK_URL =
  "https://bitrix-contract-upstream.invalid/rest/42/test";
const ENV_NAMES = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "BITRIX24_WEBHOOK_URL",
  "LOG_CREDENTIAL_RESOLUTION",
] as const;
const originalEnv = new Map(
  ENV_NAMES.map((name) => [name, Deno.env.get(name)] as const),
);

// authorize.ts le as tres primeiras variaveis no carregamento do modulo.
Deno.env.set("SUPABASE_URL", SUPABASE_URL);
Deno.env.set("SUPABASE_ANON_KEY", "anon-key-contract-only");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-key-contract-only");
Deno.env.set("BITRIX24_WEBHOOK_URL", BITRIX_WEBHOOK_URL);
Deno.env.set("LOG_CREDENTIAL_RESOLUTION", "off");

let handler: EdgeHandler | undefined;
const serveDescriptor = Object.getOwnPropertyDescriptor(Deno, "serve");
Object.defineProperty(Deno, "serve", {
  configurable: true,
  writable: true,
  value: (candidate: EdgeHandler) => {
    handler = candidate;
    return {};
  },
});

try {
  await import("./index.ts");
} finally {
  if (serveDescriptor) Object.defineProperty(Deno, "serve", serveDescriptor);
}

assert(handler, "index.ts deve registrar um callback em Deno.serve");

type CapturedRequest = {
  host: string;
  method: string;
  pathname: string;
  query: URLSearchParams;
  body: string;
};

const originalFetch = globalThis.fetch;
const captured: CapturedRequest[] = [];
let bitrixClientsUpsertFails = false;

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function capture(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<CapturedRequest> {
  const request = new Request(input, init);
  const url = new URL(request.url);
  return request.clone().text().then((body) => {
    const entry = {
      host: url.host,
      method: request.method,
      pathname: url.pathname,
      query: url.searchParams,
      body,
    };
    captured.push(entry);
    return entry;
  });
}

async function localFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const request = await capture(input, init);

  // Auth + authorization chain actually used by authorize().
  if (request.host === "bitrix-contract-supabase.invalid") {
    if (request.pathname === "/auth/v1/user") {
      return json({
        id: USER_ID,
        email: "supervisor@example.test",
        role: "authenticated",
      });
    }
    if (request.pathname === "/rest/v1/user_roles") {
      return json([{ role: "supervisor" }]);
    }
    if (request.pathname === "/rest/v1/rpc/has_role") return json(true);
    // resolveCredential() first asks the DB. Empty result forces its documented
    // legacy/environment fallback, whose value is a synthetic upstream URL.
    if (request.pathname === "/rest/v1/integration_credentials") {
      return json([]);
    }

    if (request.pathname === "/rest/v1/bitrix_clients") {
      if (request.method === "POST") {
        if (bitrixClientsUpsertFails) {
          return json({
            code: "PGRST205",
            message:
              "Could not find the table 'public.bitrix_clients' in the schema cache",
          }, 404);
        }
        return json([], 201);
      }
      return json([{
        id: "client-local-1",
        bitrix_id: 100,
        name: "Cliente local",
      }]);
    }
    if (request.pathname === "/rest/v1/bitrix_deals") {
      return json([{
        id: "deal-local-1",
        bitrix_id: 200,
        title: "Deal local",
      }]);
    }
    if (request.pathname === "/rest/v1/sync_logs") {
      return json([{
        id: "log-local-1",
        created_at: "2026-08-26T12:00:00.000Z",
      }]);
    }
  }

  // O unico host externo permitido pelo teste. Nenhuma chamada sai do processo.
  if (request.host === "bitrix-contract-upstream.invalid") {
    if (request.pathname.endsWith("/crm.company.list")) {
      return json({
        result: [{ ID: "100", TITLE: "Acme", EMAIL: [], PHONE: [] }],
        next: 50,
      });
    }
    if (request.pathname.endsWith("/crm.company.get")) {
      return json({ result: { ID: "101", TITLE: "Empresa" } });
    }
    if (request.pathname.endsWith("/crm.deal.list")) {
      return json({ result: [{ ID: "200", TITLE: "Deal" }], next: 25 });
    }
    if (request.pathname.endsWith("/crm.deal.productrows.get")) {
      return json({ result: [{ PRODUCT_ID: "300" }] });
    }
    if (request.pathname.endsWith("/crm.deal.add")) {
      return json({ result: 201 });
    }
    if (request.pathname.endsWith("/crm.deal.update")) {
      return json({ result: true });
    }
  }

  return json(
    { error: "unexpected_local_request", pathname: request.pathname },
    500,
  );
}

function requestFor(action: string, data?: Record<string, unknown>): Request {
  return new Request("https://edge-contract.invalid/functions/v1/bitrix-sync", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer opaque-contract-token",
    },
    body: JSON.stringify({ action, ...(data === undefined ? {} : { data }) }),
  });
}

async function invoke(
  action: string,
  data?: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await handler!(requestFor(action, data));
  const text = await response.text();
  return {
    status: response.status,
    body: JSON.parse(text) as Record<string, unknown>,
  };
}

function lastExternalRequest(): CapturedRequest {
  const request = [...captured].reverse().find((entry) =>
    entry.host === "bitrix-contract-upstream.invalid"
  );
  assert(request, "a acao deveria chamar o upstream Bitrix sintético");
  return request;
}

function lastDatabaseRequest(pathname: string): CapturedRequest {
  const request = [...captured].reverse().find((entry) => (
    entry.host === "bitrix-contract-supabase.invalid" &&
    entry.pathname === pathname
  ));
  assert(request, `a acao deveria consultar ${pathname}`);
  return request;
}

Deno.test({
  name:
    "bitrix-sync handler real: API direta, sync_full, leituras armazenadas e logs",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    globalThis.fetch = localFetch as typeof fetch;

    try {
      // API direta: todos os sete contratos chamam o endpoint Bitrix esperado
      // e preservam o envelope { success: true, data: ... } do handler.
      const directCases: Array<{
        action: string;
        data?: Record<string, unknown>;
        suffix: string;
        expectedBody: unknown;
      }> = [
        {
          action: "get_companies",
          data: { filter: { ACTIVE: "Y" }, start: 42 },
          suffix: "/crm.company.list",
          expectedBody: {
            select: ["ID", "TITLE", "LOGO", "EMAIL", "PHONE", "ADDRESS"],
            filter: { ACTIVE: "Y" },
            start: 42,
          },
        },
        {
          action: "get_company",
          data: { id: 101 },
          suffix: "/crm.company.get",
          expectedBody: { id: 101 },
        },
        {
          action: "search_companies",
          data: { query: "Acme" },
          suffix: "/crm.company.list",
          expectedBody: {
            select: ["ID", "TITLE", "EMAIL", "PHONE"],
            filter: { "%TITLE": "Acme" },
            start: 0,
          },
        },
        {
          action: "get_deals",
          data: { filter: { STAGE_ID: "NEW" }, start: 25 },
          suffix: "/crm.deal.list",
          expectedBody: {
            select: [
              "ID",
              "TITLE",
              "COMPANY_ID",
              "STAGE_ID",
              "OPPORTUNITY",
              "CURRENCY_ID",
              "DATE_CREATE",
              "CLOSEDATE",
              "ASSIGNED_BY_ID",
            ],
            filter: { STAGE_ID: "NEW" },
            start: 25,
          },
        },
        {
          action: "get_deal_products",
          data: { deal_id: 200 },
          suffix: "/crm.deal.productrows.get",
          expectedBody: { id: 200 },
        },
        {
          action: "create_deal",
          data: { deal: { TITLE: "Deal de teste", COMPANY_ID: 101 } },
          suffix: "/crm.deal.add",
          expectedBody: { fields: { TITLE: "Deal de teste", COMPANY_ID: 101 } },
        },
        {
          action: "update_deal",
          data: { id: 200, fields: { TITLE: "Deal atualizado" } },
          suffix: "/crm.deal.update",
          expectedBody: { id: 200, fields: { TITLE: "Deal atualizado" } },
        },
      ];

      for (const testCase of directCases) {
        captured.length = 0;
        const outcome = await invoke(testCase.action, testCase.data);
        assertEquals(
          outcome.status,
          200,
          `${testCase.action} deve responder 200 no upstream saudável`,
        );
        assertEquals(
          outcome.body.success,
          true,
          `${testCase.action} deve manter o envelope de sucesso`,
        );
        const outgoing = lastExternalRequest();
        assert(
          outgoing.pathname.endsWith(testCase.suffix),
          `${testCase.action}: endpoint inesperado ${outgoing.pathname}`,
        );
        assertEquals(
          outgoing.method,
          "POST",
          `${testCase.action}: Bitrix usa POST`,
        );
        assertJsonEquals(
          JSON.parse(outgoing.body),
          testCase.expectedBody,
          `${testCase.action}: payload Bitrix divergente`,
        );
      }

      // sync_full: somente empresas da primeira pagina sao buscadas. Uma falha
      // de storage deve interromper o fluxo e jamais produzir success:true.
      bitrixClientsUpsertFails = true;
      captured.length = 0;
      const syncOutcome = await invoke("sync_full");
      assertEquals(syncOutcome.status, 500);
      assertEquals(syncOutcome.body.success, undefined);
      assertEquals(syncOutcome.body.error, "Failed to persist Bitrix clients");
      const syncExternal = lastExternalRequest();
      assertJsonEquals(JSON.parse(syncExternal.body), {
        select: ["ID", "TITLE", "EMAIL", "PHONE"],
        start: 0,
      });
      const syncWrite = lastDatabaseRequest("/rest/v1/bitrix_clients");
      assertEquals(syncWrite.method, "POST");
      assertEquals(syncWrite.query.get("on_conflict"), "bitrix_id");

      bitrixClientsUpsertFails = false;
      captured.length = 0;
      const successfulSync = await invoke("sync_full");
      assertEquals(successfulSync.status, 200);
      assertEquals(successfulSync.body.success, true);
      assertEquals(
        (successfulSync.body.data as Record<string, unknown>).synced,
        1,
      );

      // Leitura armazenada: sao duas tabelas distintas, ambas limitadas a 100.
      captured.length = 0;
      const clientsOutcome = await invoke("get_stored_clients");
      assertEquals(clientsOutcome.status, 200);
      assertEquals(clientsOutcome.body.success, true);
      assert(
        Array.isArray(
          (clientsOutcome.body.data as Record<string, unknown>).clients,
        ),
        "get_stored_clients devolve clients[]",
      );
      const clientsRead = lastDatabaseRequest("/rest/v1/bitrix_clients");
      assertEquals(clientsRead.method, "GET");
      assertEquals(clientsRead.query.get("select"), "*");
      assertEquals(clientsRead.query.get("limit"), "100");

      captured.length = 0;
      const dealsOutcome = await invoke("get_stored_deals");
      assertEquals(dealsOutcome.status, 200);
      assertEquals(dealsOutcome.body.success, true);
      assert(
        Array.isArray(
          (dealsOutcome.body.data as Record<string, unknown>).deals,
        ),
        "get_stored_deals devolve deals[]",
      );
      const dealsRead = lastDatabaseRequest("/rest/v1/bitrix_deals");
      assertEquals(dealsRead.method, "GET");
      assertEquals(dealsRead.query.get("select"), "*");
      assertEquals(dealsRead.query.get("limit"), "100");

      // Logs: o codigo consulta sync_logs (nao bitrix_sync_logs), ordenado por
      // created_at desc e limitado a 50. Essa distincao e intencionalmente
      // fixada ate a decisao de fonte de verdade no ADR.
      captured.length = 0;
      const logsOutcome = await invoke("get_sync_logs");
      assertEquals(logsOutcome.status, 200);
      assertEquals(logsOutcome.body.success, true);
      assert(
        Array.isArray((logsOutcome.body.data as Record<string, unknown>).logs),
        "get_sync_logs devolve logs[]",
      );
      const logsRead = lastDatabaseRequest("/rest/v1/sync_logs");
      assertEquals(logsRead.method, "GET");
      assertEquals(logsRead.query.get("select"), "*");
      assertEquals(logsRead.query.get("order"), "created_at.desc");
      assertEquals(logsRead.query.get("limit"), "50");
    } finally {
      globalThis.fetch = originalFetch;
      for (const name of ENV_NAMES) {
        const value = originalEnv.get(name);
        if (value === undefined) Deno.env.delete(name);
        else Deno.env.set(name, value);
      }
    }
  },
});
