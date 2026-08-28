/**
 * Caracterização hermética do handler real de visual-search.
 *
 * Intercepta Deno.serve e o fetch do cliente Supabase: nenhum request de rede
 * ou escrita remota é executado. O fluxo sem Authorization aciona o catch do
 * handler e permite verificar o contrato de telemetria sem chamar IA.
 */
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals<T>(actual: T, expected: T): void {
  if (!Object.is(actual, expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

type EdgeHandler = (request: Request) => Response | Promise<Response>;

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

const originalFetch = globalThis.fetch;
const ENV_NAMES = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;
const originalEnv = new Map(
  ENV_NAMES.map((name) => [name, Deno.env.get(name)] as const),
);

type CapturedInvocation = { pathname: string; body: Record<string, unknown> };
const captured: CapturedInvocation[] = [];
let telemetryFails = false;

async function localSupabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const request = new Request(input, init);
  const pathname = new URL(request.url).pathname;

  if (request.method === "POST" && pathname.endsWith("/edge_function_invocations")) {
    captured.push({ pathname, body: JSON.parse(await request.text()) });
    if (telemetryFails) {
      return new Response(JSON.stringify({ message: "telemetry unavailable" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify([]), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ message: `unexpected ${pathname}` }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}

function request(requestId: string): Request {
  return new Request("https://example.test/functions/v1/visual-search", {
    method: "POST",
    headers: { "x-request-id": requestId },
  });
}

Deno.test({
  name: "visual-search preserva resposta primária e registra falha no canal canônico",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    globalThis.fetch = localSupabaseFetch;
    Deno.env.set("SUPABASE_URL", "https://local-visual-search-test.invalid");
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-test-only");

    try {
      telemetryFails = false;
      captured.length = 0;
      const response = await handler!(request("req-vs-observability-001"));

      assertEquals(response.status, 401);
      assertEquals(captured.length, 1);
      assertEquals(captured[0].pathname, "/rest/v1/edge_function_invocations");
      assertEquals(captured[0].body.function_slug, "visual-search");
      assertEquals(captured[0].body.request_method, "POST");
      assertEquals(captured[0].body.status_code, 401);
      assertEquals(captured[0].body.invoked_by, null);
      assertEquals(
        (captured[0].body.request_metadata as Record<string, unknown>).request_id,
        "req-vs-observability-001",
      );
      assert(
        typeof captured[0].body.error_message === "string",
        "causa resumida deve acompanhar a invocação",
      );

      telemetryFails = true;
      captured.length = 0;
      const responseWhenLoggingFails = await handler!(
        request("req-vs-observability-002"),
      );

      assertEquals(responseWhenLoggingFails.status, 401);
      assertEquals(captured.length, 1);
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
