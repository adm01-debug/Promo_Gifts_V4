import { getCorsHeaders } from '../_shared/cors.ts';
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://esm.sh/zod@3.23.8";
import { runBotProtection } from '../_shared/bot-protection.ts';
import { getBreaker } from '../_shared/circuit-breaker.ts';
import { circuitOpenResponse, CircuitOpenError, getAllBreakerStatuses } from '../_shared/external-fetch.ts';
import { AsyncLocalStorage } from "node:async_hooks";
import { getOrCreateRequestId, REQUEST_ID_HEADER } from "../_shared/request-id.ts";
import { resolveCredentials, warmupCredentials, buildCredentialsHealth } from "../_shared/credentials.ts";
import { assertSwitchEnabled } from "../_shared/kill_switch.ts";
import { readJwtAal } from "../_shared/authorize.ts";
import {
  addCompanyAddressFilterSelect,
  buildSellerScopedSelect,
  CRM_TABLES,
  hasMutationTarget,
  INTERNAL_ADDRESS_ALIAS,
  isCrmTable,
  isRestrictedWriteRole,
  isSellerScopedRole,
  isTransientCrmFailure,
  mapPostgrestErrorStatus,
  sellerScopeFilter,
  splitCompanyAddressFilters,
  stripInternalRelations,
  validateQueryColumns,
  type CrmTable,
} from "./query-policy.ts";

const breaker = getBreaker("crm-db");
// redeploy marker: fix 429 - auth-first + rate-limit por userId + admin singleton (2026-05-26)

// P1-05: lista canônica das credenciais CRM. Usada por warmup top-level e
// pelos resolveCredentials() bulk em hot paths. Manter sincronizada com
// crm-db-bridge:getCrmClient e com qualquer outro caller de creds CRM.
const CRM_CRED_NAMES = [
  "EXTERNAL_CRM_URL",
  "EXTERNAL_CRM_SERVICE_ROLE_KEY",
  "EXTERNAL_CRM_ANON_KEY",
] as const;

// Warmup top-level (executa 1x no boot do isolate). Bug P1-05: antes desta
// chamada, cada cold start disparava 3 queries individuais em paralelo à
// integration_credentials. Agora: 1 query bulk, cache preenchido, próximos
// resolveCredential() viram cache hits.
warmupCredentials(CRM_CRED_NAMES).catch((e) => {
  console.warn("[crm-db-bridge] warmupCredentials failed (non-fatal):", e);
});

const requestCtx = new AsyncLocalStorage<{
  requestId: string;
  corsHeaders: Record<string, string>;
}>();
function currentRequestId(): string | undefined {
  return requestCtx.getStore()?.requestId;
}
function currentCorsHeaders(): Record<string, string> {
  return requestCtx.getStore()?.corsHeaders ?? {};
}

let cachedCrmClient: SupabaseClient | null = null;
let cachedCrmCredentialFingerprint: string | null = null;
let crmWarmupPromise: Promise<void> | null = null;
let crmWarmupCompleted = false;

// Auth admin client singleton - evita recriar TLS handshake a cada request.
// Antes era criado em CADA request em authenticateRequest() -> N handshakes paralelos.
let _authAdminClient: SupabaseClient | null = null;
function getAuthAdminClient(): SupabaseClient {
  if (_authAdminClient) return _authAdminClient;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  _authAdminClient = createClient(supabaseUrl, supabaseServiceKey);
  return _authAdminClient;
}

const isolateBootedAt = Date.now();
const isolateMonoStart = performance.now();
let clientBuildMs: number | null = null;
let warmupStartedAtMs: number | null = null;
let warmupMs: number | null = null;
let warmupOk = false;
let warmupError: string | null = null;
let firstRequestMs: number | null = null;
let firstRequestStartedAtMs: number | null = null;
let requestCount = 0;
let coldRequestCount = 0;

function buildCrmClient(url: string, key: string): SupabaseClient {
  const t0 = performance.now();
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  if (clientBuildMs === null) {
    clientBuildMs = Math.round(performance.now() - t0);
    console.log(`[crm-boot] client_build_ms=${clientBuildMs}`);
  }
  return client;
}

