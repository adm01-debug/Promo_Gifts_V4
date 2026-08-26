/**
 * Caracterizacao local do handler REAL de webhook-inbound.
 *
 * Este teste intercepta Deno.serve para chamar exatamente o callback exportado
 * pelo modulo de producao. O cliente Supabase usa um fetch local deterministico:
 * nenhuma rede ou escrita em banco e realizada.
 *
 * Escopo intencional enquanto o ADR do contrato esta pendente:
 * - HMAC SHA-256 sobre o body cru;
 * - fail-closed quando o segredo global esta ausente;
 * - rejeicao de assinatura incorreta sem tentativa de persistencia;
 * - bypass interno apenas com service_role exata;
 * - JSON invalido nao chega ao banco.
 *
 * Slug, V1/V2, tabela de destino e idempotencia nao sao fixados aqui porque o
 * handler, os schemas e os testes existentes ainda divergem nesses pontos.
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
const ENV_NAMES = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "WEBHOOK_INBOUND_SIGNING_SECRET",
] as const;
const originalEnv = new Map(
  ENV_NAMES.map((name) => [name, Deno.env.get(name)] as const),
);

type CapturedRequest = {
  method: string;
  pathname: string;
  body: string;
};

const captured: CapturedRequest[] = [];

async function localSupabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const request = new Request(input, init);
  const body = request.method === "GET" || request.method === "HEAD"
    ? ""
    : await request.clone().text();
  const pathname = new URL(request.url).pathname;
  captured.push({ method: request.method, pathname, body });

  const json = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  if (pathname.endsWith("/rpc/check_ip_access")) return json(null);
  if (pathname.endsWith("/rpc/check_rate_limit")) {
    return json({ allowed: true });
  }
  if (pathname.endsWith("/integration_credentials")) return json([]);
  if (pathname.endsWith("/rpc/increment_webhook_stats")) return json(null);

  // A tabela chamada pelo handler e deliberadamente tratada de forma opaca.
  // O destino canonico sera fixado somente apos aprovacao do ADR.
  if (request.method === "POST" && pathname.startsWith("/rest/v1/")) {
    return json(null, 201);
  }

  return json({ message: `Unexpected local request: ${pathname}` }, 500);
}

async function hmacHex(rawBody: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(rawBody),
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function externalRequest(body: string, signature?: string): Request {
  const headers = new Headers({
    "content-type": "application/json",
    "user-agent": "PromoGifts webhook contract test/1.0",
    "x-forwarded-for": "192.0.2.10",
  });
  if (signature) headers.set("x-webhook-signature", signature);
  return new Request("https://example.test/functions/v1/webhook-inbound", {
    method: "POST",
    headers,
    body,
  });
}

function persistenceAttempts(): CapturedRequest[] {
  return captured.filter(
    ({ method, pathname }) =>
      method === "POST" &&
      pathname.startsWith("/rest/v1/") &&
      !pathname.includes("/rpc/") &&
      !pathname.endsWith("/bot_detection_log"),
  );
}

Deno.test({
  name:
    "webhook-inbound handler real: fronteiras HMAC e bypass interno sem rede",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    globalThis.fetch = localSupabaseFetch;
    Deno.env.set("SUPABASE_URL", "https://local-webhook-test.invalid");
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-test-only");

    try {
      captured.length = 0;
      const preflight = await handler!(
        new Request("https://example.test/functions/v1/webhook-inbound", {
          method: "OPTIONS",
          headers: { origin: "https://www.promogifts.com.br" },
        }),
      );
      assertEquals(preflight.status, 200);
      assertEquals(
        preflight.headers.get("access-control-allow-origin"),
        "https://www.promogifts.com.br",
      );
      assertEquals(captured.length, 0);

      const rawBody = JSON.stringify({
        event: "order.created",
        data: { order_id: "ORD-LOCAL-001" },
      });

      Deno.env.delete("WEBHOOK_INBOUND_SIGNING_SECRET");
      captured.length = 0;
      const notConfigured = await handler!(externalRequest(rawBody));
      assertEquals(notConfigured.status, 503);
      assertEquals(persistenceAttempts().length, 0);

      Deno.env.set("WEBHOOK_INBOUND_SIGNING_SECRET", "local-signing-secret");
      captured.length = 0;
      const invalidSignature = await handler!(
        externalRequest(rawBody, "sha256=deadbeef"),
      );
      assertEquals(invalidSignature.status, 401);
      assertEquals(persistenceAttempts().length, 0);

      captured.length = 0;
      const signature = await hmacHex(rawBody, "local-signing-secret");
      const validSignature = await handler!(
        externalRequest(rawBody, `SHA256=${signature.toUpperCase()}`),
      );
      assertEquals(validSignature.status, 200);
      assertEquals(persistenceAttempts().length, 1);

      captured.length = 0;
      const malformedInternal = await handler!(
        new Request("https://example.test/functions/v1/webhook-inbound", {
          method: "POST",
          headers: {
            authorization: "Bearer service-role-test-only",
            "content-type": "application/json",
            "x-internal-call": "true",
          },
          body: "{broken-json",
        }),
      );
      assertEquals(malformedInternal.status, 400);
      assertEquals(captured.length, 0);

      Deno.env.delete("WEBHOOK_INBOUND_SIGNING_SECRET");
      captured.length = 0;
      const substringToken = await handler!(
        new Request("https://example.test/functions/v1/webhook-inbound", {
          method: "POST",
          headers: {
            authorization: "Bearer prefix-service-role-test-only-suffix",
            "content-type": "application/json",
            "user-agent": "PromoGifts webhook contract test/1.0",
            "x-forwarded-for": "192.0.2.11",
            "x-internal-call": "true",
          },
          body: rawBody,
        }),
      );
      assertEquals(substringToken.status, 503);
      assertEquals(persistenceAttempts().length, 0);
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
