/**
 * Gate de egresso do generate-mockup (fetch-guard.ts) — critério do cartão (etapa 35):
 *  1. o host FINAL de um redirect é validado (antes o fetch seguia o 3xx às cegas);
 *  2. sem MOCKUP_FETCH_ALLOWED_HOSTS vale o default (host Supabase do projeto), nunca tudo;
 *  3. redirect para host fora da lista é recusado com mensagem genérica.
 * Asserts locais (sem import remoto). Rodar: deno test --allow-env supabase/functions/generate-mockup/index.test.ts
 */
import {
  allowedFetchHosts, DEFAULT_MOCKUP_FETCH_HOSTS, fetchBytes, GENERIC_FETCH_ERROR_MESSAGE,
  ImageFetchError, isAllowedFetchHost, MAX_REDIRECTS, type EnvReader,
} from "./fetch-guard.ts";

function assertEquals<T>(actual: T, expected: T, msg = ""): void {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`assertEquals${msg ? ` (${msg})` : ""}: actual=${a} expected=${e}`);
}
async function rejectsWith(fn: () => Promise<unknown>): Promise<ImageFetchError> {
  try { await fn(); } catch (err) {
    if (err instanceof ImageFetchError) return err;
    throw new Error(`esperava ImageFetchError, veio ${String(err)}`);
  }
  throw new Error("esperava rejeição, mas resolveu");
}

/** Fetch falso: respostas em ordem (a última se repete); registra cada chamada. */
function stub(hops: Array<{ status: number; location?: string; body?: string }>, calls: Array<{ url: string; redirect?: string }>) {
  return (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    calls.push({ url: String(input), redirect: init?.redirect });
    const h = hops[Math.min(calls.length - 1, hops.length - 1)];
    return Promise.resolve(new Response(h.body ?? "", { status: h.status, headers: h.location ? { location: h.location } : {} }));
  };
}

const NO_ENV: EnvReader = { get: () => undefined };
const PROJECT = DEFAULT_MOCKUP_FETCH_HOSTS[0];
const onlyCdn = (u: string) => isAllowedFetchHost(new URL(u).hostname, ["cdn.example.com"]);

Deno.test("env ausente = default (host do projeto: Storage + image-proxy), nunca tudo liberado", () => {
  const allow = allowedFetchHosts(NO_ENV);
  assertEquals(allow, [PROJECT]);
  assertEquals(isAllowedFetchHost(PROJECT, allow), true);
  assertEquals(isAllowedFetchHost("attacker.example", allow), false);
  assertEquals(isAllowedFetchHost("imagedelivery.net", allow), false);
});

Deno.test("env definida substitui o default (trim/case; subdomínio aceito)", () => {
  const allow = allowedFetchHosts({ get: (k) => (k === "MOCKUP_FETCH_ALLOWED_HOSTS" ? " CDN.Example.com , x.net " : undefined) });
  assertEquals(allow, ["cdn.example.com", "x.net"]);
  assertEquals(isAllowedFetchHost("img.cdn.example.com", allow), true);
  assertEquals(isAllowedFetchHost(PROJECT, allow), false);
});

Deno.test("redirect para host fora da lista é recusado SEM tocar no alvo, com mensagem genérica", async () => {
  const calls: Array<{ url: string; redirect?: string }> = [];
  const err = await rejectsWith(() =>
    fetchBytes("https://cdn.example.com/a.png", 1000, onlyCdn, stub([{ status: 302, location: "http://169.254.169.254/meta" }], calls)));
  assertEquals(err.message, GENERIC_FETCH_ERROR_MESSAGE);
  assertEquals(/169\.254|meta/.test(err.message), false, "mensagem não vaza alvo");
  assertEquals(calls.length, 1, "o host do redirect nunca é buscado");
  assertEquals(calls[0].redirect, "manual");
});

Deno.test("redirect para host permitido é seguido e devolve os bytes", async () => {
  const calls: Array<{ url: string; redirect?: string }> = [];
  const bytes = await fetchBytes("https://cdn.example.com/a.png", 1000, onlyCdn,
    stub([{ status: 301, location: "https://img.cdn.example.com/b.png" }, { status: 200, body: "abc" }], calls));
  assertEquals(Array.from(bytes), [97, 98, 99]);
  assertEquals(calls.map((c) => c.url), ["https://cdn.example.com/a.png", "https://img.cdn.example.com/b.png"]);
});

Deno.test("falha fechado: redirect opaco, loop de redirects e URL inicial recusada", async () => {
  const opaque = () => Promise.resolve({ status: 0, ok: false, headers: new Headers() } as unknown as Response);
  await rejectsWith(() => fetchBytes("https://cdn.example.com/a.png", 1000, onlyCdn, opaque));

  const loop: Array<{ url: string }> = [];
  await rejectsWith(() => fetchBytes("https://cdn.example.com/a.png", 1000, onlyCdn,
    stub([{ status: 302, location: "https://cdn.example.com/a.png" }], loop)));
  assertEquals(loop.length, MAX_REDIRECTS + 1);

  const none: Array<{ url: string }> = [];
  await rejectsWith(() => fetchBytes("https://attacker.example/x.png", 1000, onlyCdn, stub([{ status: 200 }], none)));
  assertEquals(none.length, 0);
});