export async function getCrmClient(): Promise<SupabaseClient | null> {
  // P1-05: bulk fetch (1 query DB) em vez de Promise.all([3x resolveCredential])
  // (3 queries paralelas). Em isolate aquecido por warmupCredentials, esses
  // 3 nomes saem do cache instantaneamente.
  const creds = await resolveCredentials([...CRM_CRED_NAMES]);
  const url = creds["EXTERNAL_CRM_URL"]?.value;
  const serviceKey = creds["EXTERNAL_CRM_SERVICE_ROLE_KEY"]?.value;
  const anonKey = creds["EXTERNAL_CRM_ANON_KEY"]?.value;
  const key = serviceKey ?? anonKey;
  if (!url || !key) {
    cachedCrmClient = null;
    cachedCrmCredentialFingerprint = null;
    return null;
  }
  const fingerprintBytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${url}\u0000${key}`),
  );
  const fingerprint = Array.from(new Uint8Array(fingerprintBytes), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  if (cachedCrmClient && cachedCrmCredentialFingerprint === fingerprint) return cachedCrmClient;
  cachedCrmClient = buildCrmClient(url, key);
  cachedCrmCredentialFingerprint = fingerprint;
  return cachedCrmClient;
}

export function __getClientBootStateForTests() {
  return { cached: cachedCrmClient, clientBuildMs };
}

function warmupCrmClient(): Promise<void> {
  if (crmWarmupPromise) return crmWarmupPromise;
  warmupStartedAtMs = Math.round(performance.now() - isolateMonoStart);
  crmWarmupPromise = (async () => {
    const t0 = performance.now();
    try {
      const client = await getCrmClient();
      if (!client) {
        warmupError = 'CRM_SUPABASE_URL/KEY not configured';
        console.warn(`[crm-boot-warmup] warmup error: ${warmupError}`);
        warmupMs = Math.round(performance.now() - t0);
        return;
      }
      const { error } = await client.from('companies').select('id').limit(1);
      warmupMs = Math.round(performance.now() - t0);
      if (error) {
        warmupError = error.message;
        console.warn(`[crm-boot-warmup] warmup_ms=${warmupMs} error="${error.message}"`);
      } else {
        warmupOk = true;
        crmWarmupCompleted = true;
        console.log(`[crm-boot-warmup] ready client_build_ms=${clientBuildMs} warmup_started_at_ms=${warmupStartedAtMs} warmup_ms=${warmupMs}`);
      }
    } catch (e) {
      warmupMs = Math.round(performance.now() - t0);
      warmupError = e instanceof Error ? e.message : String(e);
      console.warn(`[crm-boot-warmup] warmup_ms=${warmupMs} ${warmupError}`);
    }
  })();
  return crmWarmupPromise;
}

// Warmup is intentionally fire-and-forget; the function records its own errors.
void warmupCrmClient();

function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  const reqId = currentRequestId();
  let finalBody: unknown = body;
  if (reqId && body && typeof body === "object" && !Array.isArray(body)) {
    finalBody = { ...(body as Record<string, unknown>), request_id: reqId };
  }
  const headers: Record<string, string> = { ...currentCorsHeaders(), ...extraHeaders, "Content-Type": "application/json" };
  if (reqId) headers[REQUEST_ID_HEADER] = reqId;
  return new Response(JSON.stringify(finalBody), { status, headers });
}

type DiagOp = "ping" | "diag" | "breaker_status" | "creds_health";

async function detectDiagOp(req: Request): Promise<DiagOp | null> {
  try {
    const url = new URL(req.url);
    const op = url.searchParams.get("op");
    if (op === "ping" || op === "diag" || op === "breaker_status" || op === "creds_health") return op;
    if (url.searchParams.get("ping") === "1") return "ping";
    if (url.searchParams.get("diag") === "1") return "diag";
    if (url.searchParams.get("breaker") === "1") return "breaker_status";
    if (url.searchParams.get("creds") === "1") return "creds_health";
  } catch { /* ignore */ }

  if (req.method !== "GET" && req.method !== "HEAD") {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      try {
        const cloned = req.clone();
        const peek = await cloned.json() as { operation?: unknown };
        if (peek?.operation === "ping" || peek?.operation === "diag" || peek?.operation === "breaker_status" || peek?.operation === "creds_health") {
          return peek.operation as DiagOp;
        }
      } catch { /* ignore */ }
    }
  }
  return null;
}

async function buildCredsHealthSnapshot() {
  return await buildCredentialsHealth([
    "EXTERNAL_CRM_URL",
    "EXTERNAL_CRM_SERVICE_ROLE_KEY",
    "EXTERNAL_CRM_ANON_KEY",
  ]);
}

function buildDiagSnapshot() {
  const now = Date.now();
  return {
    ok: true, ts: now, warm: crmWarmupCompleted,
    isolate: { booted_at: isolateBootedAt, age_ms: now - isolateBootedAt, request_count: requestCount, cold_request_count: coldRequestCount },
    boot: { client_build_ms: clientBuildMs, warmup_started_at_ms: warmupStartedAtMs, warmup_ms: warmupMs, warmup_ok: warmupOk, warmup_error: warmupError },
    runtime: { first_request_started_at_ms: firstRequestStartedAtMs, first_request_ms: firstRequestMs },
  };
}

const ALLOWED_TABLES: readonly string[] = CRM_TABLES;

const VENDOR_WRITE_TABLES: string[] = [];
const OPTIONAL_QUOTE_TABLES = new Set<string>();

export function toRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object") return null;
  if (Array.isArray(value)) return null;
  const maybeErr = value as { error?: unknown; message?: unknown };
  if (maybeErr.error === true && typeof maybeErr.message === "string") return null;
  return value as Record<string, unknown>;
}

export function firstRowAsRecord(result: unknown): Record<string, unknown> | null {
  if (!Array.isArray(result) || result.length === 0) return null;
  return toRecord(result[0]);
}

export type InsertResultShape = "rows" | "empty-array" | "null" | "generic-string-error" | "single-object" | "primitive" | "unknown";

export interface InsertResultDiagnostic {
  shape: InsertResultShape;
  rowCount: number;
  preview: string;
  errorMessage?: string;
}

const PREVIEW_MAX = 400;

function previewValue(value: unknown): string {
  try {
    const json = JSON.stringify(value);
    if (!json) return String(value);
    return json.length > PREVIEW_MAX ? `${json.slice(0, PREVIEW_MAX)}...` : json;
  } catch {
    return String(value);
  }
}

export function inspectInsertResult(value: unknown): InsertResultDiagnostic {
  if (value === null) return { shape: "null", rowCount: 0, preview: "null" };
  if (value === undefined) return { shape: "null", rowCount: 0, preview: "undefined" };

  if (Array.isArray(value)) {
    if (value.length === 0) return { shape: "empty-array", rowCount: 0, preview: "[]" };
    const first = value[0];
    if (first && typeof first === "object" && !Array.isArray(first)) {
      const maybeErr = first as { error?: unknown; message?: unknown };
      if (maybeErr.error === true && typeof maybeErr.message === "string") {
        return { shape: "generic-string-error", rowCount: value.length, preview: previewValue(value), errorMessage: maybeErr.message };
      }
      return { shape: "rows", rowCount: value.length, preview: previewValue(value) };
    }
    return { shape: "unknown", rowCount: value.length, preview: previewValue(value) };
  }

  if (typeof value === "object") {
    const maybeErr = value as { error?: unknown; message?: unknown };
    if (maybeErr.error === true && typeof maybeErr.message === "string") {
      return { shape: "generic-string-error", rowCount: 0, preview: previewValue(value), errorMessage: maybeErr.message };
    }
    return { shape: "single-object", rowCount: 1, preview: previewValue(value) };
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return { shape: "primitive", rowCount: 0, preview: previewValue(value) };
  }
  return { shape: "unknown", rowCount: 0, preview: previewValue(value) };
}

export function logInsertResultIfAnomalous(
  context: { callSite: string; table: string; operation: "insert" | "update"; returning?: string },
  diagnostic: InsertResultDiagnostic,
): boolean {
  if (diagnostic.shape === "rows") return false;
  const payload = {
    event: "result-shape-anomaly",
    callSite: context.callSite,
    operation: context.operation,
    table: context.table,
    returning: context.returning ?? "*",
    shape: diagnostic.shape,
    rowCount: diagnostic.rowCount,
    errorMessage: diagnostic.errorMessage,
  };
  console.error(
    `[crm-db-bridge] result-shape-anomaly op=${context.operation} table=${context.table} shape=${diagnostic.shape}` +
      (diagnostic.errorMessage ? ` message="${diagnostic.errorMessage}"` : "") +
      ` -> ${JSON.stringify(payload)}`,
  );
  return true;
}

interface CrmQuery {
  table: string;
  operation: "select" | "search" | "insert" | "update" | "delete" | "batch";
  id?: string;
  filters?: Record<string, unknown>;
  select?: string;
  orderBy?: CrmOrderBy | CrmOrderBy[];
  limit?: number;
  offset?: number;
  search?: { column: string; term: string };
  relations?: string;
  data?: Record<string, unknown> | Record<string, unknown>[];
  returning?: string;
  queries?: BatchQuery[];
}

type CrmOrderBy = string | { column: string; ascending?: boolean };

interface BatchQuery {
  table: string;
  select?: string;
  filters?: Record<string, unknown>;
  orderBy?: CrmOrderBy | CrmOrderBy[];
  limit?: number;
  offset?: number;
  search?: { column: string; term: string };
}

interface AuthResult {
  userId: string | null;
  userEmail?: string | null;
  userRole: string;
  aal?: string | null;
  error?: Response;
}

interface PostgrestLikeError {
  code?: string;
  message?: string;
}

async function authenticateRequest(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { userId: null, userRole: "public", error: jsonResponse({ error: "Autenticacao necessaria" }, 401) };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (!user || userError) {
    console.error("CRM auth failed:", userError?.message);
    return { userId: null, userRole: "public", error: jsonResponse({ error: "Token invalido ou expirado" }, 401) };
  }

  // E083: usar .select() sem .single() — 0 rows → 403 (não cair para "vendedor");
  // 2+ rows possível em edge case → usar role mais alta encontrada.
  const adminClient = getAuthAdminClient();
  const { data: rolesData, error: rolesError } = await adminClient
    .from("user_roles").select("role").eq("user_id", user.id);

  if (rolesError) {
    console.error("CRM role fetch failed:", rolesError.message);
    return { userId: null, userRole: "public", error: jsonResponse({ error: "Falha ao verificar permissão" }, 403) };
  }
  if (!rolesData || rolesData.length === 0) {
    return { userId: null, userRole: "public", error: jsonResponse({ error: "Usuário sem perfil de acesso" }, 403) };
  }
  const ROLE_ORDER = ["dev", "admin", "supervisor", "manager", "coordenador", "vendedor", "agente"];
  const roles = rolesData.map((r: { role: string }) => r.role);
  const userRole = ROLE_ORDER.find((r) => roles.includes(r));
  if (!userRole) {
    return { userId: null, userRole: "public", error: jsonResponse({ error: "Perfil de acesso não reconhecido" }, 403) };
  }
  console.log(`Authenticated CRM request role=${userRole}`);
  const token = authHeader.slice(7).trim();
  return { userId: user.id, userEmail: user.email, userRole, aal: readJwtAal(token) };
}

// E084: escapar metacaracteres de ILIKE para evitar varredura por prefixo/suffix
function escapeLikePattern(term: string): string {
  return term.replace(/[%_*\\]/g, (c) => `\\${c}`);
}

function applyFilters(query: any, filters: Record<string, unknown>, prefix?: string): any {
  for (const [key, value] of Object.entries(filters)) {
    const column = prefix ? `${prefix}.${key}` : key;
    if (value === null) {
      query = query.is(column, null);
    } else if (typeof value === "object" && value !== null) {
      const f = value as Record<string, unknown>;
      if ("in" in f) query = query.in(column, f.in as unknown[]);
      // E084: escapar metacaracteres do ilike
      if ("ilike" in f) query = query.ilike(column, `%${escapeLikePattern(String(f.ilike))}%`);
      if ("eq" in f) query = query.eq(column, f.eq);
      if ("neq" in f) query = query.neq(column, f.neq as string);
      if ("gt" in f) query = query.gt(column, f.gt as string);
      if ("gte" in f) query = query.gte(column, f.gte as string);
      if ("lt" in f) query = query.lt(column, f.lt as string);
      if ("lte" in f) query = query.lte(column, f.lte as string);
      if ("not_null" in f) query = query.not(column, "is", null);
    } else {
      query = query.eq(column, value);
    }
  }
  return query;
}

function buildReadQuery(
  crm: SupabaseClient,
  table: CrmTable,
  select: string | undefined,
  filters: Record<string, unknown> | undefined,
  sellerId?: number,
  userRole?: string,
): any {
  const sellerScoped = isSellerScopedRole(userRole);
  const companyFilters = table === "companies"
    ? splitCompanyAddressFilters(filters)
    : { direct: filters ?? {}, address: {} };
  let selectFields = buildSellerScopedSelect(select, table, sellerScoped);
  selectFields = addCompanyAddressFilterSelect(selectFields, companyFilters.address);

  let query = crm.from(table).select(selectFields);
  if (sellerScoped) query = query.eq(sellerScopeFilter(table).column, sellerId ?? -1);
  query = applyFilters(query, companyFilters.direct);
  query = applyFilters(query, companyFilters.address, INTERNAL_ADDRESS_ALIAS);
  return query;
}

async function resolveCrmSellerId(
  crm: SupabaseClient,
  authUserId: string | null,
  userEmail?: string | null,
): Promise<{ sellerId?: number; error?: Response }> {
  if (!authUserId) {
    return { error: jsonResponse({ error: "Identidade canônica ausente" }, 403) };
  }

  const adminClient = getAuthAdminClient();
  const { data: existingLink, error: linkError, status: linkStatus } = await adminClient
    .from("crm_seller_identity_links")
    .select("crm_seller_id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (linkError) {
    return {
      error: jsonResponse(
        { error: "Falha ao consultar vínculo canônico do vendedor", code: linkError.code },
        mapPostgrestErrorStatus(linkError, linkStatus),
      ),
    };
  }

  if (existingLink) {
    const linkedSellerId = Number(existingLink.crm_seller_id);
    if (!Number.isSafeInteger(linkedSellerId) || linkedSellerId <= 0) {
      return { error: jsonResponse({ error: "Vínculo canônico de vendedor inválido" }, 409) };
    }
    const { data, error, status } = await crm
      .from("users")
      .select("id")
      .eq("id", linkedSellerId)
      .eq("is_active", true)
      .eq("is_vendedor", true)
      .limit(1);
    if (error) {
      return {
        error: jsonResponse(
          { error: "Falha ao validar vendedor vinculado no CRM", code: error.code },
          mapPostgrestErrorStatus(error, status),
        ),
      };
    }
    if (!data || data.length !== 1) {
      return { error: jsonResponse({ error: "Vínculo de vendedor inativo ou inexistente no CRM" }, 403) };
    }
    return { sellerId: linkedSellerId };
  }

  if (!userEmail) {
    return { error: jsonResponse({ error: "Usuário sem e-mail para mapeamento no CRM" }, 403) };
  }
  const { data, error, status } = await crm
    .from("users")
    .select("id")
    .eq("email", userEmail.trim().toLowerCase())
    .eq("is_active", true)
    .eq("is_vendedor", true)
    .limit(2);
  if (error) {
    const mappedStatus = mapPostgrestErrorStatus(error, status);
    return { error: jsonResponse({ error: "Falha ao mapear vendedor no CRM", code: error.code }, mappedStatus) };
  }
  if (!data || data.length === 0) {
    return { error: jsonResponse({ error: "Vendedor não mapeado no CRM" }, 403) };
  }
  if (data.length > 1 || typeof data[0]?.id !== "number") {
    return { error: jsonResponse({ error: "Mapeamento de vendedor ambíguo no CRM" }, 409) };
  }
  const sellerId = data[0].id;
  const { error: insertLinkError, status: insertLinkStatus } = await adminClient
    .from("crm_seller_identity_links")
    .insert({
      auth_user_id: authUserId,
      crm_seller_id: sellerId,
      link_source: "email_bootstrap",
    });
  if (insertLinkError) {
    if (insertLinkError.code === "23505") {
      const { data: racedLink } = await adminClient
        .from("crm_seller_identity_links")
        .select("crm_seller_id")
        .eq("auth_user_id", authUserId)
        .maybeSingle();
      if (Number(racedLink?.crm_seller_id) === sellerId) return { sellerId };
      return { error: jsonResponse({ error: "Vendedor do CRM já vinculado a outra identidade" }, 409) };
    }
    return {
      error: jsonResponse(
        { error: "Falha ao persistir vínculo canônico do vendedor", code: insertLinkError.code },
        mapPostgrestErrorStatus(insertLinkError, insertLinkStatus),
      ),
    };
  }
  return { sellerId };
}

function applyOrdering(query: any, orderBy: CrmOrderBy | CrmOrderBy[]): any {
  const clauses = Array.isArray(orderBy) ? orderBy : [orderBy];
  return clauses.reduce((current, clause) => {
    if (typeof clause === "string") {
      const [column, direction] = clause.trim().split(/\s+/);
      return current.order(column, { ascending: direction?.toLowerCase() !== "desc" });
    }
    return current.order(clause.column, { ascending: clause.ascending ?? true });
  }, query);
}

function isOptionalQuoteTable(table: string): boolean {
  return OPTIONAL_QUOTE_TABLES.has(table);
}

function isMissingTableError(error: PostgrestLikeError | null | undefined, table: string): boolean {
  if (!error) return false;
  const message = error.message || "";
  return error.code === "PGRST205" || message.includes(`Could not find the table 'public.${table}' in the schema cache`);
}

function getOptionalTableMessage(table: string): string {
  return `Modulo de orcamentos indisponivel no CRM externo (${table})`;
}

function createOptionalSelectFallback(table: string, isSingleRecord = false): Response {
  const warning = getOptionalTableMessage(table);
  console.warn(`[crm-db-bridge] ${warning} - retornando fallback vazio para leitura.`);
  return jsonResponse({ data: isSingleRecord ? null : [], count: 0, unavailable: true, warning });
}

function createOptionalWriteError(table: string): Response {
  const error = getOptionalTableMessage(table);
  console.warn(`[crm-db-bridge] ${error} - bloqueando operacao de escrita.`);
  return jsonResponse({ error }, 503);
}

async function generateQuoteNumber(crm: SupabaseClient, data: Record<string, unknown> | Record<string, unknown>[]): Promise<void> {
  const now = new Date();
  const yearShort = String(now.getFullYear()).slice(-2);

  const { data: lastQuotes } = await crm
    .from("quotes").select("quote_number")
    .ilike("quote_number", `%/${yearShort}`)
    .order("quote_number", { ascending: false }).limit(50);

  let maxNum = 10000;
  if (lastQuotes?.length) {
    for (const row of lastQuotes) {
      const parsed = parseInt((row.quote_number || "").replace(/\s+/g, "").split("/")[0] || "0", 10);
      if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
    }
  }

  const generatedNumber = `${maxNum + 1}/${yearShort}`;
  const rows = Array.isArray(data) ? data : [data];
  for (const row of rows) {
    if (!row.quote_number || row.quote_number === "") {
      row.quote_number = generatedNumber;
    }
  }
}

async function handleBatch(
  crm: SupabaseClient,
  queries: BatchQuery[],
  sellerId?: number,
  userRole?: string,
): Promise<Response> {
  if (!Array.isArray(queries) || queries.length === 0) {
    return jsonResponse({ error: 'Batch requires a non-empty "queries" array' }, 400);
  }
  if (queries.length > 10) {
    return jsonResponse({ error: "Batch limited to 10 queries max" }, 400);
  }

  for (const [index, query] of queries.entries()) {
    if (!isCrmTable(query.table)) {
      return jsonResponse({ error: `Table '${query.table}' not allowed`, query_index: index }, 400);
    }
    const validationError = validateQueryColumns(query, query.table);
    if (validationError) return jsonResponse({ error: validationError, query_index: index }, 400);
  }

  const batchStart = performance.now();
  const results = await Promise.all(
    queries.map(async (q, idx) => {
      const table = q.table as CrmTable;
      try {
        const queryStart = performance.now();
        let query = buildReadQuery(crm, table, q.select, q.filters, sellerId, userRole);
        // E084: escapar metacaracteres do ilike em batch
        if (q.search?.column && q.search?.term) query = query.ilike(q.search.column, `%${escapeLikePattern(q.search.term)}%`);
        if (q.orderBy) query = applyOrdering(query, q.orderBy);
        const effectiveLimit = q.limit ?? 500;
        query = query.limit(effectiveLimit);
        if (q.offset) query = query.range(q.offset, q.offset + effectiveLimit - 1);

        const { data, error, status } = await query;
        const duration = Math.round(performance.now() - queryStart);

        if (error) {
          if (isOptionalQuoteTable(table) && isMissingTableError(error, table)) {
            const warning = getOptionalTableMessage(table);
            return { success: true, unavailable: true, warning, data: { records: [], count: 0 } };
          }
          const mappedStatus = mapPostgrestErrorStatus(error, status);
          console.error(`[batch] Query ${idx} (${table}) error: ${error.message}`);
          return {
            success: false, error: error.message, code: error.code, status: mappedStatus,
            transient: isTransientCrmFailure(mappedStatus, error),
          };
        }
        const records = stripInternalRelations(data || []);
        console.log(`[batch] Query ${idx} (${table}) ${duration}ms, ${records.length} records`);
        return { success: true, data: { records, count: records.length } };
      } catch (err: unknown) {
        return {
          success: false, error: err instanceof Error ? err.message : "Unknown error",
          status: 503, transient: true,
        };
      }
    })
  );

  console.log(`[batch] Total: ${Math.round(performance.now() - batchStart)}ms for ${queries.length} queries`);
  const failures = results.filter((result) => !result.success);
  const allFailed = failures.length === results.length;
  const hasTransientFailure = failures.some((result) => "transient" in result && result.transient);
  const responseStatus = allFailed
    ? (hasTransientFailure ? 503 : ((failures[0] as { status?: number }).status ?? 500))
    : 200;
  return jsonResponse(
    { success: !allFailed, partial: failures.length > 0 && !allFailed, results },
    responseStatus,
    hasTransientFailure ? { "X-CRM-Transient-Failure": "1" } : {},
  );
}

async function handleInsert(crm: SupabaseClient, body: CrmQuery): Promise<Response> {
  const { table, data, returning } = body;
  if (!data) return jsonResponse({ error: "Insert requires 'data' field" }, 400);

  if (table === "quotes") await generateQuoteNumber(crm, data);

  const { data: result, error, status } = await crm.from(table).insert(data as any).select(returning || "*");

  if (!error) {
    const diag = inspectInsertResult(result);
    logInsertResultIfAnomalous({ callSite: "handleInsert", table, operation: "insert", returning: returning || "*" }, diag);
  }

  if (!error && table === "quotes") {
    const insertedRow = firstRowAsRecord(result);
    if (insertedRow) {
      const sourceRow = Array.isArray(data) ? toRecord(data[0]) : toRecord(data);
      const targetNumber = sourceRow?.quote_number;
      if (targetNumber && targetNumber !== "" && insertedRow.quote_number !== targetNumber) {
        await crm.from("quotes").update({ quote_number: targetNumber }).eq("id", insertedRow.id as string);
        insertedRow.quote_number = targetNumber;
      }
    }
  }

  if (error) {
    if (isOptionalQuoteTable(table) && isMissingTableError(error, table)) return createOptionalWriteError(table);
    console.error("CRM insert error:", { code: error.code ?? "unknown", message: error.message });
    return jsonResponse({ error: error.message, code: error.code }, mapPostgrestErrorStatus(error, status));
  }
  return jsonResponse({ data: result, count: result?.length || 0 });
}

async function handleUpdate(crm: SupabaseClient, body: CrmQuery): Promise<Response> {
  const { table, id, filters, data, returning } = body;
  if (!data) return jsonResponse({ error: "Update requires 'data' field" }, 400);
  if (!hasMutationTarget(id, filters)) {
    return jsonResponse({ error: "Update requires non-empty 'id' or 'filters' to prevent mass update" }, 400);
  }

  let query = crm.from(table).update(data as any);
  if (id) { query = query.eq("id", id); }
  else if (filters) { query = applyFilters(query, filters); }

  const { data: result, error, status } = await query.select(returning || "*");
  if (!error) {
    const diag = inspectInsertResult(result);
    logInsertResultIfAnomalous({ callSite: "handleUpdate", table, operation: "update", returning: returning || "*" }, diag);
  }
  if (error) {
    if (isOptionalQuoteTable(table) && isMissingTableError(error, table)) return createOptionalWriteError(table);
    console.error("CRM update error:", { code: error.code ?? "unknown", message: error.message });
    return jsonResponse({ error: error.message, code: error.code }, mapPostgrestErrorStatus(error, status));
  }
  return jsonResponse({ data: result, count: result?.length || 0 });
}

async function handleDelete(crm: SupabaseClient, body: CrmQuery): Promise<Response> {
  const { table, id, filters } = body;
  if (!hasMutationTarget(id, filters)) {
    return jsonResponse({ error: "Delete requires non-empty 'id' or 'filters' to prevent mass deletion" }, 400);
  }
  let query = crm.from(table).delete();

  if (id) { query = query.eq("id", id); }
  else if (filters) { query = applyFilters(query, filters); }

  const { error, status } = await query;
  if (error) {
    if (isOptionalQuoteTable(table) && isMissingTableError(error, table)) return createOptionalWriteError(table);
    console.error("CRM delete error:", { code: error.code ?? "unknown", message: error.message });
    return jsonResponse({ error: error.message, code: error.code }, mapPostgrestErrorStatus(error, status));
  }
  return jsonResponse({ data: null, success: true });
}

async function handleSelect(crm: SupabaseClient, body: CrmQuery, sellerId?: number, userRole?: string): Promise<Response> {
  const { table, id, filters, select, orderBy, limit, offset, search, relations } = body;
  if (relations) {
    return jsonResponse({ error: "Campo 'relations' não permitido (embedding PostgREST desabilitado)" }, 400);
  }
  if (!isCrmTable(table)) return jsonResponse({ error: `Table '${table}' is not allowed` }, 400);
  const validationError = validateQueryColumns(body, table);
  if (validationError) return jsonResponse({ error: validationError }, 400);
  const selectFields = select || "*";

  console.log(`[SELECT] table=${table}, select_fields=${selectFields.split(',').length}, filter_keys=${Object.keys(filters ?? {}).length}, limit=${limit ?? 'default'}`);

  let query = buildReadQuery(crm, table, select, filters, sellerId, userRole);

  if (id) {
    const { data, error, status } = await query.eq("id", id).single();
    if (error) {
      console.error(`[SELECT] single error: code=${error.code}, message=${error.message}`);
      if (isOptionalQuoteTable(table) && isMissingTableError(error, table)) return createOptionalSelectFallback(table, true);
      return jsonResponse({ error: error.message, code: error.code }, mapPostgrestErrorStatus(error, status));
    }
    return jsonResponse({ data: stripInternalRelations(data), count: 1 });
  }

  // E084: escapar metacaracteres do ilike
  if (search) query = query.ilike(search.column, `%${escapeLikePattern(search.term)}%`);
  if (orderBy) query = applyOrdering(query, orderBy);
  // Default cap (500) para evitar statement timeout em SELECT sem limite explícito.
  const effectiveLimit = limit ?? 500;
  query = query.limit(effectiveLimit);
  if (offset) query = query.range(offset, offset + effectiveLimit - 1);

  const { data, error, count, status, statusText } = await query;
  console.log(`[SELECT] result: status=${status}, statusText=${statusText}, dataLength=${(data || []).length}, hasError=${!!error}, count=${count}`);

  if (error) {
    if (isOptionalQuoteTable(table) && isMissingTableError(error, table)) return createOptionalSelectFallback(table, false);
    const mappedStatus = mapPostgrestErrorStatus(error, status);
    if (mappedStatus === 504) {
      console.warn(`[SELECT] statement_timeout em ${table} (limit=${effectiveLimit}). Reduza filtros ou paginação.`);
      return jsonResponse({
        error: "A consulta demorou demais. Refine os filtros ou reduza o limite.",
        code: "statement_timeout",
      }, 504);
    }
    return jsonResponse({ error: error.message, code: error.code }, mappedStatus);
  }
  return jsonResponse({ data: stripInternalRelations(data || []), count });
}

async function handleSearch(crm: SupabaseClient, body: CrmQuery, sellerId?: number, userRole?: string): Promise<Response> {
  const { table, search, select, filters, orderBy, limit } = body;
  if (!search?.column || !search?.term) {
    return jsonResponse({ error: "Search requires 'column' and 'term'" }, 400);
  }
  if (!isCrmTable(table)) return jsonResponse({ error: `Table '${table}' is not allowed` }, 400);
  const validationError = validateQueryColumns(body, table);
  if (validationError) return jsonResponse({ error: validationError }, 400);

  // E084: escapar metacaracteres do ilike em handleSearch
  let query = buildReadQuery(crm, table, select, filters, sellerId, userRole)
    .ilike(search.column, `%${escapeLikePattern(search.term)}%`);
  if (orderBy) query = applyOrdering(query, orderBy);
  query = query.limit(limit || 50);

  const { data, error, status } = await query;
  if (error) {
    if (isOptionalQuoteTable(table) && isMissingTableError(error, table)) return createOptionalSelectFallback(table, false);
    return jsonResponse({ error: error.message, code: error.code }, mapPostgrestErrorStatus(error, status));
  }
  const records = stripInternalRelations(data || []);
  return jsonResponse({ data: records, count: records.length });
}

Deno.serve((req) => {
  const requestId = getOrCreateRequestId(req);
  const corsHeaders = getCorsHeaders(req);
  return requestCtx.run({ requestId, corsHeaders }, async () => {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: { ...corsHeaders, [REQUEST_ID_HEADER]: requestId } });
    }

    const killResponse = await assertSwitchEnabled('edge_crm_db_bridge', req, corsHeaders);
    if (killResponse) return killResponse;

  const diagOp = await detectDiagOp(req);
  if (diagOp === "ping") {
    return jsonResponse({ ok: true, ts: Date.now() });
  }

  const reqStartedAt = performance.now();
  const wasCold = requestCount === 0;
  requestCount++;
  if (wasCold) coldRequestCount++;
  console.log(`[crm-db-bridge] [req_id=${requestId}] request_start method=${req.method} was_cold=${wasCold}`);

  try {
    // ── AUTH PRIMEIRO ────────────────────────────────────────────────────────────────────────────────
    // Bot-protection roda DEPOIS do auth para usar userId como chave de rate limit,
    // evitando falsos positivos quando multiplos usuarios compartilham o mesmo IP/NAT.
    //
    // BUG ANTERIOR: rate-limit por IP -> 1 usuario abrindo varias abas podia banir
    //   TODOS os colegas por 30 minutos (blockSeconds: 1800).
    // CORRECAO: rate-limit por userId -> cada usuario tem sua propria janela (300/min).
    // ───────────────────────────────────────────────────────────────────────────────────────────────────────
    const auth = await authenticateRequest(req);
    if (auth.error) return auth.error;

    const canReadDiagnostics = ["dev", "admin", "supervisor", "manager", "coordenador"].includes(auth.userRole);
    if (diagOp && !canReadDiagnostics) {
      return jsonResponse({ error: "Permissao insuficiente para diagnosticos" }, 403);
    }
    if (diagOp === "creds_health" && auth.aal !== "aal2") {
      return jsonResponse({ error: "aal2_required", message: "MFA assurance level 2 is required" }, 403);
    }

    // Hardening 4.6: Diagnosticos sensiveis exigem autenticacao e role elevada.
    if (diagOp === "diag") return jsonResponse(buildDiagSnapshot());
    if (diagOp === "creds_health") return jsonResponse(await buildCredsHealthSnapshot());
    if (diagOp === "breaker_status") {
      const all = getAllBreakerStatuses();
      const primary = all.find((b) => b.name === "crm-db") ?? all[0] ?? null;
      return jsonResponse({
        ok: true, ts: Date.now(),
        state: primary?.state ?? "UNKNOWN",
        failures: primary?.failures ?? 0,
        openedAt: primary?.openedAt ?? 0,
        willResetAt: primary?.willResetAt ?? null,
        breaker: primary, all,
      });
    }

    // Rate limit por userId (imune a IPs compartilhados/NAT corporativo).
    // 300 req/60s = ~5 req/s de headroom por usuario para paginas batch-heavy.
    // blockSeconds 120 (2 min) evita banimentos de 30 min por bursts transitorios.
    const protection = await runBotProtection(req, {
      endpoint: 'crm-db-bridge',
      maxRequests: 300,
      windowSeconds: 60,
      blockSeconds: 120,
      customIdentifier: auth.userId ?? undefined,
    }, corsHeaders);
    if (!protection.allowed) return protection.blockResponse!;

    // P1-05: bulk fetch em vez de Promise.all([3x resolveCredential]).
    const credsMap = await resolveCredentials([...CRM_CRED_NAMES]);
    const urlRes = credsMap["EXTERNAL_CRM_URL"];
    const svcRes = credsMap["EXTERNAL_CRM_SERVICE_ROLE_KEY"];
    const anonRes = credsMap["EXTERNAL_CRM_ANON_KEY"];
    const CRM_URL = urlRes?.value;
    const CRM_SERVICE_KEY = svcRes?.value;
    const CRM_ANON_VAL = anonRes?.value;
    const CRM_KEY = CRM_SERVICE_KEY || CRM_ANON_VAL;
    if (!CRM_URL || !CRM_KEY) {
      return jsonResponse({ error: "CRM database credentials not configured" }, 500);
    }

    const CRM_ANON = CRM_ANON_VAL ?? "";

    if (wasCold || Deno.env.get("LOG_CRM_BRIDGE_VERBOSE") === "on") {
      const using = CRM_SERVICE_KEY ? "SERVICE_KEY" : "ANON_KEY";
      const keySource = CRM_SERVICE_KEY ? svcRes?.source : anonRes?.source;
      console.log(JSON.stringify({
        evt: "crm-creds-resolved",
        url_source: urlRes?.source,
        url_via_alias: urlRes?.resolved_name !== "EXTERNAL_CRM_URL",
        using, key_source: keySource,
        keys_match: CRM_SERVICE_KEY === CRM_ANON,
      }));
    }

    const crm = await getCrmClient();
    if (!crm) {
      return jsonResponse({ error: "CRM database credentials not configured" }, 500);
    }

    let rawBody: unknown;
    try { rawBody = await req.json(); } catch {
      return jsonResponse({ error: "Invalid JSON in request body" }, 400);
    }

    const COLUMN_RE = /^[a-z_][a-z0-9_.]*$/i;
    const CrmOrderBySchema = z.union([
      z.string().regex(/^[a-z_][a-z0-9_.]*(\s+(asc|desc))?$/i),
      z.object({ column: z.string().regex(COLUMN_RE), ascending: z.boolean().optional() }),
    ]);
    const CrmFiltersSchema = z.record(z.unknown()).refine(
      (filters) => Object.keys(filters).length <= 20 && Object.keys(filters).every((key) => COLUMN_RE.test(key)),
      { message: "Filters must have at most 20 valid column identifiers" },
    );
    const CrmSearchSchema = z.object({
      column: z.string().regex(COLUMN_RE),
      term: z.string().min(1).max(500),
    });
    const BatchQuerySchema = z.object({
      table: z.string().trim().min(1).max(100).regex(/^[a-z_][a-z0-9_]*$/i),
      filters: CrmFiltersSchema.optional(),
      select: z.string().max(2000).optional(),
      orderBy: z.union([CrmOrderBySchema, z.array(CrmOrderBySchema).min(1).max(3)]).optional(),
      limit: z.number().int().min(1).max(1000).optional(),
      offset: z.number().int().min(0).optional(),
      search: CrmSearchSchema.optional(),
    }).strict();
    const CrmRequestSchema = z.object({
      operation: z.enum(["select", "search", "insert", "update", "delete", "batch"]),
      table: z.string().trim().min(1).max(100).regex(/^[a-z_][a-z0-9_]*$/i).optional(),
      id: z.string().uuid().optional(),
      filters: CrmFiltersSchema.optional(),
      select: z.string().max(2000).optional(),
      orderBy: z.union([CrmOrderBySchema, z.array(CrmOrderBySchema).min(1).max(3)]).optional(),
      limit: z.number().int().min(1).max(1000).optional(),
      offset: z.number().int().min(0).optional(),
      search: CrmSearchSchema.optional(),
      relations: z.string().max(2000).optional(),
      data: z.union([z.record(z.unknown()), z.array(z.record(z.unknown()))]).optional(),
      returning: z.string().max(2000).optional(),
      queries: z.array(BatchQuerySchema).max(10).optional(),
    });

    const parsed = CrmRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonResponse({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, 400);
    }

    const body = parsed.data as CrmQuery;
    const { operation, table } = body;

    const sellerScoped = isSellerScopedRole(auth.userRole);
    const restrictedWriter = isRestrictedWriteRole(auth.userRole);
    const mutatingOperation = ["insert", "update", "delete"].includes(operation);
    if (mutatingOperation && restrictedWriter) {
      if (!VENDOR_WRITE_TABLES.includes(table)) {
        return jsonResponse({ error: "Permissao insuficiente para modificar esta tabela" }, 403);
      }
    }
    if (mutatingOperation && auth.aal !== "aal2") {
      return jsonResponse({ error: "aal2_required", message: "MFA assurance level 2 is required" }, 403);
    }

    // E083: validar ALLOWED_TABLES ANTES do dispatch de batch (ponto único de decisão)
    if (operation !== "batch" && !ALLOWED_TABLES.includes(table)) {
      return jsonResponse({ error: `Table '${table}' is not allowed. Allowed: ${ALLOWED_TABLES.join(", ")}` }, 400);
    }
    if (operation !== "batch" && isCrmTable(table)) {
      const validationError = validateQueryColumns(body, table);
      if (validationError) return jsonResponse({ error: validationError }, 400);
    }

    // Somente uma operacao que efetivamente consultara o CRM pode consumir o
    // probe HALF_OPEN. Auth, diagnosticos, rate-limit e validacao ficam antes.
    if (!breaker.canRequest()) {
      return circuitOpenResponse(new CircuitOpenError("crm-db"), corsHeaders);
    }

    let crmSellerId: number | undefined;
    if (sellerScoped) {
      const sellerMapping = await resolveCrmSellerId(crm, auth.userId, auth.userEmail);
      if (sellerMapping.error) {
        if (isTransientCrmFailure(sellerMapping.error.status)) breaker.recordFailure();
        else breaker.recordSuccess();
        return sellerMapping.error;
      }
      crmSellerId = sellerMapping.sellerId;
    }

    let response: Response;
    switch (operation) {
      case "batch": response = await handleBatch(crm, body.queries || [], crmSellerId, auth.userRole); break;
      case "insert": response = await handleInsert(crm, body); break;
      case "update": response = await handleUpdate(crm, body); break;
      case "delete": response = await handleDelete(crm, body); break;
      // E081: propagar vendedor CRM e role para owner scoping de SELECT/SEARCH.
      case "select": response = await handleSelect(crm, body, crmSellerId, auth.userRole); break;
      case "search": response = await handleSearch(crm, body, crmSellerId, auth.userRole); break;
      default: return jsonResponse({ error: `Operation '${operation}' not supported.` }, 400);
    }
    const hasTransientBatchFailure = response.headers.get("X-CRM-Transient-Failure") === "1";
    if (hasTransientBatchFailure || isTransientCrmFailure(response.status)) breaker.recordFailure();
    else breaker.recordSuccess();

    const elapsed = Math.round(performance.now() - reqStartedAt);
    if (wasCold) {
      firstRequestMs = elapsed;
      firstRequestStartedAtMs = Math.round(reqStartedAt - isolateMonoStart);
      console.log(`[crm-runtime] [req_id=${requestId}] first_request_ms=${elapsed} was_cold=true op=${operation} table=${table ?? '-'} client_build_ms=${clientBuildMs} warmup_ms=${warmupMs} warmup_ok=${warmupOk}`);
    } else {
      console.log(`[crm-runtime] [req_id=${requestId}] request_ms=${elapsed} was_cold=false op=${operation} table=${table ?? '-'} request_count=${requestCount}`);
    }
    return response;
  } catch (error: unknown) {
    breaker.recordFailure();
    const elapsed = Math.round(performance.now() - reqStartedAt);
    console.error(`[crm-runtime] [req_id=${requestId}] error_ms=${elapsed} was_cold=${wasCold} ${error instanceof Error ? error.message : String(error)}`);
    return jsonResponse({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
  });
});
