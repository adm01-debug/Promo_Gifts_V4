/** Contrato HTTP do handler REAL de generate-mockup (B F-29): index.ts é empacotado em
 * memória pelo esbuild (só npm:@supabase/supabase-js é stubado) e chamado com `Request` reais. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "esbuild";

const SRC = resolve(__dirname, "../../../supabase/functions/generate-mockup/index.ts");
const ENDPOINT = "https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/generate-mockup"; // REGRA #1
const PRODUCT_URL = "https://cdn.example.com/products/mug.png";
const LOGO_URL = "https://cdn.example.com/logos/acme.png";
const MOCKUP_URL = "https://cdn.example.com/mockups/1717000000000-abc.png";
const USER_ID = "11111111-1111-1111-1111-111111111111";
const TEST_JWT = "e30.e30.e30"; // header.payload.sig, payload {} — nenhuma assinatura válida
const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="; // PNG 1×1 sintético
const png = (): Uint8Array<ArrayBuffer> => { const bin = atob(PNG_B64); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; };

type Handler = (req: Request) => Promise<Response>;
const S = { product: "ok" as "ok" | "refused", logo: "ok" as "ok" | "refused", auth: false, bitmapError: null as string | null, uploadError: null as { message: string } | null, publicUrl: MOCKUP_URL as string | null };
const DENO_ENV: Record<string, string> = { SUPABASE_URL: "http://localhost:54321", SUPABASE_ANON_KEY: "test-anon-key", SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key" };
const realm = globalThis as unknown as Record<string, unknown>;

// Rede: só o transporte é stubado; o fetch é feito pelo handler real.
function stubNetwork(): void {
  globalThis.fetch = (async (input: RequestInfo | URL): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.includes("system_kill_switches")) return new Response("[]", { status: 200 }); // sem kill switch
    if (url.includes("/products/") || url.includes("/logos/")) {
      const refused = url.includes("/products/") ? S.product : S.logo;
      if (refused === "refused") throw new TypeError("fetch failed: ECONNREFUSED");
      return new Response(png(), { status: 200 });
    }
    throw new TypeError(`fetch inesperado no teste: ${url}`);
  }) as typeof globalThis.fetch;
}

const CTX = { fillStyle: "", fillRect: () => {}, drawImage: () => {}, save: () => {}, restore: () => {}, translate: () => {}, rotate: () => {} };
class CanvasStub {
  width: number; height: number;
  constructor(w: number, h: number) { this.width = w; this.height = h; }
  getContext(): typeof CTX { return CTX; }
  async convertToBlob(): Promise<Blob> { return new Blob([png()], { type: "image/png" }); }
}
async function bitmapStub(): Promise<{ width: number; height: number; close: () => void }> {
  if (S.bitmapError) throw new Error(S.bitmapError); // erro de decodificação força composition_failed
  return { width: 64, height: 64, close: () => {} };
}
const supabaseStub = () => ({
  auth: { getUser: async () => (S.auth ? { data: { user: null }, error: { message: "invalid JWT" } } : { data: { user: { id: USER_ID, aud: "authenticated" } }, error: null }) },
  from: () => ({ select: () => ({ eq: async () => ({ data: [{ role: "vendedor" }], error: null }) }) }),
  storage: { from: () => ({ upload: async () => (S.uploadError ? { error: S.uploadError } : { error: null }), getPublicUrl: () => ({ data: { publicUrl: S.publicUrl } }) }) },
});

let handler: Handler;
const ORIGINAL = { TextEncoder: realm.TextEncoder, TextDecoder: realm.TextDecoder, Uint8Array: realm.Uint8Array, OffscreenCanvas: realm.OffscreenCanvas, createImageBitmap: realm.createImageBitmap, Deno: realm.Deno, fetch: globalThis.fetch };

beforeAll(async () => {
  // esbuild aborta se o realm não bater: o jsdom cria Uint8Array noutro realm que o TextEncoder do Node.
  const util = await import("node:util");
  realm.TextEncoder = util.TextEncoder;
  realm.TextDecoder = util.TextDecoder;
  realm.Uint8Array = Object.getPrototypeOf(new util.TextEncoder().encode("")).constructor;
  realm.OffscreenCanvas = CanvasStub;
  realm.createImageBitmap = bitmapStub;
  realm.__generateMockupCreateClient = supabaseStub;
  const esbuild = await import("esbuild");
  const stub: Plugin = {
    name: "stub-supabase-js",
    setup(build) {
      build.onResolve({ filter: /^npm:@supabase\/supabase-js/ }, (a) => ({ path: a.path, namespace: "supa" }));
      build.onLoad({ filter: /.*/, namespace: "supa" }, () => ({ loader: "js", contents: "export const createClient = (...a) => globalThis.__generateMockupCreateClient(...a);\nexport const SupabaseClient = undefined;\n" }));
    },
  };
  const out = await esbuild.build({ stdin: { contents: readFileSync(SRC, "utf8"), resolveDir: resolve(SRC, ".."), loader: "ts" }, bundle: true, write: false, format: "iife", platform: "neutral", target: "es2022", plugins: [stub] });
  const code = out.outputFiles?.[0]?.text;
  if (!code) throw new Error("esbuild não produziu bundle para generate-mockup");
  realm.Deno = { env: { get: (n: string) => DENO_ENV[n] }, serve: (h: Handler) => { handler = h; } };
  new Function(code)();
  if (!handler) throw new Error("generate-mockup: Deno.serve não registrou o handler");
});

beforeEach(() => { Object.assign(S, { product: "ok", logo: "ok", auth: false, bitmapError: null, uploadError: null, publicUrl: MOCKUP_URL }); stubNetwork(); });
afterAll(() => { Object.assign(realm, ORIGINAL); delete realm.__generateMockupCreateClient; });

