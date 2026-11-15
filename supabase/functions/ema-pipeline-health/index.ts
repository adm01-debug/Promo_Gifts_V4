import { authorize } from "../_shared/authorize.ts";
import {
  getCorsHeaders,
  handleCorsPreflightIfNeeded,
} from "../_shared/cors.ts";
import { createStructuredLogger } from "../_shared/structured-logger.ts";
import { getOrCreateRequestId } from "../_shared/request-id.ts";
import {
  buildEmaHealthResponse,
  type RuptureHealthCheckRow,
  type RuptureQuickStatsRow,
} from "./handler.ts";

function jsonResponse(
  body: unknown,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const requestId = getOrCreateRequestId(req);
  const log = createStructuredLogger({ fn: "ema-pipeline-health", requestId, req });
  log.info("request_start");

  const preflight = handleCorsPreflightIfNeeded(req);
  if (preflight) return log.respond(preflight);

  const corsHeaders = getCorsHeaders(req);
  if (req.method !== "GET" && req.method !== "POST") {
    return log.respond(jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders));
  }

  const auth = await authorize(req, { requireRole: "dev" });
  if (!auth.ok) return log.respond(auth.response);

  try {
    const [checksResult, quickStatsResult] = await Promise.all([
      auth.supabaseAdmin.rpc("fn_rupture_health_check"),
      auth.supabaseAdmin.rpc("fn_rupture_quick_stats"),
    ]);

    if (checksResult.error || quickStatsResult.error) {
      log.error("ema_health_source_failed", {
        checks: checksResult.error?.message,
        quick_stats: quickStatsResult.error?.message,
      });
      return log.respond(jsonResponse(
        {
          error: "ema_health_source_failed",
          sources: {
            rupture_health_check: checksResult.error ? "failed" : "ok",
            rupture_quick_stats: quickStatsResult.error ? "failed" : "ok",
          },
        },
        502,
        corsHeaders,
      ));
    }

    const response = buildEmaHealthResponse(
      (checksResult.data ?? []) as RuptureHealthCheckRow[],
      (quickStatsResult.data ?? []) as RuptureQuickStatsRow[],
    );
    log.info("request_ok");
    return log.respond(jsonResponse(response, 200, corsHeaders));
  } catch (error) {
    log.error("request_failed", { err: error });
    return log.respond(jsonResponse({ error: "internal_error" }, 500, corsHeaders));
  }
});
