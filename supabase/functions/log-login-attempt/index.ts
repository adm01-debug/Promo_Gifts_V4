import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";
import { RateLimiter, applyRateLimit } from "../_shared/rate-limiter.ts";
import { z } from "npm:zod@3.23.8";
import { createStructuredLogger, type StructuredLogger } from "../_shared/structured-logger.ts";
import { getOrCreateRequestId } from "../_shared/request-id.ts";

const LoginAttemptSchema = z.object({
  email: z.string().email().max(255).transform((e) => e.trim().toLowerCase()),
  user_id: z.string().uuid().nullish(),
  // Aceito por compatibilidade com clientes antigos, mas IGNORADO —
  // qualquer valor vindo do body é forjável. O IP gravado é o da conexão.
  ip_address: z.string().max(45).optional(),
  success: z.boolean(),
  failure_reason: z.string().max(500).nullish(),
  user_agent: z.string().max(512).nullish(),
});

// IP SEMPRE derivado da conexão. O gateway anexa o IP real como ÚLTIMO
// elemento do x-forwarded-for — o primeiro (e cf-connecting-ip /
// x-real-ip) pode vir do cliente e é forjável (Devin Review SEC_0001).
// Ordem: xff[last] → cf-connecting-ip → x-real-ip → 'unknown'.
function extractIP(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  const lastXff = xff?.split(",").pop()?.trim();
  return (
    (lastXff || undefined) ??
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// Rate limiter: 10 login log attempts per minute per IP
const loginLogLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000,
  keyPrefix: 'login-log',
});

/* ------------------------------------------------------------------ */
/* Onda 1 (G3): SSOT de degradação — sempre passa por este helper.     */
/* Emite log.warn("log_login_fallback", { reason, ... }) para o        */
/* App Health Dashboard e Sentry monitor agregarem 1 métrica única.   */
/* ------------------------------------------------------------------ */

type FallbackReason = "missing_env" | "db_insert_failed" | "internal_error" | "breaker_open";

function fallbackResponse(
  log: StructuredLogger,
  reason: FallbackReason,
  corsHeaders: Record<string, string>,
  breakerState: BreakerState,
  extra: Record<string, unknown> = {},
): Response {
  log.warn("log_login_fallback", { reason, breaker: breakerState, ...extra });
  return new Response(
    JSON.stringify({ ok: false, fallback: true, reason }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-LLA-Breaker": breakerState,
      },
    },
  );
}

/* ------------------------------------------------------------------ */
/* Onda 2 (G4): Circuit breaker in-memory.                              */
/* Estado por instância (edge worker). 5 falhas consecutivas em 30s    */
/* abre o breaker por 60s → pula DB e vai direto ao fallback.          */
/* ------------------------------------------------------------------ */

type BreakerState = "closed" | "open" | "half-open";

const BREAKER_THRESHOLD = 5;
const BREAKER_WINDOW_MS = 30_000;
const BREAKER_COOLDOWN_MS = 60_000;

interface BreakerInternal {
  failures: number[]; // timestamps of recent failures
  openedAt: number | null;
}

const breaker: BreakerInternal = { failures: [], openedAt: null };

function getBreakerState(now: number = Date.now()): BreakerState {
  if (breaker.openedAt === null) return "closed";
  const elapsed = now - breaker.openedAt;
  if (elapsed >= BREAKER_COOLDOWN_MS) return "half-open";
  return "open";
}

function recordBreakerSuccess(): void {
  breaker.failures = [];
  breaker.openedAt = null;
}

function recordBreakerFailure(now: number = Date.now()): void {
  // GC failures fora da janela
  breaker.failures = breaker.failures.filter((t) => now - t < BREAKER_WINDOW_MS);
  breaker.failures.push(now);
  if (breaker.failures.length >= BREAKER_THRESHOLD && breaker.openedAt === null) {
    breaker.openedAt = now;
  }
}

/** Test-only reset (nunca chamado em produção). */
export function __resetBreakerForTests(): void {
  breaker.failures = [];
  breaker.openedAt = null;
}

