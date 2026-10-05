/**
 * check-login — Edge Function pública (verify_jwt: false)
 *
 * Chamada ANTES de supabase.auth.signIn() para verificar se
 * o login deve ser permitido segundo as regras de
 * access_security_settings (IP whitelist, city whitelist, lockout).
 *
 * Delega toda a lógica para fn_check_login_allowed() no Postgres
 * (SECURITY DEFINER — acessa access_security_settings mesmo sem JWT).
 *
 * POST /functions/v1/check-login
 * Body: { email: string, city?: string }
 * Response 200: { allowed: true,  reason: 'allowed', ... }
 * Response 403: { allowed: false, reason: string, blocked_until?: string }
 *
 * Implantada em 2026-06-15 como Peça 4 do enforcement de segurança.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { buildPublicCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { createStructuredLogger } from '../_shared/structured-logger.ts';
import { getOrCreateRequestId } from '../_shared/request-id.ts';

const CORS = buildPublicCorsHeaders({ allowMethods: 'POST, OPTIONS' });

// ── Cloudflare Turnstile — anti-bot no login ───────────────────────
// Enforcement é controlado pela presença de TURNSTILE_SECRET_KEY nos secrets
// da edge: com secret configurada, o body PRECISA trazer turnstile_token
// válido (cliente envia quando VITE_TURNSTILE_SITE_KEY renderiza o widget).
// Sem secret → verificação desligada (feature inerte).
type TurnstileResult = 'passed' | 'failed' | 'unreachable';

async function verifyTurnstile(token: string, ip: string, secret: string): Promise<TurnstileResult> {
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }).toString(),
    });
    if (!res.ok) return 'unreachable';
    const data = (await res.json()) as { success?: boolean };
    return data?.success === true ? 'passed' : 'failed';
  } catch {
    return 'unreachable';
  }
}

// ── Extrai IP real: Cloudflare → X-Forwarded-For → X-Real-IP ───────
function extractIP(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

Deno.serve(async (req: Request) => {
  const __reqId = getOrCreateRequestId(req);
  const log = createStructuredLogger({ fn: 'check-login', requestId: __reqId, req });
  log.info('request_start');
  const preflight = handleCorsPreflight(req, { public: true });
  if (preflight) return preflight;

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'method_not_allowed' }),
      { status: 405, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }

  try {
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* body vazio — ok */ }

    const email      = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    // City MUST come from a trusted Cloudflare-proxied header — never from client body.
    // cf-ray alone is NOT sufficient: any caller can forge arbitrary headers on direct
    // Supabase URL calls, including cf-ray and cf-ipcity.
    // Guard: verify a pre-shared secret that Cloudflare Transform Rules inject as
    // X-Cf-Origin-Secret. Only when this secret matches CF_ORIGIN_SECRET (Supabase
    // Edge Function secret) do we trust cf-ipcity as Cloudflare-authoritative.
    // Without a matching secret, city = null — fn_check_login_allowed fails-closed
    // when city_whitelist_enabled=true, blocking the login from an unknown city.
    // Ops: set CF_ORIGIN_SECRET in Supabase secrets and configure Cloudflare Transform
    // Rule to inject X-Cf-Origin-Secret on every request to this function.
    const CF_ORIGIN_SECRET = Deno.env.get('CF_ORIGIN_SECRET') ?? null;
    const cfOriginSecret   = req.headers.get('x-cf-origin-secret');
    const isTrustedOrigin  = CF_ORIGIN_SECRET !== null && CF_ORIGIN_SECRET !== '' && cfOriginSecret !== null && cfOriginSecret !== '' && cfOriginSecret === CF_ORIGIN_SECRET;
    const city             = isTrustedOrigin ? (req.headers.get('cf-ipcity') ?? null) : null;
    const ipAddress  = extractIP(req);
    const userAgent  = req.headers.get('user-agent') ?? null;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: 'invalid_email' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    // Turnstile: secret configurada → token obrigatório e válido.
    // 'turnstile_unavailable' é tratado como falha operacional (fail-open) pelo
    // cliente — não bloqueia logins por indisponibilidade do verificador.
    const TURNSTILE_SECRET = Deno.env.get('TURNSTILE_SECRET_KEY') ?? '';
    if (TURNSTILE_SECRET) {
      const turnstileToken = typeof body.turnstile_token === 'string' ? body.turnstile_token : '';
      const turnstile: TurnstileResult = turnstileToken
        ? await verifyTurnstile(turnstileToken, ipAddress, TURNSTILE_SECRET)
        : 'failed';
      if (turnstile !== 'passed') {
        const reason = !turnstileToken
          ? 'turnstile_required'
          : turnstile === 'unreachable'
            ? 'turnstile_unavailable'
            : 'turnstile_failed';
        return new Response(
          JSON.stringify({ allowed: false, reason }),
          { status: 403, headers: { ...CORS, 'Content-Type': 'application/json', 'X-Request-Id': __reqId } }
        );
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabase.rpc('fn_check_login_allowed', {
      p_email:      email,
      p_ip_address: ipAddress,
      p_city:       city,
      p_user_agent: userAgent,
    });

    if (error) {
      console.error('[check-login] RPC error:', error.message);
      return new Response(
        JSON.stringify({ allowed: false, reason: 'security_check_unavailable' }),
        { status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    const row = Array.isArray(data) ? data[0] : data;
    const allowed = row?.allowed ?? false;

    return new Response(
      JSON.stringify({
        allowed,
        reason:        row?.reason        ?? 'unknown',
        blocked_until: row?.blocked_until ?? null,
        check_details: row?.check_details ?? {},
      }),
      { status: allowed ? 200 : 403, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[check-login] unhandled error:', err);
    return new Response(
      JSON.stringify({ allowed: false, reason: 'internal_error_fail_closed' }),
      { status: 403, headers: { ...CORS, 'Content-Type': 'application/json', 'X-Request-Id': __reqId } }
    );
  }
});
