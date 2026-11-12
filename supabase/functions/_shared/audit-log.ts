/**
 * Helpers para registrar entradas em `admin_audit_log` com os
 * campos enriquecidos (request_id, started_at/finished_at,
 * duration_ms, status, payload_summary, source).
 *
 * - `redactPayload` remove segredos antes de salvar.
 * - `summarizePayload` produz uma versão estruturada e curta.
 * - `writeAuditEntry` insere a linha usando o cliente service-role.
 */

// deno-lint-ignore no-explicit-any
type SupabaseAdmin = any;

/** Chaves cujo valor NUNCA pode ser persistido em texto puro. */
const SENSITIVE_KEYS = new Set([
  "key",
  "plain",
  "plain_key",
  "secret",
  "password",
  "token",
  "access_token",
  "refresh_token",
  "api_key",
  "apikey",
  "service_role_key",
  "authorization",
  "key_hash",
  "hash",
]);

/** Trunca strings longas e marca o tamanho original. */
function truncateString(value: string, max = 240): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…(+${value.length - max} chars)`;
}

/**
 * Remove/redige campos sensíveis recursivamente. Mantém estrutura
 * para que o auditor consiga ver QUE havia algo, sem expor o valor.
 */
export function redactPayload(input: unknown, depth = 0): unknown {
  if (depth > 6) return "[max_depth]";
  if (input === null || input === undefined) return input;
  if (typeof input === "string") return truncateString(input);
  if (typeof input === "number" || typeof input === "boolean") return input;
  if (Array.isArray(input)) {
    return input.slice(0, 50).map((v) => redactPayload(v, depth + 1));
  }
  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        if (typeof v === "string" && v.length > 0) {
          out[k] = `[redacted:${v.length}chars]`;
        } else {
          out[k] = "[redacted]";
        }
        continue;
      }
      out[k] = redactPayload(v, depth + 1);
    }
    return out;
  }
  return "[unsupported]";
}

/**
 * Gera um resumo estruturado: contagem de campos, lista das chaves
 * presentes (para diff rápido) e o payload já redigido (limitado).
 */
export function summarizePayload(payload: unknown): Record<string, unknown> {
  if (payload === null || payload === undefined) {
    return { present: false };
  }
  if (typeof payload !== "object" || Array.isArray(payload)) {
    return { present: true, kind: Array.isArray(payload) ? "array" : typeof payload, value: redactPayload(payload) };
  }
  const obj = payload as Record<string, unknown>;
  const keys = Object.keys(obj);
  return {
    present: true,
    kind: "object",
    field_count: keys.length,
    fields: keys,
    redacted: redactPayload(obj),
  };
}

export interface AuditEntryInput {
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  /** Detalhes ricos (legado) — continuam funcionando. */
  details?: Record<string, unknown>;
  /** Campos novos (Wave de hardening). */
  request_id: string;
  started_at: string;
  finished_at?: string;
  duration_ms?: number;
  status: "success" | "error" | "denied" | "partial";
  payload_summary?: Record<string, unknown>;
  source: string;
}

/**
 * Insere uma entrada enriquecida em `admin_audit_log` com o cliente
 * service-role já autenticado. Falhas de log são silenciadas (warn)
 * para nunca derrubar a operação principal.
 */
export async function writeAuditEntry(
  admin: SupabaseAdmin,
  entry: AuditEntryInput,
): Promise<void> {
  try {
    const finished = entry.finished_at ?? new Date().toISOString();
    const duration =
      entry.duration_ms ??
      Math.max(0, new Date(finished).getTime() - new Date(entry.started_at).getTime());

    await admin.from("admin_audit_log").insert({
      user_id: entry.user_id,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id ?? null,
      ip_address: entry.ip_address ?? null,
      user_agent: entry.user_agent ?? null,
      details: entry.details ?? {},
      request_id: entry.request_id,
      started_at: entry.started_at,
      finished_at: finished,
      duration_ms: duration,
      status: entry.status,
      payload_summary: entry.payload_summary ?? {},
      source: entry.source,
    });
  } catch (err) {
    console.warn("[audit-log] failed to write entry:", err instanceof Error ? err.message : err);
  }
}

/**
 * Fallback de `log_full_scope_grant`: grava o evento `full_scope_granted` em
 * `step_up_audit_log` com o cliente service-role quando a RPC não pode ser
 * executada pelo usuário. Mesmo formato de linha que a RPC produz.
 */
export async function insertFullScopeGrant(
  admin: SupabaseAdmin,
  userId: string,
  args: {
    _operation: string;
    _key_id: string;
    _key_prefix: string;
    _justification?: string | null;
    _confirmation_phrase_ok?: boolean | null;
    _expires_at?: string | null;
    _ip?: string | null;
    _user_agent?: string | null;
    _request_id?: string | null;
    _extra?: unknown;
  },
): Promise<{ error: { message: string } | null }> {
  const { error } = await admin.from("step_up_audit_log").insert({
    user_id: userId,
    action: args._operation === "escalate" ? "mcp_full_escalate" : "mcp_full_issue",
    target_ref: args._key_id,
    event_type: "full_scope_granted",
    ip_address: args._ip ?? null,
    user_agent: args._user_agent ?? null,
    metadata: {
      operation: args._operation,
      key_id: args._key_id,
      key_prefix: args._key_prefix,
      expires_at: args._expires_at ?? null,
      justification: args._justification ?? null,
      verifications: {
        is_dev_recheck: true,
        step_up_token_consumed: false,
        can_grant_mcp_full: true,
        confirmation_phrase_ok: args._confirmation_phrase_ok ?? true,
        has_justification: !!args._justification,
      },
      request_id: args._request_id ?? null,
      granted_at: new Date().toISOString(),
      extra: args._extra ?? {},
      via: "service_role_fallback",
    },
  });
  return { error };
}

/** Extrai IP/UA do request de forma consistente. */
export function extractRequestMeta(req: Request): { ip: string | null; ua: string | null } {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ??
    null;
  const ua = req.headers.get("user-agent") ?? null;
  return { ip, ua };
}
