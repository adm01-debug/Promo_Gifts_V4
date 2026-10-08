/**
 * Testes do gate de egresso do generate-mockup (fetch-guard.ts).
 *
 * Cobre o critério do cartão (etapa 35):
 *   1. o host FINAL de um redirect é validado contra a allowlist (o fetch ANTES
 *      seguia o 3xx às cegas e só validava a URL inicial);
 *   2. sem `MOCKUP_FETCH_ALLOWED_HOSTS`, vale o default restrito (host Supabase do
 *      projeto — Storage + image-proxy), NUNCA "tudo liberado";
 *   3. redirect para host fora da lista é recusado, e a mensagem exposta é genérica
 *      (sem host/status/IP interno).
 *
 * Os testes usam `Deno.test` + assert local (sem import remoto) de propósito: assim
 * o arquivo roda tanto no `deno test` quanto sob Node com um shim mínimo de Deno
 * (útil em ambientes sem deno instalado). Rodar:
 *
 *   deno test --allow-env supabase/functions/generate-mockup/index.test.ts
 */

import {
  DEFAULT_MOCKUP_FETCH_HOSTS,
  GENERIC_FETCH_ERROR_MESSAGE,
  ImageFetchError,
  MAX_REDIRECTS,
  allowedFetchHosts,
  fetchBytes,
  isFetchableUrl,
  type EnvReader,
} from "./fetch-guard.ts";

// ─ asserts mínimos (sem dependência de rede) ────────────────────────────────

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
}

function assertEquals<T>(actual: T, expected: T, msg = ""): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`assertEquals failed${msg ? ` (${msg})` : ""}: actual=${a} expected=${e}`);
}

async function assertRejects(
  fn: () => Promise<unknown>,
  description: string,
): Promise<unknown> {
  try {
    await fn();
  } catch (err) {
    return err;
  }
  throw new Error(`expected rejection but resolved: ${description}`);
}

// ─ helpers de stub do fetch ─────────────────────────────────────────────────

interface StubHop {
  status: number;
  headers?: Record<string, string>;
  body?: string;
}

interface FetchCall {
  url: string;
  redirect?: RequestRedirect;
}

/**
 * Fetch de mentira: devolve as respostas na ordem dada (a última se repete) e
 * registra cada URL chamada, para provar que um alvo bloqueado NUNCA é tocado.
 */
function makeFetchStub(hops: StubHop[], calls: FetchCall[]) {
  return (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls.push({ url, redirect: init?.redirect });
    const hop = hops[Math.min(calls.length - 1, hops.length - 1)];
    return Promise.resolve(
      new Response(hop.body ?? "", {
        status: hop.status,
        headers: hop.headers ?? {},
      }),
    );
  };
}

const NO_ENV: EnvReader = { get: () => undefined };
const PROJECT_HOST = DEFAULT_MOCKUP_FETCH_HOSTS[0];

// ─ allowlist / default ──────────────────────────────────────────────────────

Deno.test("default (env ausente) = host Supabase do projeto; nunca tudo liberado", () => {
  const allow = allowedFetchHosts(NO_ENV);

  assertEquals(allow.length, 1, "default deve ser uma lista curta, não vazia");
  assertEquals(allow.includes(PROJECT_HOST), true, "default inclui o host do projeto");
  // Storage do projeto (logos/mockups do usuário)…
  assertEquals(
    isFetchableUrl(`https://${PROJECT_HOST}/storage/v1/object/public/mockup-assets/x.png`, allow),
    true,
  );
  // …e o image-proxy, servido na MESMA host (Edge Functions).
  assertEquals(
    isFetchableUrl(`https://${PROJECT_HOST}/functions/v1/image-proxy?url=https%3A%2F%2Fx.png`, allow),
    true,
  );
  // "nunca tudo liberado": host arbitrário é recusado.
  assertEquals(isFetchableUrl("https://attacker.example/x.png", allow), false);
  assertEquals(isFetchableUrl("https://imagedelivery.net/abc/public", allow), false);
});

Deno.test("default deriva o host de SUPABASE_URL quando presente", () => {
  const allow = allowedFetchHosts({
    get: (k) => (k === "SUPABASE_URL" ? "https://doufsxqlfjyuvxuezpln.supabase.co" : undefined),
  });
  assertEquals(allow.includes("doufsxqlfjyuvxuezpln.supabase.co"), true);
});

