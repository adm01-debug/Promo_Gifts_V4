/**
 * createEdge — template unificado para Edge Functions do PromoGifts.
 *
 * Resolve o problema de 4 padrões de auth coexistindo em 83 funções.
 * Novas edges devem usar este template. Migração das existentes é gradual.
 *
 * Modos suportados:
 *   jwt     → JWT obrigatório + verificação de role (usa _shared/auth.ts)
 *   cron    → x-cron-secret timing-safe (usa _shared/dispatcher-auth.ts)
 *   hmac    → HMAC de payload (usar diretamente dispatcher-auth.ts)
 *   public  → sem auth; bot-protection opcional (explicitamente declarado)
 *
 * Uso:
 *   export default createEdge(
 *     { auth: 'jwt', role: 'vendedor' },
 *     async (req, ctx) => {
 *       const { userId, userRole } = ctx;
 *       return new Response(JSON.stringify({ ok: true }), { status: 200 });
 *     }
 *   );
 *
 * Para crons:
 *   export default createEdge(
 *     { auth: 'cron', secretEnv: 'CRON_SECRET' },
 *     async (req, _ctx) => { ... }
 *   );
 */

import { getCorsHeaders, buildPublicCorsHeaders } from "./cors.ts";
import {
  authenticateRequest,
  requireRole,
  authErrorResponse,
  type AuthResult,
} from "./auth.ts";
import { authorizeCron } from "./dispatcher-auth.ts";
import { getOrCreateRequestId, REQUEST_ID_HEADER } from "./request-id.ts";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

// Roles reais em user_roles: 'vendedor' (tier-base), 'admin' (== supervisor),
// 'dev'. 'agente'/'supervisor' permanecem como aliases historicos aceitos por
// requireRole (ver _shared/auth.ts).
export type EdgeRole = "vendedor" | "agente" | "supervisor" | "admin" | "dev";

export type EdgeConfig =
  | { auth: "jwt"; role?: EdgeRole }
  | { auth: "cron"; secretEnv: string; headerName?: string }
  | { auth: "public" };

export interface EdgeContext {
  /** Presente apenas no modo 'jwt'. */
  user?: Pick<AuthResult, "userId" | "userRole" | "userRoles" | "localServiceClient">;
  corsHeaders: Record<string, string>;
  /** Correlation ID — propagado do header X-Request-Id ou gerado na borda. */
  requestId: string;
}

export type EdgeHandler = (
  req: Request,
  ctx: EdgeContext,
) => Promise<Response>;

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/** Descrimina erros de auth lançados por authenticateRequest/requireRole. */
interface HttpError { status: number; message?: string; }
function isHttpError(err: unknown): err is HttpError {
  return (
    typeof err === "object" &&
    err !== null &&
    typeof (err as Record<string, unknown>).status === "number"
  );
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createEdge(
  config: EdgeConfig,
  handler: EdgeHandler,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    // Correlation ID — propagado pelo cliente ou gerado aqui.
    const requestId = getOrCreateRequestId(req);

    // CORS headers — modo public usa buildPublicCorsHeaders
    const corsHeaders =
      config.auth === "public"
        ? buildPublicCorsHeaders()
        : getCorsHeaders(req);

    // Preflight OPTIONS — responde sempre (inclui X-Request-Id para correlação)
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: { ...corsHeaders, [REQUEST_ID_HEADER]: requestId },
        status: 204,
      });
    }

    try {
      // ── Modo jwt ──────────────────────────────────────────────────────────
      if (config.auth === "jwt") {
        const auth = await authenticateRequest(req);
        if (config.role) requireRole(auth, config.role);
        return await handler(req, { user: auth, corsHeaders, requestId });
      }

      // ── Modo cron ─────────────────────────────────────────────────────────
      if (config.auth === "cron") {
        const result = await authorizeCron(req, {
          corsHeaders,
          secretEnvName: config.secretEnv,
          headerName: config.headerName ?? "x-cron-secret",
        });
        if (!result.ok) return result.response;
        return await handler(req, { corsHeaders, requestId });
      }

      // ── Modo public ───────────────────────────────────────────────────────
      return await handler(req, { corsHeaders, requestId });

    } catch (err) {
      // Erros lançados por authenticateRequest / requireRole (status + message)
      if (isHttpError(err)) {
        return authErrorResponse(err, corsHeaders);
      }
      // Erros inesperados — inclui requestId para correlação nos logs do cliente
      console.error("[createEdge] unhandled error:", requestId, err);
      return new Response(
        JSON.stringify({ error: "internal_error", request_id: requestId }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            [REQUEST_ID_HEADER]: requestId,
          },
        },
      );
    }
  };
}

// ---------------------------------------------------------------------------
// Helper: resposta JSON padronizada
// ---------------------------------------------------------------------------

export function jsonResponse(
  body: unknown,
  status = 200,
  corsHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
