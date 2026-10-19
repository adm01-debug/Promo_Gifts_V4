// supabase/functions/magazine-reader-state-read/index.ts
//
// Complementa B.2 (write): leitura do estado salvo (bookmarks/last-page)
// para o fetch inicial que useMagazineReaderState.ts faz ao montar.
// Sem esta edge, o cliente não teria como buscar o estado remoto sem
// acessar a tabela diretamente (o que a auditoria fechou por segurança).
//
// verify_jwt = false (leitor público) — ver supabase/config.toml.

import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { z } from "npm:zod@3.23.8";
import { handleCorsPreflight, buildPublicCorsHeaders } from "../_shared/cors.ts";
import { createStructuredLogger } from "../_shared/structured-logger.ts";
import { getOrCreateRequestId } from "../_shared/request-id.ts";
import { RateLimiter } from "../_shared/rate-limiter.ts";

const bodySchema = z.object({
  token: z.string().min(24).max(64).regex(/^[a-f0-9]+$/i),
  // E090: fingerprint mín 32 chars — previne brute-force de fingerprints curtos
  fingerprint: z.string().min(32).max(128),
});

// E090: rate limit chaveado em IP+token, não no fingerprint (rotação de fingerprint dava escrita ilimitada)
const readLimiter = new RateLimiter({ maxRequests: 30, windowMs: 60_000, keyPrefix: "mag-reader-read" });

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, { public: true });
  if (preflight) return preflight;

  const requestId = getOrCreateRequestId(req);
  const log = createStructuredLogger({ fn: "magazine-reader-state-read", requestId, req });
  const jsonHeaders = { ...buildPublicCorsHeaders(), "Content-Type": "application/json" };

  try {
    // E090: fingerprint não deve trafegar em query string (entra em logs de acesso e Referer)
    if (req.method !== "POST") {
      return log.respond(new Response(JSON.stringify({ error: "method_not_allowed", request_id: requestId }), { status: 405, headers: jsonHeaders }));
    }

    const body = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return log.respond(new Response(
        JSON.stringify({ error: "invalid_request", request_id: requestId, details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: jsonHeaders },
      ));
    }

    // E090: rate limit em IP+token (não em fingerprint — rotação de fingerprint contornaria)
    const xffRaw = req.headers.get("x-forwarded-for") ?? "";
    const xffParts = xffRaw.split(",").map((s) => s.trim()).filter(Boolean);
    const ip = xffParts[xffParts.length - 1] || "0.0.0.0";
    const rl = await readLimiter.check(`${ip}:${parsed.data.token.slice(0, 8)}`);
    if (!rl.allowed) {
      return log.respond(new Response(JSON.stringify({ error: "rate_limited", request_id: requestId }), { status: 429, headers: jsonHeaders }));
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    // Column is magazine_token_hash (SHA-256 of public_token), NOT magazine_token.
    const tokenHash = await sha256Hex(parsed.data.token);

    // Mesma checagem de -write: sem isto, um token revogado (revista
    // despublicada zera public_token via trigger) continua lendo o estado
    // salvo indefinidamente — fail-open onde as outras 3 edges públicas do
    // módulo (write, public-view, public-react) são fail-closed.
    const { data: mag, error: magErr } = await supabase
      .from("magazines").select("id").eq("public_token", parsed.data.token).eq("status", "published").maybeSingle();

    if (magErr) {
      log.error("db_error_lookup", { error: magErr.message });
      return log.respond(new Response(JSON.stringify({ error: "sync_disabled", request_id: requestId }), { status: 503, headers: jsonHeaders }));
    }
    if (!mag) {
      return log.respond(new Response(JSON.stringify({ error: "invalid_or_expired", request_id: requestId }), { status: 401, headers: jsonHeaders }));
    }

    const { data, error } = await supabase
      .from("magazine_reader_state")
      .select("bookmarks, last_page_index")
      .eq("magazine_token_hash", tokenHash)
      .eq("viewer_fingerprint", parsed.data.fingerprint)
      .maybeSingle();

    if (error) {
      log.warn("db_error", { error: error.message });
      return log.respond(new Response(JSON.stringify({ error: "sync_disabled", request_id: requestId }), { status: 503, headers: jsonHeaders }));
    }

    return log.respond(new Response(
      JSON.stringify({ bookmarks: data?.bookmarks ?? [], lastPageIndex: data?.last_page_index ?? 0, request_id: requestId }),
      { status: 200, headers: jsonHeaders },
    ));
  } catch (err) {
    log.error("unhandled_exception", { err });
    return log.respond(new Response(JSON.stringify({ error: "internal_error", request_id: requestId }), { status: 500, headers: jsonHeaders }));
  }
});
