// supabase/functions/e2e-cleanup/index.ts
// Limpa dados de teste criados por suites E2E.
// Chamada pelo workflow ci.yml ao fim de cada run de testes E2E.

import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";
import { createStructuredLogger } from "../_shared/structured-logger.ts";
import { getOrCreateRequestId } from "../_shared/request-id.ts";

interface CleanupAuditRow {
  run_id: string;
  tables_cleaned: string[];
  rows_deleted: number;
  duration_ms: number;
  error?: string | null;
}

const TABLES_TO_CLEAN = [
  "quotes",
  "quote_items",
  "profiles",
  "products",
  "product_categories",
];

const E2E_MARKER = "e2e-test";

// deno-lint-ignore no-explicit-any
async function writeAudit(
  supabase: any,
  row: CleanupAuditRow,
): Promise<boolean> {
  const { error } = await supabase
    .from("e2e_cleanup_audit")
    .insert(row);
  if (error) {
    console.error("audit_write_failed", { error: error.message });
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  const requestId = getOrCreateRequestId(req);
  const log = createStructuredLogger({ fn: "e2e-cleanup", requestId, req });

  const corsHeaders = getCorsHeaders(req);
  const preflight = handleCorsPreflightIfNeeded(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return log.respond(
      new Response(JSON.stringify({ error: "method_not_allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    );
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const ciToken = Deno.env.get("E2E_CLEANUP_TOKEN");
  if (!ciToken || authHeader !== `Bearer ${ciToken}`) {
    return log.respond(
      new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    );
  }

  let body: { run_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine
  }

  const runId = body.run_id ?? `manual-${Date.now()}`;
  const startMs = Date.now();

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const tablesCleaned: string[] = [];
  let totalDeleted = 0;
  let cleanupError: string | null = null;

  for (const table of TABLES_TO_CLEAN) {
    try {
      const { count, error } = await supabase
        .from(table)
        .delete({ count: "exact" })
        .eq("e2e_marker", E2E_MARKER);

      if (error) {
        log.warn("table_cleanup_failed", { table, error: error.message });
        cleanupError = cleanupError ?? error.message;
        continue;
      }

      const deleted = count ?? 0;
      if (deleted > 0) {
        tablesCleaned.push(table);
        totalDeleted += deleted;
      }
      log.info("table_cleaned", { table, deleted });
    } catch (e) {
      log.warn("table_cleanup_exception", { table, error: (e as Error).message });
      cleanupError = cleanupError ?? (e as Error).message;
    }
  }

  const durationMs = Date.now() - startMs;
  const auditRow: CleanupAuditRow = {
    run_id: runId,
    tables_cleaned: tablesCleaned,
    rows_deleted: totalDeleted,
    duration_ms: durationMs,
    error: cleanupError,
  };

  await writeAudit(supabase, auditRow);

  log.info("cleanup_complete", { ...auditRow });

  return log.respond(
    new Response(
      JSON.stringify({
        ok: true,
        run_id: runId,
        tables_cleaned: tablesCleaned,
        rows_deleted: totalDeleted,
        duration_ms: durationMs,
        ...(cleanupError && { warning: cleanupError }),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    ),
  );
});