Deno.test("MOCKUP_FETCH_ALLOWED_HOSTS definida substitui o default (com trim/case)", () => {
  const allow = allowedFetchHosts({
    get: (k) => (k === "MOCKUP_FETCH_ALLOWED_HOSTS" ? " CDN.Example.com , imagedelivery.net " : undefined),
  });
  assertEquals(allow, ["cdn.example.com", "imagedelivery.net"]);
  assertEquals(isFetchableUrl("https://cdn.example.com/a.png", allow), true);
  assertEquals(isFetchableUrl("https://sub.cdn.example.com/a.png", allow), true, "subdomínio da entrada");
  assertEquals(isFetchableUrl(`https://${PROJECT_HOST}/x.png`, allow), false, "não cai no default");
});

Deno.test("isFetchableUrl continua bloqueando alvos internos/reservados", () => {
  const allow = allowedFetchHosts(NO_ENV);
  for (const url of [
    "http://169.254.169.254/latest/meta-data/",
    "http://127.0.0.1:8080/x.png",
    "http://10.0.0.5/x.png",
    "http://192.168.1.10/x.png",
    "http://[::1]/x.png",
    "http://metadata.google.internal/x.png",
    "http://2130706433/x.png",
    "ftp://imagedelivery.net/x.png",
    "not-a-url",
  ]) {
    assertEquals(isFetchableUrl(url, allow), false, `esperava bloqueio para ${url}`);
  }
});

// ─ redirects (o coração do fix) ─────────────────────────────────────────────

Deno.test("fetchBytes recusa redirect para host fora da allowlist SEM tocar no alvo", async () => {
  const calls: FetchCall[] = [];
  const stub = makeFetchStub(
    [{ status: 302, headers: { location: "http://169.254.169.254/latest/meta-data/" } }],
    calls,
  );

  const err = await assertRejects(
    () => fetchBytes("https://cdn.example.com/start.png", 1000, ["cdn.example.com"], stub),
    "redirect para metadata",
  );

  if (!(err instanceof ImageFetchError)) throw new Error("esperava ImageFetchError");
  assertEquals(err.message, GENERIC_FETCH_ERROR_MESSAGE);
  assert(!/169\.254|metadata|localhost/.test(err.message), "mensagem do cliente não pode vazar alvo interno");
  assert(err.detail.includes("hop 1"), "o detalhe técnico (log) aponta o hop do redirect");
  // A prova do fix: só a URL inicial foi buscada; o alvo bloqueado nunca foi aberto.
  assertEquals(calls.length, 1, "não pode haver fetch no host bloqueado");
  assertEquals(calls[0].url, "https://cdn.example.com/start.png");
  assertEquals(calls[0].redirect, "manual", "redirect deve ser manual para validar cada hop");
});

Deno.test("fetchBytes segue redirect para host permitido e devolve os bytes", async () => {
  const calls: FetchCall[] = [];
  const stub = makeFetchStub(
    [
      { status: 301, headers: { location: "https://img.cdn.example.com/final.png" } },
      { status: 200, body: "abc" },
    ],
    calls,
  );

  const bytes = await fetchBytes("https://cdn.example.com/start.png", 1000, ["cdn.example.com"], stub);

  assertEquals(Array.from(bytes), [97, 98, 99]);
  assertEquals(calls.length, 2);
  assertEquals(calls[1].url, "https://img.cdn.example.com/final.png");
});

Deno.test("fetchBytes falha fechado em redirect opaco (status 0) e em excesso de hops", async () => {
  // Resposta opaca: o runtime esconde o alvo do redirect (status 0, sem Location).
  const opaqueResponse = (): Promise<Response> =>
    Promise.resolve({
      status: 0,
      ok: false,
      headers: new Headers(),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    } as unknown as Response);

  const errOpaque = await assertRejects(
    () => fetchBytes("https://cdn.example.com/start.png", 1000, ["cdn.example.com"], opaqueResponse),
    "redirect opaco",
  );
  if (!(errOpaque instanceof ImageFetchError)) throw new Error("esperava ImageFetchError");

  const loopCalls: FetchCall[] = [];
  const loopStub = makeFetchStub(
    [{ status: 302, headers: { location: "https://cdn.example.com/loop.png" } }],
    loopCalls,
  );
  const errLoop = await assertRejects(
    () => fetchBytes("https://cdn.example.com/start.png", 1000, ["cdn.example.com"], loopStub),
    "redirect infinito",
  );
  if (!(errLoop instanceof ImageFetchError)) throw new Error("esperava ImageFetchError");
  assertEquals(loopCalls.length, MAX_REDIRECTS + 1);
});

Deno.test("fetchBytes rejeita URL não-allowlistada antes de qualquer fetch", async () => {
  const calls: FetchCall[] = [];
  const stub = makeFetchStub([{ status: 200 }], calls);

  await assertRejects(
    () => fetchBytes("https://attacker.example/x.png", 1000, ["cdn.example.com"], stub),
    "host fora da allowlist",
  );

  assertEquals(calls.length, 0, "nenhum fetch pode acontecer para host recusado");
});