export async function handleLogLoginAttempt(req: Request): Promise<Response> {
  const requestId = getOrCreateRequestId(req);
  const log = createStructuredLogger({ fn: "log-login-attempt", requestId, req });

  const corsHeaders = getCorsHeaders(req);
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;

  // DIAGNOSTIC: Check project ID consistency in Edge Runtime
  const envUrl = Deno.env.get("SUPABASE_URL") || "";
  const CANONICAL_ID = "doufsxqlfjyuvxuezpln";
  if (!envUrl.includes(CANONICAL_ID)) {
    console.error(`[CRITICAL] Edge Function Project Mismatch: Environment URL is ${envUrl}, expected ID ${CANONICAL_ID}`);
    log.error("project_mismatch", { current_url: envUrl, expected_id: CANONICAL_ID });
  }

  try {
    // Rate limit by IP
    const rateLimitResponse = await applyRateLimit(req, loginLogLimiter);
    if (rateLimitResponse) {
      log.warn("rate_limit_exceeded");
      const headers = new Headers(rateLimitResponse.headers);
      Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
      headers.set("X-LLA-Breaker", getBreakerState());
      return new Response(rateLimitResponse.body, {
        status: rateLimitResponse.status,
        headers,
      });
    }

    let body: unknown;
    try {
      const text = await req.text();
      if (!text.trim()) {
        return new Response(
          JSON.stringify({ error: "Empty request body" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      body = JSON.parse(text);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const parsed = LoginAttemptSchema.safeParse(body);
    if (!parsed.success) {
      log.warn("invalid_payload", { errors: parsed.error.flatten().fieldErrors });
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { email, user_id, success, failure_reason, user_agent } = parsed.data;
    const ip_address = extractIP(req);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      log.error("missing_env_vars", { url: !!supabaseUrl, key: !!serviceRoleKey });
      return fallbackResponse(log, "missing_env", corsHeaders, getBreakerState());
    }

    // Circuit breaker: se open, pula DB.
    const breakerState = getBreakerState();
    if (breakerState === "open") {
      return fallbackResponse(log, "breaker_open", corsHeaders, "open", {
        failures_in_window: breaker.failures.length,
      });
    }

    // Use service_role to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Onda 5 (C1): uma linha success=true só zera o contador de lockout
    // (fn_check_login_allowed) quando verified=true — exige prova de
    // sessão: o Authorization Bearer precisa resolver via auth.getUser
    // para um usuário cujo e-mail é o do body. Sem isso, um POST anônimo
    // com {email, success:true} zerava o lockout de qualquer conta.
    // success sem prova → verified=false (linha gravada p/ auditoria,
    // inerte para o lockout). Falha na validação NUNCA impede o insert.
    let verified = false;
    if (success) {
      const authHeader = req.headers.get("authorization") ?? "";
      const bearer = authHeader.replace(/^bearer\s+/i, "").trim();
      if (bearer) {
        try {
          const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(bearer);
          verified =
            !userErr &&
            !!userData?.user?.email &&
            userData.user.email.toLowerCase() === email;
          if (!verified) {
            log.warn("session_proof_mismatch", {
              has_user: !!userData?.user,
              user_err: userErr?.message ?? null,
            });
          }
        } catch (e) {
          log.warn("session_proof_error", {
            err: e instanceof Error ? e.message : String(e),
          });
        }
      } else {
        log.warn("success_without_session_proof");
      }
    }

    const { error } = await supabaseAdmin.from("login_attempts").insert({
      email,
      user_id: user_id || null,
      ip_address,
      success,
      verified,
      failure_reason: failure_reason || null,
      user_agent: user_agent || null,
    });

    if (error) {
      log.error("db_insert_failed", {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      recordBreakerFailure();
      return fallbackResponse(log, "db_insert_failed", corsHeaders, getBreakerState(), {
        sqlstate: error.code,
      });
    }

    // Sucesso → reseta breaker (fecha se estava half-open).
    recordBreakerSuccess();

    log.info("login_attempt_logged", { email, success, verified });
    return log.respond(new Response(
      JSON.stringify({ ok: true, verified }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-LLA-Breaker": "closed",
        },
      }
    ));
  } catch (err) {
    log.error("internal_error", { err: err instanceof Error ? err.message : String(err) });
    return fallbackResponse(log, "internal_error", corsHeaders, getBreakerState());
  }
}

Deno.serve(handleLogLoginAttempt);
