/**
 * Caracterizacao local do handler real de e2e-cleanup.
 *
 * O teste intercepta Deno.serve e o fetch usado por supabase-js. Portanto nao
 * faz chamadas de rede, nao usa credenciais reais e nao grava no Supabase.
 * Ele documenta o contrato atualmente observavel, inclusive o comportamento
 * legado em que um erro do RPC de rate-limit nao interrompe o fluxo.
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

const SUPABASE_URL = "https://e2e-cleanup-contract.invalid";
const ENV_NAMES = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "E2E_CLEANUP_TOKEN",
  "E2E_CLEANUP_ALLOWED_EMAILS",
  "E2E_CLEANUP_RATE_LIMIT_MAX",
  "E2E_CLEANUP_RATE_LIMIT_WINDOW_SECONDS",
] as const;
const originalEnv = new Map(
  ENV_NAMES.map((name) => [name, Deno.env.get(name)] as const),
);

// index.ts le estas variaveis no carregamento do modulo.
Deno.env.set("SUPABASE_URL", SUPABASE_URL);
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-contract-only");
Deno.env.set("E2E_CLEANUP_TOKEN", "cleanup-contract-token");
Deno.env.set("E2E_CLEANUP_ALLOWED_EMAILS", "allowed@example.test");
Deno.env.set("E2E_CLEANUP_RATE_LIMIT_MAX", "30");
Deno.env.set("E2E_CLEANUP_RATE_LIMIT_WINDOW_SECONDS", "60");

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

type CapturedRequest = {
  method: string;
  pathname: string;
  body: string;
};

type RateLimitMode = "allowed" | "error";

let rateLimitMode: RateLimitMode = "allowed";
const captured: CapturedRequest[] = [];

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function localSupabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const request = new Request(input, init);
  const pathname = new URL(request.url).pathname;
  const body = request.method === "GET" || request.method === "HEAD"
    ? ""
    : await request.clone().text();
  captured.push({ method: request.method, pathname, body });

  if (pathname === "/rest/v1/rpc/e2e_cleanup_check_rate_limit") {
    if (rateLimitMode === "error") {
      // supabase-js normaliza esta resposta PostgREST em { data: null, error }.
      return json(
        { code: "PGRST205", message: "rate-limit RPC unavailable" },
        404,
      );
    }
    return json({ allowed: true });
  }

  if (pathname === "/rest/v1/e2e_cleanup_audit" && request.method === "POST") {
    return json({ id: "00000000-0000-4000-8000-000000000045" }, 201);
  }

  if (pathname === "/auth/v1/admin/users" && request.method === "GET") {
    // O email permitido abaixo nao existe: permite observar se o handler
    // prossegue indevidamente depois do erro do RPC.
    return json({ users: [] });
  }

  return json({ error: "unexpected_local_request", pathname }, 500);
}

function cleanupRequest(
  body: Record<string, unknown>,
  token = "cleanup-contract-token",
): Request {
  return new Request("https://edge-contract.invalid/functions/v1/e2e-cleanup", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-e2e-cleanup-token": token,
      "x-forwarded-for": "192.0.2.45",
    },
    body: JSON.stringify(body),
  });
}

function auditWrites(): CapturedRequest[] {
  return captured.filter(({ method, pathname }) => (
    method === "POST" && pathname === "/rest/v1/e2e_cleanup_audit"
  ));
}

Deno.test({
  name:
    "e2e-cleanup handler real: token, RPC, allowlist e audit sao caracterizados sem rede",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    globalThis.fetch = localSupabaseFetch as typeof fetch;

    try {
      captured.length = 0;
      const preflight = await handler!(
        new Request("https://edge-contract.invalid/functions/v1/e2e-cleanup", {
          method: "OPTIONS",
        }),
      );
      assertEquals(preflight.status, 200);
      assert(
        preflight.headers.get("access-control-allow-headers")?.includes(
          "x-e2e-cleanup-token",
        ),
        "o contrato CORS deve anunciar o header de assinatura atual",
      );
      assertEquals(captured.length, 0);

      // A assinatura atual e o header x-e2e-cleanup-token. Token incorreto
      // e rejeitado antes de parse/RPC, mas ainda tenta auditar na tabela atual.
      rateLimitMode = "allowed";
      captured.length = 0;
      const invalidToken = await handler!(
        cleanupRequest({ email: "allowed@example.test" }, "token-incorreto"),
      );
      assertEquals(invalidToken.status, 401);
      assertJsonEquals(await invalidToken.json(), {
        ok: false,
        error: "Unauthorized",
      });
      assertEquals(auditWrites().length, 1);
      const invalidTokenAudit = JSON.parse(auditWrites()[0].body) as Record<
        string,
        unknown
      >;
      assertJsonEquals({
        ip: invalidTokenAudit.ip,
        status: invalidTokenAudit.status,
        reason: invalidTokenAudit.reason,
        dry_run: invalidTokenAudit.dry_run,
      }, {
        ip: "192.0.2.45",
        status: "auth_failed",
        reason: "invalid_token",
        dry_run: true,
      });
      assert(
        typeof invalidTokenAudit.total_ms === "number",
        "a auditoria de token invalido deve carregar total_ms numerico",
      );

      // Um erro HTTP do RPC se torna { data: null, error } no SDK. O handler
      // atual ignora esse error e continua ate a consulta de usuarios.
      rateLimitMode = "error";
      captured.length = 0;
      const rateLimitRpcError = await handler!(
        cleanupRequest({ email: "allowed@example.test" }),
      );
      assertEquals(rateLimitRpcError.status, 404);
      assertJsonEquals(await rateLimitRpcError.json(), {
        ok: false,
        error: "User not found",
        email: "allowed@example.test",
      });
      assert(
        captured.some(({ pathname }) => (
          pathname === "/rest/v1/rpc/e2e_cleanup_check_rate_limit"
        )),
        "o handler deve chamar o RPC de rate-limit",
      );
      assert(
        captured.some(({ pathname }) => pathname === "/auth/v1/admin/users"),
        "contrato observado: erro do RPC nao bloqueia a consulta de usuarios",
      );

      // Com o RPC permitindo a chamada, o email fora da allowlist recebe 403
      // e gera a referencia de auditoria e2e_cleanup_audit atualmente usada.
      rateLimitMode = "allowed";
      captured.length = 0;
      const rejectedEmail = await handler!(
        cleanupRequest({ email: "blocked@example.test", dryRun: false }),
      );
      assertEquals(rejectedEmail.status, 403);
      assertJsonEquals(await rejectedEmail.json(), {
        ok: false,
        error: "Email not in allowed list",
      });
      assertEquals(auditWrites().length, 1);
      const rejectedEmailAudit = JSON.parse(auditWrites()[0].body) as Record<
        string,
        unknown
      >;
      assertJsonEquals({
        ip: rejectedEmailAudit.ip,
        status: rejectedEmailAudit.status,
        reason: rejectedEmailAudit.reason,
        dry_run: rejectedEmailAudit.dry_run,
      }, {
        ip: "192.0.2.45",
        status: "forbidden",
        reason: "email_not_allowed",
        dry_run: false,
      });
      assert(
        typeof rejectedEmailAudit.total_ms === "number",
        "a auditoria de allowlist deve carregar total_ms numerico",
      );
      assert(
        !captured.some(({ pathname }) => pathname === "/auth/v1/admin/users"),
        "email fora da allowlist nao deve chegar a auth.admin.listUsers",
      );
    } finally {
      globalThis.fetch = originalFetch;
      for (const [name, value] of originalEnv) {
        if (value === undefined) Deno.env.delete(name);
        else Deno.env.set(name, value);
      }
    }
  },
});
