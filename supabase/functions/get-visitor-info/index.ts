import { publicCorsHeaders } from '../_shared/cors.ts';
import { runBotProtection } from '../_shared/bot-protection.ts';
import { fetchWithBreaker } from '../_shared/external-fetch.ts';

// E097: validar IPv4 e IPv6 antes de interpolar na URL
const IPV4_RE = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
const IPV6_RE = /^[0-9a-fA-F:]{2,39}$/;

function isValidIp(ip: string): boolean {
  return IPV4_RE.test(ip) || IPV6_RE.test(ip);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: publicCorsHeaders });
  }

  const headers = { ...publicCorsHeaders, 'Content-Type': 'application/json' };

  const botResult = await runBotProtection(
    req,
    { endpoint: 'get-visitor-info', maxRequests: 30, windowSeconds: 60 },
    publicCorsHeaders,
  );
  if (!botResult.allowed) return botResult.blockResponse!;

  try {
    // E097: usar ÚLTIMO elemento do XFF (mais confiável — adicionado pelo proxy mais próximo)
    // O primeiro elemento é forjável pelo cliente; o último é inserido pelo proxy de borda.
    const xff = req.headers.get('x-forwarded-for');
    const ip =
      (xff ? xff.split(',').pop()?.trim() : null) ||
      req.headers.get('x-real-ip') ||
      null;

    // E097: validar IP antes de interpolar na URL — IP inválido → 400
    if (ip && ip !== 'unknown' && !isValidIp(ip)) {
      return new Response(JSON.stringify({ error: 'IP inválido' }), { status: 400, headers });
    }

    let city: string | null = null;
    let countryCode: string | null = null;

    // Server-side geolocation lookup via HTTPS (E097: trocar http:// → https://)
    if (ip && ip !== 'unknown') {
      try {
        // E097: fetchWithBreaker para registrar falhas no circuit breaker
        const geoRes = await fetchWithBreaker(
          'ip-api',
          `https://ip-api.com/json/${ip}?fields=city,countryCode`,
        );
        if (geoRes.ok) {
          const geo = await geoRes.json();
          city = geo.city || null;
          countryCode = geo.countryCode || null;
        }
      } catch {
        // Geo lookup failed, still return IP
      }
    }

    return new Response(
      JSON.stringify({ ip, city, country_code: countryCode }),
      { status: 200, headers }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers });
  }
});
