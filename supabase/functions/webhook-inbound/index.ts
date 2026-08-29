// webhook-inbound: receives external webhooks at
// /functions/v1/webhook-inbound?slug=<configured-endpoint>.
//
// Contract:
// - endpoint lookup is always scoped by an active slug;
// - external requests are authenticated with endpoint-specific HMAC-SHA256;
// - v2 is the default strict envelope; v1 requires an explicit compatibility gate;
// - accepted events are persisted in inbound_webhook_events exactly once.

import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { buildPublicCorsHeaders } from "../_shared/cors.ts";
import { runBotProtection } from "../_shared/bot-protection.ts";
import { parseContract } from "../_shared/contracts/index.ts";
import { WebhookInboundSchemas } from "../_shared/contracts/schemas/webhook-inbound.ts";
import { retrySupabaseCall } from "../_shared/retry-backoff.ts";
import { safeErrorFields } from "../_shared/log-safety.ts";

const corsHeaders = buildPublicCorsHeaders({
  extraAllowHeaders: [
    "accept-version",
    "x-event",
    "x-hub-signature-256",
    "x-idempotency-key",
    "x-signature-256",
    "x-webhook-issuer",
    "x-webhook-signature",
  ],
  allowMethods: "POST, OPTIONS",
});

interface InboundEndpoint {
  id: string;
  slug: string;
  source_system: string;
  hmac_secret_ref: string;
  allowed_events: string[] | null;
  allowed_ips: string[] | null;
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      ...extraHeaders,
      "Content-Type": "application/json",
    },
  });
}

function hexFromBytes(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

function normalizeSignature(signature: string): string {
  const trimmed = signature.trim();
  return trimmed.toLowerCase().startsWith("sha256=")
    ? trimmed.slice(7).trim().toLowerCase()
    : trimmed.toLowerCase();
}

async function verifyHmac(
  rawBody: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const provided = normalizeSignature(signature);
  if (!provided || !/^[a-f0-9]{64}$/.test(provided)) return false;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const digest = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(rawBody),
    );
    return timingSafeEqual(hexFromBytes(digest), provided);
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function resolveEvent(
  payload: unknown,
  req: Request,
): { ok: true; event: string } | { ok: false } {
  const headerEvent = req.headers.get("x-event")?.trim();
  const payloadEvent = isRecord(payload) && typeof payload.event === "string"
    ? payload.event.trim()
    : "";
  if (headerEvent && payloadEvent && headerEvent !== payloadEvent) {
    return { ok: false };
  }
  return { ok: true, event: headerEvent || payloadEvent || "unknown" };
}

function resolveIdempotencyKey(
  req: Request,
  payload: unknown,
  signature: string,
): { ok: true; key: string | null } | { ok: false } {
  const headerKey = req.headers.get("x-idempotency-key")?.trim();
  const payloadKey =
    isRecord(payload) && typeof payload.idempotency_key === "string"
      ? payload.idempotency_key.trim()
      : "";
  const validLength = (value: string) =>
    value.length >= 8 && value.length <= 256;
  if (headerKey && !validLength(headerKey)) return { ok: false };
  if (payloadKey && !validLength(payloadKey)) return { ok: false };
  if (headerKey && payloadKey && headerKey !== payloadKey) return { ok: false };
  if (payloadKey) return { ok: true, key: payloadKey };

  const normalizedSignature = normalizeSignature(signature);
  return {
    ok: true,
    // Chamadas HMAC externas derivam o fallback de material assinado. Assim um
    // header não assinado não consegue alterar a chave de detecção de replay.
    // Header-only continua disponível para chamadas internas autenticadas.
    key: normalizedSignature ? `sig:${normalizedSignature}` : headerKey || null,
  };
}

function resolveSignature(
  req: Request,
): { ok: true; signature: string } | { ok: false } {
  const values = [
    req.headers.get("x-webhook-signature"),
    req.headers.get("x-signature-256"),
    req.headers.get("x-hub-signature-256"),
  ]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean);
  const normalized = new Set(values.map(normalizeSignature));
  if (normalized.size > 1) return { ok: false };
  return { ok: true, signature: values[0] ?? "" };
}

