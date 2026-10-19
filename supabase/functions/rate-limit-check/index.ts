import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import { safeErrorResponse } from '../_shared/error-response.ts';
import { logSecurityEvent } from '../_shared/security.ts';
import { RateLimiter } from '../_shared/rate-limiter.ts';
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const BodySchema = z.object({
  endpoint: z.enum(['login', 'api', 'ai', 'approval']).default('api'),
}).partial();

// E018: RateLimiter persistente via DB (RPC check_edge_rate_limit).
// Antes: Map em memória por isolate — "5/min" era por réplica, não global.
// failClosed nos endpoints de autenticação; fail-open só em 'api' de alta disponibilidade.
const LIMITERS: Record<string, RateLimiter> = {
  login:    new RateLimiter({ maxRequests: 5,   windowMs: 60_000, keyPrefix: 'rlck:login',    failClosed: true }),
  approval: new RateLimiter({ maxRequests: 5,   windowMs: 60_000, keyPrefix: 'rlck:approval', failClosed: true }),
  ai:       new RateLimiter({ maxRequests: 20,  windowMs: 60_000, keyPrefix: 'rlck:ai',       failClosed: true }),
  api:      new RateLimiter({ maxRequests: 100, windowMs: 60_000, keyPrefix: 'rlck:api',      failClosed: false }),
};

function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'anonymous';
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    let rawBody: unknown = {};
    try { rawBody = await req.json(); } catch { /* body vazio — defaults */ }

    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const endpoint = parsed.data.endpoint || 'api';
    const clientIP = getClientIP(req);
    const limiter = LIMITERS[endpoint] ?? LIMITERS.api;

    const result = await limiter.check(clientIP);

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      await logSecurityEvent('RATE_LIMIT_EXCEEDED', endpoint, clientIP, {
        remaining: result.remaining,
        suspicious: result.suspicious,
        userAgent: req.headers.get('user-agent'),
      });
      return new Response(
        JSON.stringify({ allowed: false, error: 'Rate limit exceeded', remaining: 0, retryAfter }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.resetAt.toString(),
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ allowed: true, remaining: result.remaining, resetAt: new Date(result.resetAt).toISOString() }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-RateLimit-Remaining': result.remaining.toString() },
      }
    );
  } catch (error) {
    // E018: fail-closed no catch — erro interno → 503, nunca 200/allowed:true.
    return safeErrorResponse(error, {
      corsHeaders,
      req,
      status: 503,
      publicMessage: 'rate_limit_unavailable',
      logLabel: 'Rate limit check error:',
      extra: { allowed: false },
    });
  }
});
