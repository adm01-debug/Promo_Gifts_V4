/**
 * generate-mockup — allowlist de egresso + download com redirect validado.
 *
 * AUDIT (plano etapa 35): o download seguia 3xx às cegas (a allowlist só era vista
 * na URL inicial) e `MOCKUP_FETCH_ALLOWED_HOSTS` ausente = tudo liberado. Aqui:
 *  - env ausente → default restrito ao host Supabase do projeto (Storage + image-proxy);
 *  - `redirect: "manual"`: cada hop é revalidado pelo gate ANTES de ser buscado.
 * Fica fora de index.ts (que chama `Deno.serve`) para ser testável — ver index.test.ts.
 */

/** Host Supabase do projeto: Storage e Edge Functions (`/functions/v1/image-proxy`). */
export const DEFAULT_MOCKUP_FETCH_HOSTS: readonly string[] = ["doufsxqlfjyuvxuezpln.supabase.co"];

/** Máximo de redirects seguidos antes de desistir (fail-closed). */
export const MAX_REDIRECTS = 3;

/** Hard cap on any fetched/decoded image (product or logo) — memory exhaustion guard. */
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB

export interface EnvReader {
  get(key: string): string | undefined;
}

/** `MOCKUP_FETCH_ALLOWED_HOSTS` (vírgulas) quando definida; senão o default + host de SUPABASE_URL. Nunca vazia. */
export function allowedFetchHosts(env: EnvReader = Deno.env): readonly string[] {
  const fromEnv = (env.get("MOCKUP_FETCH_ALLOWED_HOSTS") || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (fromEnv.length > 0) return fromEnv;
  const hosts = new Set<string>(DEFAULT_MOCKUP_FETCH_HOSTS);
  try {
    const h = new URL(env.get("SUPABASE_URL") || "").hostname.toLowerCase();
    if (h) hosts.add(h);
  } catch { /* SUPABASE_URL ausente/malformada — fica o default estático */ }
  return [...hosts];
}

/** Host exato OU subdomínio de uma entrada da allowlist. */
export function isAllowedFetchHost(hostname: string, allow: readonly string[]): boolean {
  const host = (hostname || "").toLowerCase();
  return !!host && allow.some((a) => host === a || host.endsWith("." + a));
}

/** Mensagem única e genérica: host/status/IP só vão para `detail` (log do servidor). */
export const GENERIC_FETCH_ERROR_MESSAGE = "Não foi possível baixar a imagem.";

export class ImageFetchError extends Error {
  readonly detail: string;
  constructor(detail: string) {
    super(GENERIC_FETCH_ERROR_MESSAGE);
    this.name = "ImageFetchError";
    this.detail = detail;
  }
}

/**
 * Baixa a imagem validando TODOS os hops com `isAllowed` (o gate completo do index.ts:
 * scheme + SSRF + allowlist). 3xx para alvo recusado falha antes de abrir conexão;
 * redirect opaco (status 0, alvo escondido) falha fechado.
 */
export async function fetchBytes(
  url: string,
  ms: number,
  isAllowed: (url: string) => boolean,
  fetchImpl: typeof fetch = fetch,
): Promise<Uint8Array> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    let target = url;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!isAllowed(target)) throw new ImageFetchError(`blocked fetch target at hop ${hop}`);
      const res = await fetchImpl(target, { signal: ctrl.signal, redirect: "manual" });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) throw new ImageFetchError(`redirect without location (${res.status})`);
        target = new URL(location, target).toString();
        continue;
      }
      if (res.status === 0) throw new ImageFetchError("opaque redirect — target cannot be validated");
      if (!res.ok) throw new ImageFetchError(`HTTP ${res.status} fetching image`);
      // Content-Length up-front, and again after download for servers that omit it.
      const declared = Number(res.headers.get("content-length") || 0);
      if (declared > MAX_IMAGE_BYTES) throw new ImageFetchError(`image too large (${declared} bytes)`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength > MAX_IMAGE_BYTES) throw new ImageFetchError(`image too large (${bytes.byteLength} bytes)`);
      return bytes;
    }
    throw new ImageFetchError(`too many redirects (> ${MAX_REDIRECTS})`);
  } finally { clearTimeout(t); }
}
