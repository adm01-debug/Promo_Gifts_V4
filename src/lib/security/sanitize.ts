/**
 * URL Sanitizer — XSS Prevention
 *
 * Blocks javascript:, data:, vbscript: and other dangerous URI schemes.
 * PhD-level defense: multiple layers, no regex-only approach.
 *
 * Based on OWASP XSS Prevention Cheat Sheet:
 * https://owasp.org/www-community/attacks/xss/
 */

import { logger } from '@/lib/logger';

const SAFE_URL_PROTOCOLS = new Set(['https:', 'http:']);
const DANGEROUS_PROTOCOLS = /^(javascript|data|vbscript|file|blob):/i;

/**
 * sanitizeUrl — validate and sanitize a URL string.
 *
 * @param url - Raw URL input from user
 * @param options - Strictness options
 * @returns Safe URL string, or null if dangerous
 */
/**
 * Hostnames privados/loopback/link-local barrados para prevenir SSRF.
 *
 * RESGATE: veio da PR #1726 (fechada sem merge) junto com 39 casos em
 * `__tests__/sanitize-ssrf.test.ts`. Sem isto, `sanitizeUrl` aceitava
 * `http://169.254.169.254/` (endpoint de metadados de nuvem) e
 * `http://localhost:5432/` — e a URL volta para quem chamou como se fosse segura.
 *
 * O parser de URL do WHATWG normaliza octal (`0177.0.0.1`), hex (`0x7f000001`) e
 * decimal (`2130706433`) ANTES de chegarmos aqui, então comparar `hostname` basta
 * contra esses truques de codificação.
 */
const SSRF_BLOCKED_HOSTNAME = (hostname: string): boolean => {
  // Tira colchetes de IPv6: [::1] -> ::1
  const h = hostname.replace(/^\[|\]$/g, '').toLowerCase();

  // IPv6 com IPv4 embutido: o parser normaliza toda forma mista
  // (::ffff:127.0.0.1, 0:0:0:0:0:ffff:7f00:1) para ::ffff:hi:lo, onde os dois
  // ultimos grupos de 16 bits sao o IPv4. Ex.: ::ffff:a9fe:a9fe -> 169.254.169.254
  const ipv4Mapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(h);
  if (ipv4Mapped) {
    const hi = parseInt(ipv4Mapped[1], 16);
    const lo = parseInt(ipv4Mapped[2], 16);
    const derivedIpv4 = `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
    if (SSRF_BLOCKED_HOSTNAME(derivedIpv4)) return true;
  }

  return (
    h === 'localhost' ||
    h === '0.0.0.0' ||
    h === '::1' ||
    h.startsWith('127.') || // 127.0.0.0/8 loopback
    h.startsWith('10.') || // 10.0.0.0/8 privada
    h.startsWith('192.168.') || // 192.168.0.0/16 privada
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) || // 172.16-31.x privada
    h.startsWith('169.254.') || // 169.254.0.0/16 link-local (metadados de nuvem)
    /^fe[89ab][0-9a-f]:/i.test(h) || // IPv6 link-local fe80::/10
    /\.(local|internal|corp|intranet|lan)$/i.test(h) // TLDs internos comuns
  );
};

export function sanitizeUrl(
  url: string | null | undefined,
  options: { httpsOnly?: boolean; allowEmpty?: boolean } = {},
): string | null {
  if (!url) {
    return options.allowEmpty ? '' : null;
  }

  // RESGATE (PR #1726): valor truthy que nao e string (numero, objeto) fazia
  // `.trim()` lancar TypeError fora de qualquer try/catch.
  if (typeof url !== 'string') return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  // Quick check: reject javascript: and other dangerous schemes upfront
  if (DANGEROUS_PROTOCOLS.test(trimmed)) {
    console.warn('[SecurityGuard] Blocked dangerous URL scheme:', trimmed.slice(0, 30));
    return null;
  }

  // Parse URL to validate structure
  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();

    // Strict mode: https:// only (production images should be on CDN)
    if (options.httpsOnly && protocol !== 'https:') {
      return null;
    }

    // General mode: allow http and https only
    if (!SAFE_URL_PROTOCOLS.has(protocol)) {
      console.warn('[SecurityGuard] Blocked non-http(s) URL scheme:', protocol);
      return null;
    }

    // RESGATE (PR #1726): credencial embutida (user:pass@host) e vetor de
    // exfiltracao — a URL carrega segredo para onde ela for renderizada ou logada.
    if (parsed.username || parsed.password) {
      logger.warn('[SecurityGuard] Blocked URL with embedded credentials');
      return null;
    }

    // RESGATE (PR #1726): host privado/loopback/link-local — prevencao de SSRF.
    if (SSRF_BLOCKED_HOSTNAME(parsed.hostname)) {
      logger.warn('[SecurityGuard] Blocked SSRF-risk hostname:', parsed.hostname);
      return null;
    }

    return parsed.toString();
  } catch {
    // URL is malformed (e.g. "not-a-url" without a scheme)
    // Return null: malformed URLs in src/href attributes are a footgun
    return null;
  }
}

/**
 * sanitizeText — strip HTML tags from user-provided text.
 * Prevents XSS when text is inserted into DOM via innerHTML.
 * NOTE: React's JSX escapes text automatically, so this is only needed
 * when rendering via dangerouslySetInnerHTML or document.title.
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';

  // Step 1: Strip dangerous block elements (script, style, etc.) including
  // their entire content. Must happen BEFORE generic tag stripping so
  // <script>alert(1)</script> doesn't leave "alert(1)" in the output.
  const DANGEROUS_BLOCKS =
    /<(script|style|iframe|object|embed|applet|form|link|meta|base)\b[^>]*>[\s\S]*?<\/\1>/gi;
  let current = text;
  let prev = '';
  while (prev !== current) {
    prev = current;
    current = current.replace(DANGEROUS_BLOCKS, '');
  }

  // Step 2: Iteratively strip remaining HTML tags until stable (prevents
  // incomplete-multi-character-sanitization where "<scr<script>ipt>" would
  // survive a single-pass strip).
  for (let i = 0; i < 20; i++) {
    const next = current.replace(/<[^>]*>/g, '');
    if (next === current) break;
    current = next;
  }

  // Remove any remaining lone angle brackets that could not form a valid tag
  return current.replace(/[<>]/g, '').trim();
}

/**
 * isSafeUrl — boolean check version of sanitizeUrl.
 */
export function isSafeUrl(url: string | null | undefined): boolean {
  return sanitizeUrl(url) !== null;
}
