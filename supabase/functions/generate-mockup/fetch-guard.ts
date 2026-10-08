/**
 * generate-mockup — gate de egresso para as URLs de imagem fornecidas pelo chamador.
 *
 * AUDIT (plano etapa 35): o download fazia `fetch` no modo de redirect padrão, então
 * um 3xx de um host público conseguia mandar o worker para um endereço interno —
 * a allowlist só era conferida na URL INICIAL, nunca no alvo do redirect. E
 * `MOCKUP_FETCH_ALLOWED_HOSTS` era opcional: sem a env, qualquer host passava.
 *
 * Este módulo passa a ser o único gate: cada hop (URL inicial E cada alvo de redirect)
 * é revalidado — protocolo, host interno/reservado e allowlist — e o default (env
 * ausente) é o host Supabase do próprio projeto (Storage + Edge Functions, que serve
 * o image-proxy), nunca um proxy aberto.
 *
 * Fica fora de `index.ts` de propósito: `index.ts` sobe o handler com `Deno.serve`,
 * então o gate vive aqui para ser testável sem subir servidor (ver index.test.ts).
 */

// ─ SSRF hardening ────────────────────────────────────────────────────────────
// AUDIT 2026-06-17: this function fetches arbitrary productImageUrl / logoUrl
// values supplied by the caller. Without egress controls that is a Server-Side
// Request Forgery vector — a caller could aim the URL at cloud metadata
// (169.254.169.254), loopback, or RFC1918 hosts and read internal responses.
// We now reject private/reserved/internal targets UNCONDITIONALLY (independent of
// the allowlist), covering IPv4, IPv6, IPv4-mapped IPv6, and decimal/hex IP
// obfuscation. The MOCKUP_FETCH_ALLOWED_HOSTS allowlist narrows egress further to
// known CDNs when set; when it is NOT set the DEFAULT below applies (the project's
// own Supabase host) — never "everything allowed".
// NOTE: this blocks IP *literals* and obvious internal hostnames; it does not on
// its own stop DNS-rebinding (a public name that resolves to a private IP).
// Setting MOCKUP_FETCH_ALLOWED_HOSTS to the real product/logo CDNs closes that gap.
function isBlockedV4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) return true;
  const [a, b, c] = p;
  if (a === 0 || a === 10 || a === 127) return true;        // this-host / RFC1918-10 / loopback
  if (a === 100 && b >= 64 && b <= 127) return true;        // CGNAT 100.64/10
  if (a === 169 && b === 254) return true;                  // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;         // RFC1918 172.16/12
  if (a === 192 && b === 168) return true;                  // RFC1918 192.168/16
  if (a === 192 && b === 0 && c === 0) return true;         // 192.0.0.0/24
  if (a === 198 && (b === 18 || b === 19)) return true;     // benchmarking 198.18/15
  if (a >= 224) return true;                                // multicast / reserved
  return false;
}
// Reduce an IPv4-mapped IPv6 address to its dotted IPv4, handling BOTH the decimal
// form (::ffff:127.0.0.1) and the hex form the URL parser normalises to (::ffff:7f00:1).
function v4FromMapped(ip: string): string | null {
  let m = ip.match(/:ffff:(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) return `${+m[1]}.${+m[2]}.${+m[3]}.${+m[4]}`;
  m = ip.match(/:ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (m) {
    const hi = parseInt(m[1], 16), lo = parseInt(m[2], 16);
    return `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
  }
  return null;
}
function isBlockedHost(hostname: string): boolean {
  const h = (hostname || "").toLowerCase().trim().replace(/\.$/, "");
  if (h === "") return true;
  if (h === "localhost" || h.endsWith(".localhost") || h === "localhost.localdomain") return true;
  if (h === "metadata" || h === "metadata.google.internal" || h.endsWith(".internal")) return true;
  if (h.includes(":")) { // IPv6 literal
    const ip = h.replace(/^\[/, "").replace(/\]$/, "");
    if (ip === "::1" || ip === "::") return true;
    if (ip.startsWith("fe80")) return true;                 // link-local
    if (ip.startsWith("fc") || ip.startsWith("fd")) return true; // ULA fc00::/7
    const mapped = v4FromMapped(ip);
    if (mapped) return isBlockedV4(mapped);
    return false;                                            // global-unicast v6 allowed
  }
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) return isBlockedV4(h);
  if (/^(0x[0-9a-f]+|\d+)$/i.test(h)) return true;           // decimal/hex IP obfuscation
  return false;                                              // DNS hostname — allowlist handles the rest
}

// ─ Allowlist ────────────────────────────────────────────────────────────────

/**
 * Host Supabase do próprio projeto. Serve DUAS coisas que a função precisa baixar:
 *  - Storage (`mockup-assets`, logos de usuário);
 *  - Edge Functions (`/functions/v1/image-proxy`), por onde as imagens de catálogo
 *    dos fornecedores são servidas.
 * É o default quando `MOCKUP_FETCH_ALLOWED_HOSTS` não está definida.
 */
export const DEFAULT_MOCKUP_FETCH_HOSTS: readonly string[] = [
  "doufsxqlfjyuvxuezpln.supabase.co",
];

/** Máximo de redirects seguidos antes de desistir (fail-closed). */
export const MAX_REDIRECTS = 3;

/** Hard cap on any fetched/decoded image (product or logo). Without this a caller can
 * point productImageUrl at a huge file on an allowed CDN, or send a massive base64
 * logo, to exhaust the edge worker's memory (the bucket's 10 MB limit only bounds the
 * OUTPUT upload, not these inputs). */
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB

/** Minimal env surface so the allowlist is testable without Deno permissions. */
export interface EnvReader {
  get(key: string): string | undefined;
}

/**
 * Resolve a allowlist de egresso.
 *  - `MOCKUP_FETCH_ALLOWED_HOSTS` definida (lista separada por vírgula) → SÓ ela;
 *  - ausente → default restrito: o host Supabase do projeto (Storage + image-proxy).
 *    NUNCA "tudo liberado".
 */
export function allowedFetchHosts(env: EnvReader = Deno.env): readonly string[] {
  const fromEnv = (env.get("MOCKUP_FETCH_ALLOWED_HOSTS") || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (fromEnv.length > 0) return fromEnv;

  const hosts = new Set<string>(DEFAULT_MOCKUP_FETCH_HOSTS);
  const supabaseUrl = env.get("SUPABASE_URL");
  if (supabaseUrl) {
    try {
      const h = new URL(supabaseUrl).hostname.toLowerCase();
      if (h) hosts.add(h);
    } catch { /* SUPABASE_URL malformada — mantém o default estático */ }
  }
  return [...hosts];
}

/** Host exato OU subdomínio de uma entrada da allowlist (case-insensitive). */
export function isAllowedFetchHost(hostname: string, allow: readonly string[]): boolean {
  const host = (hostname || "").toLowerCase();
  if (!host) return false;
  return allow.some((entry) => host === entry || host.endsWith("." + entry));
}

/**
 * Single egress gate: valid http(s) scheme + not an internal/blocked target +
 * within the (now mandatory) allowlist. Replaces the old isValidHttpUrl +
 * hostAllowed pair, which allowed ALL hosts when the env was unset.
 */
export function isFetchableUrl(
  value: unknown,
  allow: readonly string[] = allowedFetchHosts(),
): value is string {
  if (typeof value !== "string") return false;
  let u: URL;
  try { u = new URL(value); } catch { return false; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  if (isBlockedHost(u.hostname)) {
    console.warn(`[generate-mockup] blocked SSRF-unsafe host: ${u.hostname}`);
    return false;
  }
  if (!isAllowedFetchHost(u.hostname, allow)) {
    console.warn(`[generate-mockup] host not in MOCKUP_FETCH_ALLOWED_HOSTS: ${u.hostname}`);
    return false;
  }
  return true;
}

// ─ Download ─────────────────────────────────────────────────────────────────

/** Texto único e genérico: o cliente NUNCA recebe host/status/IP nas mensagens. */
export const GENERIC_FETCH_ERROR_MESSAGE = "Não foi possível baixar a imagem.";

/**
 * Falha do pipeline de download. `message` é sempre genérica (client-safe) e o
 * motivo técnico fica em `detail`, para log no servidor apenas.
 */
export class ImageFetchError extends Error {
  readonly detail: string;
  constructor(detail: string) {
    super(GENERIC_FETCH_ERROR_MESSAGE);
    this.name = "ImageFetchError";
    this.detail = detail;
  }
}

/**
 * Baixa uma imagem validando todos os hops contra a allowlist.
 *
 * `redirect: "manual"` impede o runtime de seguir o 3xx sozinho: lemos o `Location`,
 * revalidamos o alvo com o mesmo gate e só então continuamos. Um 3xx para host interno
 * (169.254.169.254, loopback, RFC1918) ou fora da allowlist é recusado ANTES de o
 * worker abrir conexão com ele. Redirect opaco (runtime esconde o alvo) falha fechado.
 */
export async function fetchBytes(
  url: string,
  ms = 14_000,
  allow: readonly string[] = allowedFetchHosts(),
  fetchImpl: typeof fetch = fetch,
): Promise<Uint8Array> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    let target = url;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      // Revalida cada hop: a URL inicial nunca é a última palavra.
      if (!isFetchableUrl(target, allow)) {
        throw new ImageFetchError(`blocked fetch target at hop ${hop}: ${hostOf(target)}`);
      }
      const res = await fetchImpl(target, { signal: ctrl.signal, redirect: "manual" });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) throw new ImageFetchError(`redirect without location (${res.status})`);
        target = new URL(location, target).toString();
        continue;
      }
      // Redirect opaco (status 0): o runtime esconde o alvo, então não há como validá-lo.
      if (res.status === 0) {
        throw new ImageFetchError("opaque redirect response — target cannot be validated");
      }
      if (!res.ok) throw new ImageFetchError(`HTTP ${res.status} fetching image`);

      // Reject oversized payloads up-front via Content-Length when the server provides it…
      const declared = Number(res.headers.get("content-length") || 0);
      if (declared > MAX_IMAGE_BYTES) {
        throw new ImageFetchError(`image too large (${declared} bytes > ${MAX_IMAGE_BYTES} max)`);
      }
      const bytes = new Uint8Array(await res.arrayBuffer());
      // …and again after download, for servers that omit or under-report Content-Length.
      if (bytes.byteLength > MAX_IMAGE_BYTES) {
        throw new ImageFetchError(`image too large (${bytes.byteLength} bytes > ${MAX_IMAGE_BYTES} max)`);
      }
      return bytes;
    }
    throw new ImageFetchError(`too many redirects (> ${MAX_REDIRECTS})`);
  } finally { clearTimeout(t); }
}

/** Hostname de uma URL, sem quebrar em URL malformada (uso apenas em log interno). */
function hostOf(rawUrl: string): string {
  try { return new URL(rawUrl).hostname; } catch { return "invalid-url"; }
}