function call(o: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<Response> {
  const headers: Record<string, string> = {};
  if (o.auth !== false) headers.Authorization = `Bearer ${TEST_JWT}`;
  const init: RequestInit = { method: o.method ?? "POST", headers };
  if (o.body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = typeof o.body === "string" ? o.body : JSON.stringify(o.body);
  }
  return handler(new Request(ENDPOINT, init));
}
function validBody(extra: Record<string, unknown> = {}) {
  return {
    productImageUrl: PRODUCT_URL,
    logoUrl: LOGO_URL,
    techniqueName: "Serigrafia",
    positionX: 50,
    positionY: 50,
    logoWidthCm: 5,
    logoHeightCm: 3,
    logoRotation: 0,
    logoScale: 100,
    ...extra,
  };
}
const json = async (r: Response): Promise<Record<string, unknown>> => (await r.json()) as Record<string, unknown>;

describe("generate-mockup — contrato do handler REAL", () => {
  it("sem JWT → 401 sem payload de sucesso; JWT inválido/revogado → 401", async () => {
    const r = await call({ body: validBody(), auth: false });
    expect(r.status).toBe(401);
    const d = await json(r);
    expect(typeof d.error).toBe("string");
    expect(d).not.toHaveProperty("mockupUrl");
    expect(d).not.toHaveProperty("ok");
    S.auth = true;
    expect((await call({ body: validBody() })).status).toBe(401);
  });

  it.each([
    ["JSON inválido", '{"broken": ', null],
    ["corpo vazio", {}, "PRODUCT_URL_UNFETCHABLE"],
    ["productImageUrl não-URL", validBody({ productImageUrl: "not-a-url" }), "PRODUCT_URL_UNFETCHABLE"],
    ["host SSRF (metadata)", validBody({ productImageUrl: "https://169.254.169.254/latest" }), "PRODUCT_URL_UNFETCHABLE"],
    ["sem logo", { productImageUrl: PRODUCT_URL }, null],
    ["logo SVG", validBody({ logoUrl: undefined, logoBase64: "data:image/svg+xml;base64,PHN2Zz4=" }), "SVG_NOT_SUPPORTED"],
  ] as Array<[string, unknown, string | null]>)("corpo inválido → 400 validation_failed (%s)", async (_l, b, code) => {
    const r = await call({ body: b });
    expect(r.status).toBe(400);
    const d = await json(r);
    expect(d.error).toBe("validation_failed");
    if (code) expect(d.errorCode).toBe(code);
  });

  it("host recusado → 422 product_image_unavailable / logo_unavailable", async () => {
    S.product = "refused";
    let r = await call({ body: validBody() });
    expect(r.status).toBe(422);
    let d = await json(r);
    expect(d.error).toBe("product_image_unavailable");
    expect(typeof d.message).toBe("string");
    S.product = "ok"; S.logo = "refused";
    r = await call({ body: validBody() });
    expect(r.status).toBe(422);
    expect((await json(r)).error).toBe("logo_unavailable");
  });

  it("200 com PNG sintético em memória: payload canônico (e logo base64)", async () => {
    const r = await call({ body: validBody() });
    expect(r.status).toBe(200);
    const d = await json(r);
    expect(d.ok).toBe(true);
    expect(d.mockupUrl).toBe(MOCKUP_URL);
    expect(d.mockup_url).toBe(d.mockupUrl);
    expect(typeof d.mockup_id).toBe("string");
    expect((d.mockup_id as string).length).toBeGreaterThan(0);
    expect(d.technique).toBe("Serigrafia");
    expect(typeof d.generation_ms).toBe("number");
    expect(new Date(d.generated_at as string).toISOString()).toBe(d.generated_at);
    const r2 = await call({ body: validBody({ logoUrl: undefined, logoBase64: `data:image/png;base64,${PNG_B64}` }) });
    expect(r2.status).toBe(200);
    expect((await json(r2)).ok).toBe(true);
  });

  it("falhas 500 → composition_failed / storage_upload_failed / url_resolution_failed", async () => {
    S.bitmapError = "boom ao decodificar bitmap";
    let r = await call({ body: validBody() });
    expect(r.status).toBe(500);
    const text = JSON.stringify(await json(r));
    expect(text).toContain("composition_failed");
    expect(text).not.toMatch(/at\s+\w+\s+\(/);
    S.bitmapError = null; S.uploadError = { message: "bucket indisponível" };
    r = await call({ body: validBody() });
    expect(r.status).toBe(500);
    expect((await json(r)).error).toBe("storage_upload_failed");
    S.uploadError = null; S.publicUrl = null;
    r = await call({ body: validBody() });
    expect(r.status).toBe(500);
    expect((await json(r)).error).toBe("url_resolution_failed");
  });

  it("runtime sem OffscreenCanvas → 501 canvas_runtime_unavailable", async () => {
    realm.OffscreenCanvas = undefined;
    try {
      const r = await call({ body: validBody() });
      expect(r.status).toBe(501);
      expect((await json(r)).error).toBe("canvas_runtime_unavailable");
    } finally {
      realm.OffscreenCanvas = CanvasStub;
    }
  });

  it("GET → 405 method_not_allowed; OPTIONS → preflight com CORS", async () => {
    const g = await call({ method: "GET" });
    expect(g.status).toBe(405);
    expect((await json(g)).error).toBe("method_not_allowed");
    const o = await call({ method: "OPTIONS" });
    expect(o.status).toBeLessThan(400);
    expect(o.headers.get("access-control-allow-origin")).toBeTruthy();
  });
});
