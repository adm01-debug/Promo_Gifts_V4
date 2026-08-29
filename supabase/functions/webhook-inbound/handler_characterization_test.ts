/**
 * Contract test for the real webhook-inbound handler.
 *
 * Deno.serve and fetch are intercepted in-process. The suite does not use real
 * credentials, network services, or database writes.
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

type EdgeHandler = (request: Request) => Response | Promise<Response>;

const SUPABASE_URL = "https://webhook-contract-supabase.invalid";
const SERVICE_ROLE_KEY = "service-role-contract-only";
const ENDPOINT_SECRET = "endpoint-signing-secret-contract-only";
const SECOND_ENDPOINT_SECRET = "second-endpoint-secret-contract-only";
const ENDPOINT_ID = "11111111-1111-4111-8111-111111111111";
const ENV_NAMES = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "WEBHOOK_ENDPOINT_SECRET",
  "WEBHOOK_SECOND_ENDPOINT_SECRET",
  "WEBHOOK_INBOUND_V1_COMPAT_ENABLED",
  "WEBHOOK_INBOUND_V1_ALLOWLIST",
] as const;
const originalEnv = new Map(
  ENV_NAMES.map((name) => [name, Deno.env.get(name)] as const),
);

Deno.env.set("SUPABASE_URL", SUPABASE_URL);
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", SERVICE_ROLE_KEY);
Deno.env.set("WEBHOOK_ENDPOINT_SECRET", ENDPOINT_SECRET);
Deno.env.set("WEBHOOK_SECOND_ENDPOINT_SECRET", SECOND_ENDPOINT_SECRET);
Deno.env.delete("WEBHOOK_INBOUND_V1_COMPAT_ENABLED");
Deno.env.delete("WEBHOOK_INBOUND_V1_ALLOWLIST");

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

assert(handler, "index.ts must register a Deno.serve callback");

type StoredEvent = Record<string, unknown> & { id: string };
const storedEvents: StoredEvent[] = [];
const captured: Array<
  { method: string; pathname: string; query: URLSearchParams; body: string }
> = [];
let persistenceFails = false;
let duplicateRace = false;

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function localFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const request = new Request(input, init);
  const url = new URL(request.url);
  const body = request.method === "GET" || request.method === "HEAD"
    ? ""
    : await request.clone().text();
  captured.push({
    method: request.method,
    pathname: url.pathname,
    query: url.searchParams,
    body,
  });

  if (url.host !== "webhook-contract-supabase.invalid") {
    return json({ message: `Unexpected external request: ${url.href}` }, 500);
  }

  if (url.pathname.endsWith("/rpc/check_ip_access")) return json(null);
  if (url.pathname.endsWith("/rpc/check_rate_limit")) {
    return json({ allowed: true });
  }
  if (url.pathname.endsWith("/rpc/increment_webhook_stats")) return json(null);

  if (url.pathname.endsWith("/inbound_webhook_endpoints")) {
    const slug = url.searchParams.get("slug");
    if (slug === "eq.my-hook") {
      return json([{
        id: ENDPOINT_ID,
        slug: "my-hook",
        source_system: "contract-source",
        hmac_secret_ref: "WEBHOOK_ENDPOINT_SECRET",
        allowed_events: ["order.created", "legacy.event"],
        allowed_ips: ["192.0.2.10"],
      }]);
    }
    if (slug === "eq.second-hook") {
      return json([{
        id: "22222222-2222-4222-8222-222222222222",
        slug: "second-hook",
        source_system: "second-contract-source",
        hmac_secret_ref: "WEBHOOK_SECOND_ENDPOINT_SECRET",
        allowed_events: ["order.created"],
        allowed_ips: ["192.0.2.10"],
      }]);
    }
    return json([]);
  }

  if (url.pathname.endsWith("/integration_credentials")) return json([]);

  if (url.pathname.endsWith("/inbound_webhook_events")) {
    if (request.method === "GET") {
      const endpointId = url.searchParams.get("endpoint_id")?.replace(
        /^eq\./,
        "",
      );
      const key = url.searchParams.get("idempotency_key")?.replace(/^eq\./, "");
      const existing = storedEvents.find((event) =>
        event.endpoint_id === endpointId && event.idempotency_key === key
      );
      return json(existing ? [{ id: existing.id }] : []);
    }

    if (request.method === "POST") {
      if (duplicateRace) {
        return json(
          { code: "23505", message: "Synthetic unique violation" },
          409,
        );
      }
      if (persistenceFails) {
        return json({
          code: "PGRST500",
          message: "Synthetic persistence failure",
        }, 500);
      }
      const payload = JSON.parse(body) as Record<string, unknown>;
      const id = `event-${storedEvents.length + 1}`;
      storedEvents.push({ ...payload, id });
      return json({ id }, 201);
    }
  }

  return json({ message: `Unexpected local request: ${url.pathname}` }, 500);
}

async function hmacHex(
  rawBody: string,
  secret = ENDPOINT_SECRET,
): Promise<string> {
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

function requestFor(
  rawBody: string,
  options: {
    slug?: string | null;
    version?: string;
    signature?: string;
    headers?: Record<string, string>;
    method?: string;
  } = {},
): Request {
  const slug = options.slug === undefined ? "my-hook" : options.slug;
  const query = new URLSearchParams();
  if (slug !== null) query.set("slug", slug);
  if (options.version) query.set("v", options.version);
  const suffix = query.size ? `?${query.toString()}` : "";
  const headers = new Headers({
    "content-type": "application/json",
    "user-agent": "PromoGifts webhook contract test/1.0",
    "x-forwarded-for": "192.0.2.10",
    ...options.headers,
  });
  if (options.signature) headers.set("x-webhook-signature", options.signature);
  return new Request(
    `https://edge-contract.invalid/functions/v1/webhook-inbound${suffix}`,
    {
      method: options.method ?? "POST",
      headers,
      body: options.method === "GET" ? undefined : rawBody,
    },
  );
}

async function invoke(
  request: Request,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await handler!(request);
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : {} };
}

const originalFetch = globalThis.fetch;

Deno.test({
  name:
    "webhook-inbound real handler: slug, HMAC, v1/v2, persistence and idempotency",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    globalThis.fetch = localFetch as typeof fetch;
    try {
      const v2Payload = JSON.stringify({
        event: "order.created",
        occurred_at: "2026-08-28T10:00:00.000Z",
        data: { order_id: "ORDER-001" },
        idempotency_key: "550e8400-e29b-41d4-a716-446655440000",
      });
      const signature = await hmacHex(v2Payload);

      const preflight = await handler!(
        new Request(
          "https://edge-contract.invalid/functions/v1/webhook-inbound?slug=my-hook",
          {
            method: "OPTIONS",
            headers: { origin: "https://www.promogifts.com.br" },
          },
        ),
      );
      assertEquals(preflight.status, 200);
      assertEquals(preflight.headers.get("access-control-allow-origin"), "*");
      assert(
        preflight.headers.get("access-control-allow-headers")?.includes(
          "x-webhook-signature",
        ),
        "preflight must allow the HMAC header",
      );

      storedEvents.length = 0;
      const missingSlug = await invoke(
        requestFor(v2Payload, { slug: null, signature }),
      );
      assertEquals(missingSlug.status, 400);
      assertEquals(missingSlug.body.code, "missing_slug");
      assertEquals(storedEvents.length, 0);

      const unknownSlug = await invoke(
        requestFor(v2Payload, { slug: "missing", signature }),
      );
      assertEquals(unknownSlug.status, 404);
      assertEquals(unknownSlug.body.code, "endpoint_not_found");
      assertEquals(storedEvents.length, 0);

      const wrongEndpointSecret = await invoke(
        requestFor(v2Payload, { slug: "second-hook", signature }),
      );
      assertEquals(wrongEndpointSecret.status, 401);
      assertEquals(wrongEndpointSecret.body.code, "invalid_signature");
      assertEquals(storedEvents.length, 0);

      const invalidSignature = await invoke(
        requestFor(v2Payload, { signature: "sha256=deadbeef" }),
      );
      assertEquals(invalidSignature.status, 401);
      assertEquals(invalidSignature.body.code, "invalid_signature");
      assertEquals(storedEvents.length, 0);

      const automationUaStillReachesHmac = await invoke(
        requestFor(v2Payload, {
          signature: "sha256=deadbeef",
          headers: { "user-agent": "undici" },
        }),
      );
      assertEquals(automationUaStillReachesHmac.status, 401);
      assertEquals(automationUaStillReachesHmac.body.code, "invalid_signature");
      assertEquals(storedEvents.length, 0);

      const blockedIp = await invoke(requestFor(v2Payload, {
        signature,
        headers: { "x-forwarded-for": "198.51.100.25" },
      }));
      assertEquals(blockedIp.status, 403);
      assertEquals(blockedIp.body.code, "ip_not_allowed");
      assertEquals(storedEvents.length, 0);

      const conflictingSignatures = await invoke(requestFor(v2Payload, {
        signature,
        headers: {
          "x-signature-256":
            "sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
      }));
      assertEquals(conflictingSignatures.status, 401);
      assertEquals(conflictingSignatures.body.code, "conflicting_signatures");
      assertEquals(storedEvents.length, 0);

      const malformed = "{broken-json";
      const malformedResult = await invoke(requestFor(malformed, {
        signature: await hmacHex(malformed),
      }));
      assertEquals(malformedResult.status, 400);
      assertEquals(storedEvents.length, 0);

      const disallowedPayload = JSON.stringify({
        event: "order.deleted",
        occurred_at: "2026-08-28T10:00:00.000Z",
        data: {},
      });
      const disallowed = await invoke(requestFor(disallowedPayload, {
        signature: await hmacHex(disallowedPayload),
      }));
      assertEquals(disallowed.status, 403);
      assertEquals(disallowed.body.code, "event_not_allowed");
      assertEquals(storedEvents.length, 0);

      const accepted = await invoke(requestFor(v2Payload, {
        headers: { "x-hub-signature-256": `SHA256=${signature.toUpperCase()}` },
      }));
      assertEquals(accepted.status, 200);
      assertEquals(accepted.body.ok, true);
      assertEquals(accepted.body.duplicate, false);
      assertEquals(accepted.body.contract_version, "2");
      assertEquals(accepted.body.event_id, "event-1");
      assertEquals(storedEvents.length, 1);
      assertEquals(storedEvents[0].endpoint_id, ENDPOINT_ID);
      assertEquals(storedEvents[0].event_type, "order.created");
      assertEquals(storedEvents[0].signature_valid, true);
      assertEquals(storedEvents[0].processed, true);
      assert(
        typeof storedEvents[0].processed_at === "string",
        "processed_at must be persisted",
      );
      const storedHeaders = storedEvents[0].headers as Record<string, string>;
      assertEquals(storedHeaders["x-hub-signature-256"], undefined);
      assertEquals(storedHeaders.authorization, undefined);

      const conflictingIdempotency = await invoke(requestFor(v2Payload, {
        signature,
        headers: {
          "x-idempotency-key": "550e8400-e29b-41d4-a716-446655440099",
        },
      }));
      assertEquals(conflictingIdempotency.status, 400);
      assertEquals(
        conflictingIdempotency.body.code,
        "idempotency_key_conflict",
      );
      assertEquals(storedEvents.length, 1);

      const conflictingEvent = await invoke(requestFor(v2Payload, {
        signature,
        headers: { "x-event": "legacy.event" },
      }));
      assertEquals(conflictingEvent.status, 400);
      assertEquals(conflictingEvent.body.code, "event_conflict");
      assertEquals(storedEvents.length, 1);

      const replay = await invoke(requestFor(v2Payload, { signature }));
      assertEquals(replay.status, 200);
      assertEquals(replay.body.duplicate, true);
      assertEquals(replay.body.original_event_id, "event-1");
      assertEquals(storedEvents.length, 1);

      const legacyPayload = JSON.stringify({ legacy: true });
      const legacySignature = await hmacHex(legacyPayload);
      const blockedLegacy = await invoke(requestFor(legacyPayload, {
        version: "1",
        signature: legacySignature,
        headers: { "x-event": "legacy.event" },
      }));
      assertEquals(blockedLegacy.status, 426);
      assertEquals(storedEvents.length, 1);

      Deno.env.set("WEBHOOK_INBOUND_V1_COMPAT_ENABLED", "true");
      Deno.env.set("WEBHOOK_INBOUND_V1_ALLOWLIST", "my-hook");
      const primitiveLegacyPayload = JSON.stringify("legacy");
      const invalidLegacy = await invoke(requestFor(primitiveLegacyPayload, {
        version: "1",
        signature: await hmacHex(primitiveLegacyPayload),
        headers: { "x-event": "legacy.event" },
      }));
      assertEquals(invalidLegacy.status, 422);
      assertEquals(invalidLegacy.body.code, "legacy_payload_invalid");
      assertEquals(storedEvents.length, 1);

      const acceptedLegacy = await invoke(requestFor(legacyPayload, {
        version: "1",
        signature: legacySignature,
        headers: { "x-event": "legacy.event" },
      }));
      assertEquals(acceptedLegacy.status, 200);
      assertEquals(acceptedLegacy.body.contract_version, "1");
      assertEquals(storedEvents.length, 2);

      const internalPayload = JSON.stringify({
        event: "order.created",
        occurred_at: "2026-08-28T10:01:00.000Z",
        data: { order_id: "ORDER-002" },
        idempotency_key: "550e8400-e29b-41d4-a716-446655440001",
      });
      const internal = await invoke(requestFor(internalPayload, {
        headers: {
          authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          "x-internal-call": "true",
        },
      }));
      assertEquals(internal.status, 200);
      assertEquals(storedEvents.length, 3);

      const forgedInternal = await invoke(requestFor(internalPayload, {
        headers: {
          authorization: `Bearer prefix-${SERVICE_ROLE_KEY}-suffix`,
          "x-internal-call": "true",
        },
      }));
      assertEquals(forgedInternal.status, 401);
      assertEquals(storedEvents.length, 3);

      duplicateRace = true;
      const racePayload = JSON.stringify({
        event: "order.created",
        occurred_at: "2026-08-28T10:01:30.000Z",
        data: { order_id: "ORDER-RACE" },
        idempotency_key: "550e8400-e29b-41d4-a716-446655440010",
      });
      const raceResolved = await invoke(requestFor(racePayload, {
        signature: await hmacHex(racePayload),
      }));
      assertEquals(raceResolved.status, 200);
      assertEquals(raceResolved.body.duplicate, true);
      assertEquals(storedEvents.length, 3);
      duplicateRace = false;

      persistenceFails = true;
      const failedPayload = JSON.stringify({
        event: "order.created",
        occurred_at: "2026-08-28T10:02:00.000Z",
        data: { order_id: "ORDER-003" },
        idempotency_key: "550e8400-e29b-41d4-a716-446655440002",
      });
      const failedPersistence = await invoke(requestFor(failedPayload, {
        signature: await hmacHex(failedPayload),
      }));
      assertEquals(failedPersistence.status, 500);
      assertEquals(failedPersistence.body.code, "persistence_failed");
      assertEquals(storedEvents.length, 3);
    } finally {
      globalThis.fetch = originalFetch;
      persistenceFails = false;
      duplicateRace = false;
      for (const name of ENV_NAMES) {
        const value = originalEnv.get(name);
        if (value === undefined) Deno.env.delete(name);
        else Deno.env.set(name, value);
      }
    }
  },
});

Deno.test({
  name:
    "webhook-inbound adversarial: unsigned idempotency header cannot bypass replay detection",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    Deno.env.set("SUPABASE_URL", SUPABASE_URL);
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", SERVICE_ROLE_KEY);
    Deno.env.set("WEBHOOK_ENDPOINT_SECRET", ENDPOINT_SECRET);
    Deno.env.set("WEBHOOK_SECOND_ENDPOINT_SECRET", SECOND_ENDPOINT_SECRET);
    globalThis.fetch = localFetch as typeof fetch;
    storedEvents.length = 0;
    try {
      const body = JSON.stringify({
        event: "order.created",
        occurred_at: "2026-08-29T10:00:00.000Z",
        data: { order_id: "REPLAY-WITH-UNSIGNED-HEADER" },
      });
      const signature = await hmacHex(body);
      const first = await invoke(requestFor(body, { signature }));
      assertEquals(first.status, 200);
      assertEquals(first.body.duplicate, false);

      const replay = await invoke(requestFor(body, {
        signature,
        headers: {
          "x-idempotency-key": "550e8400-e29b-41d4-a716-446655440099",
        },
      }));
      assertEquals(replay.status, 200);
      assertEquals(replay.body.duplicate, true);
      assertEquals(storedEvents.length, 1);
    } finally {
      globalThis.fetch = originalFetch;
      storedEvents.length = 0;
      for (const name of ENV_NAMES) {
        const value = originalEnv.get(name);
        if (value === undefined) Deno.env.delete(name);
        else Deno.env.set(name, value);
      }
    }
  },
});
