// supabase/functions/_shared/security.ts
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

/**
 * Relação de telemetria que aceita bloqueios sem usuário ou UUID de entidade.
 *
 * `audit_log` é reservado para INSERT/UPDATE/DELETE sobre entidades UUID; não é
 * compatível com rate limit. Esta forma é confirmada via pg_catalog no Gold.
 */
export const SECURITY_EVENT_TABLE = 'bot_detection_log';

export type SecurityEventRow = {
  detection_type: string;
  action_taken: string;
  blocked: boolean;
  ip_address: string;
  user_agent: string | null;
  metadata: Record<string, unknown>;
};

export type SecurityEventClient = {
  from: (relation: typeof SECURITY_EVENT_TABLE) => {
    insert: (row: SecurityEventRow) => Promise<{ error: { message?: string } | null }>;
  };
};

/**
 * Preserva o contrato visual existente: `endpoint` e `request_count` são lidos
 * de `metadata` pelo painel administrativo porque o schema Gold não tem mais
 * essas colunas legadas.
 */
export function buildSecurityEventRow(
  eventType: string,
  endpoint: string,
  identifier: string,
  metadata: Record<string, unknown> = {},
  blocked = true,
): SecurityEventRow {
  const count = metadata.count;
  const requestCount = typeof count === 'number' && Number.isFinite(count)
    ? count
    : undefined;

  return {
    detection_type: eventType,
    action_taken: blocked ? 'blocked' : 'observed',
    blocked,
    ip_address: identifier,
    user_agent: typeof metadata.userAgent === 'string' ? metadata.userAgent : null,
    metadata: {
      ...metadata,
      endpoint,
      ...(requestCount === undefined ? {} : { request_count: requestCount }),
    },
  };
}

/**
 * Escrita best-effort: telemetria de segurança não pode derrubar a requisição
 * protegida. Retorna `false` para que testes/observabilidade possam distinguir
 * erro de auditoria sem transformar o caminho principal em falso sucesso.
 */
export async function writeSecurityEvent(
  client: SecurityEventClient,
  eventType: string,
  endpoint: string,
  identifier: string,
  metadata: Record<string, unknown> = {},
  blocked = true,
): Promise<boolean> {
  try {
    const { error } = await client
      .from(SECURITY_EVENT_TABLE)
      .insert(buildSecurityEventRow(eventType, endpoint, identifier, metadata, blocked));

    if (!error) return true;
    console.error('[security] Error logging audit event:', error.message ?? 'unknown error');
  } catch (error) {
    console.error('[security] Error logging audit event:', error);
  }
  return false;
}

/**
 * Loga bloqueios de segurança no contrato live de `bot_detection_log`.
 */
export async function logSecurityEvent(
  eventType: string,
  endpoint: string,
  identifier: string,
  metadata: Record<string, unknown> = {},
): Promise<boolean> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey) as unknown as SecurityEventClient;
  return writeSecurityEvent(supabase, eventType, endpoint, identifier, metadata);
}

/**
 * CSRF protection helper.
 * Validates the X-CSRF-Token header against a server-generated HMAC-SHA256 token.
 *
 * The token format is: <timestamp>.<hmac(secret, userId:timestamp)>
 * Tokens expire after TOKEN_MAX_AGE_MS. Only applied to cookie-based sessions.
 */
const TOKEN_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

async function hmacSign(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function validateCsrfToken(req: Request, userId?: string): Promise<void> {
  const cookies = req.headers.get('Cookie');
  if (!cookies || (!cookies.includes('sb-access-token') && !cookies.includes('sb-refresh-token'))) {
    return; // Not cookie-based — CSRF not required (Bearer header flow)
  }

  const csrfToken = req.headers.get('X-CSRF-Token');
  if (!csrfToken) {
    throw { status: 403, message: 'CSRF token ausente em requisição baseada em cookie' };
  }

  const parts = csrfToken.split('.');
  if (parts.length !== 2) {
    throw { status: 403, message: 'CSRF token malformado' };
  }

  const [tsStr, receivedHmac] = parts;
  const ts = parseInt(tsStr, 10);
  if (isNaN(ts) || Date.now() - ts > TOKEN_MAX_AGE_MS) {
    throw { status: 403, message: 'CSRF token expirado' };
  }

  const secret = Deno.env.get('CSRF_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret) {
    throw { status: 500, message: 'CSRF_SECRET not configured' };
  }
  if (!userId) {
    throw { status: 403, message: 'userId required for CSRF validation' };
  }
  const message = `${userId}:${tsStr}`;
  const expectedHmac = await hmacSign(secret, message);

  // Constant-time comparison to prevent timing attacks
  if (receivedHmac.length !== expectedHmac.length) {
    throw { status: 403, message: 'CSRF token inválido' };
  }
  let diff = 0;
  for (let i = 0; i < expectedHmac.length; i++) {
    diff |= receivedHmac.charCodeAt(i) ^ expectedHmac.charCodeAt(i);
  }
  if (diff !== 0) {
    throw { status: 403, message: 'CSRF token inválido' };
  }
}

/**
 * Generate a CSRF token for inclusion in API responses or HTML pages.
 * Format: <timestamp>.<hmac(secret, userId:timestamp)>
 */
export async function generateCsrfToken(userId: string): Promise<string> {
  const ts = Date.now().toString();
  const secret = Deno.env.get('CSRF_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret) {
    throw new Error('CSRF_SECRET not configured');
  }
  const message = `${userId}:${ts}`;
  const hmac = await hmacSign(secret, message);
  return `${ts}.${hmac}`;
}