function sanitizedHeaders(req: Request): Record<string, string> {
  const allowed = [
    "accept-version",
    "content-type",
    "user-agent",
    "x-event",
    "x-idempotency-key",
    "x-webhook-issuer",
  ];
  return Object.fromEntries(
    allowed
      .map((name) => [name, req.headers.get(name)] as const)
      .filter((entry): entry is readonly [string, string] => entry[1] !== null),
  );
}

function parseAllowlist(value: string | null): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({
      code: "method_not_allowed",
      message: "Method not allowed",
    }, 405);
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authorization = req.headers.get("authorization") ?? "";
  const bearer = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : authorization.trim();
  const isInternalServiceCall = req.headers.get("x-internal-call") === "true" &&
    serviceRoleKey.length > 0 &&
    bearer === serviceRoleKey;

  if (!isInternalServiceCall) {
    const protection = await runBotProtection(
      req,
      {
        endpoint: "webhook-inbound",
        maxRequests: 500,
        windowSeconds: 60,
        blockSeconds: 1800,
        allowSearchBots: false,
        // Endpoint HMAC below authenticates the automation. Keep IP controls and
        // DB-backed rate limiting, but do not reject legitimate curl/undici UAs.
        skipUserAgentCheck: true,
      },
      corsHeaders,
    );
    if (!protection.allowed) return protection.blockResponse!;
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug")?.trim() ?? "";
  if (!slug) {
    return jsonResponse({
      code: "missing_slug",
      message: "Webhook slug is required",
    }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    serviceRoleKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const readCredential = async (name: string): Promise<string | null> => {
    const { data } = await retrySupabaseCall(async () =>
      await admin
        .from("integration_credentials")
        .select("secret_value")
        .eq("secret_name", name)
        .maybeSingle()
    );
    const row = data as { secret_value?: unknown } | null;
    return typeof row?.secret_value === "string"
      ? row.secret_value
      : Deno.env.get(name) ?? null;
  };

  const updateStats = async (
    endpointId: string,
    invalid: boolean,
  ): Promise<void> => {
    const { error } = await admin.rpc("increment_webhook_stats", {
      p_endpoint_id: endpointId,
      p_is_invalid: invalid,
    });
    if (error) {
      console.warn(
        "[webhook-inbound] increment_webhook_stats non-fatal:",
        safeErrorFields(error),
      );
    }
  };

  try {
    const { data: endpointData } = await retrySupabaseCall(async () =>
      await admin
        .from("inbound_webhook_endpoints")
        .select(
          "id, slug, source_system, hmac_secret_ref, allowed_events, allowed_ips",
        )
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle()
    );
    const endpoint = endpointData as InboundEndpoint | null;
    if (!endpoint) {
      return jsonResponse({
        code: "endpoint_not_found",
        message: "Webhook endpoint not found",
      }, 404);
    }

    const sourceIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    if (
      endpoint.allowed_ips?.length &&
      (!sourceIp || !endpoint.allowed_ips.includes(sourceIp))
    ) {
      return jsonResponse(
        { code: "ip_not_allowed", message: "Webhook source is not allowed" },
        403,
      );
    }

    let rawBody: string;
    try {
      rawBody = await req.text();
    } catch {
      return jsonResponse({
        code: "invalid_body",
        message: "Unable to read request body",
      }, 400);
    }

    const signatureResult = resolveSignature(req);
    if (!signatureResult.ok) {
      await updateStats(endpoint.id, true);
      return jsonResponse({
        code: "conflicting_signatures",
        message: "Conflicting signature headers",
      }, 401);
    }
    const signature = signatureResult.signature;

    if (!isInternalServiceCall) {
      const secret = await readCredential(endpoint.hmac_secret_ref);
      if (!secret) {
        return jsonResponse(
          {
            code: "webhook_not_configured",
            message: "Webhook signing secret is not configured",
          },
          503,
        );
      }
      if (!(await verifyHmac(rawBody, signature, secret))) {
        await updateStats(endpoint.id, true);
        return jsonResponse({
          code: "invalid_signature",
          message: "Invalid webhook signature",
        }, 401);
      }
    }

    const contract = await parseContract(req, WebhookInboundSchemas, {
      corsHeaders,
      prereadBody: rawBody,
    });
    if (!contract.ok) return contract.response;

    if (contract.version === "1") {
      const compatEnabled =
        (await readCredential("WEBHOOK_INBOUND_V1_COMPAT_ENABLED"))
          ?.toLowerCase() === "true";
      const allowlist = parseAllowlist(
        await readCredential("WEBHOOK_INBOUND_V1_ALLOWLIST"),
      );
      const issuer = req.headers.get("x-webhook-issuer")?.trim() || slug;
      if (!compatEnabled || (!allowlist.has(issuer) && !allowlist.has(slug))) {
        return jsonResponse(
          {
            code: "legacy_version_blocked",
            message:
              "Webhook contract v1 is restricted; migrate the producer to v2",
          },
          426,
          contract.responseHeaders,
        );
      }
      if (!isRecord(contract.data) || Object.keys(contract.data).length === 0) {
        return jsonResponse(
          {
            code: "legacy_payload_invalid",
            message: "Webhook contract v1 requires a non-empty JSON object",
          },
          422,
          contract.responseHeaders,
        );
      }
    }

    const eventResult = resolveEvent(contract.data, req);
    if (!eventResult.ok) {
      return jsonResponse(
        {
          code: "event_conflict",
          message: "x-event conflicts with payload.event",
        },
        400,
        contract.responseHeaders,
      );
    }
    const event = eventResult.event;
    if (
      endpoint.allowed_events?.length &&
      !endpoint.allowed_events.includes(event)
    ) {
      return jsonResponse(
        {
          code: "event_not_allowed",
          message: `Event '${event}' is not allowed for this endpoint`,
        },
        403,
        contract.responseHeaders,
      );
    }

    const idempotency = resolveIdempotencyKey(req, contract.data, signature);
    if (!idempotency.ok) {
      return jsonResponse(
        {
          code: "idempotency_key_conflict",
          message: "Invalid or conflicting idempotency keys",
        },
        400,
        contract.responseHeaders,
      );
    }
    const idempotencyKey = idempotency.key;
    if (idempotencyKey) {
      const { data: existingData } = await retrySupabaseCall(async () =>
        await admin
          .from("inbound_webhook_events")
          .select("id")
          .eq("endpoint_id", endpoint.id)
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle()
      );
      const existing = existingData as { id: string } | null;
      if (existing) {
        return jsonResponse(
          {
            ok: true,
            received: true,
            duplicate: true,
            original_event_id: existing.id,
            contract_version: contract.version,
          },
          200,
          contract.responseHeaders,
        );
      }
    }

    const processedAt = new Date().toISOString();
    const { data: insertedData, error: insertError } = await admin
      .from("inbound_webhook_events")
      .insert({
        endpoint_id: endpoint.id,
        event_type: event,
        payload: contract.data,
        headers: sanitizedHeaders(req),
        signature_valid: true,
        processed: true,
        processed_at: processedAt,
        ip_address: sourceIp,
        contract_version: contract.version,
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return jsonResponse(
          {
            ok: true,
            received: true,
            duplicate: true,
            contract_version: contract.version,
          },
          200,
          contract.responseHeaders,
        );
      }
      console.error(
        "[webhook-inbound] insert error:",
        safeErrorFields(insertError),
      );
      return jsonResponse(
        {
          code: "persistence_failed",
          message: "Failed to store webhook event",
        },
        500,
        contract.responseHeaders,
      );
    }

    await updateStats(endpoint.id, false);
    const inserted = insertedData as { id?: unknown } | null;
    return jsonResponse(
      {
        ok: true,
        received: true,
        duplicate: false,
        event_id: typeof inserted?.id === "string" ? inserted.id : undefined,
        source: endpoint.source_system,
        event,
        contract_version: contract.version,
      },
      200,
      contract.responseHeaders,
    );
  } catch (error) {
    console.error("[webhook-inbound] unhandled error:", safeErrorFields(error));
    return jsonResponse({
      code: "internal_error",
      message: "Internal webhook processing error",
    }, 500);
  }
});
