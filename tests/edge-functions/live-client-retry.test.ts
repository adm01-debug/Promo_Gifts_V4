// tests/edge-functions/live-client-retry.test.ts — offline: servidor HTTP local lento
import http from "node:http";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";

async function withServer(slowFor: (n: number) => boolean) {
  let n = 0;
  const srv = http.createServer((_req, res) => {
    n += 1;
    const k = n;
    setTimeout(() => {
      res.writeHead(422, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "invalid", attempt: k }));
    }, slowFor(k) ? 1_000 : 5);
  });
  await new Promise<void>((r) => srv.listen(0, "127.0.0.1", () => r()));
  vi.resetModules();
  vi.stubEnv("SUPABASE_URL", `http://127.0.0.1:${(srv.address() as AddressInfo).port}`);
  vi.stubEnv("SUPABASE_ANON_KEY", "sb_publishable_test");
  vi.stubEnv("EDGE_LIVE_TIMEOUT_MS", "150");
  vi.stubEnv("EDGE_LIVE_RETRY_DELAY_MS", "10");
  vi.stubEnv("EDGE_LIVE_RETRIES", "3");
  const mod = await import("./live/_live-client");
  return { mod, count: () => n, close: () => { srv.closeAllConnections(); srv.close(); } };
}

afterEach(() => vi.unstubAllEnvs());

describe("callEdge: timeout do cliente (AbortError)", () => {
  it("1ª tentativa estoura, 2ª responde → status real, sem timedOut", async () => {
    const s = await withServer((k) => k === 1);
    try {
      const r = await s.mod.callEdge("x", { body: "{" });
      expect(r.status).toBe(422);
      expect(r.timedOut).toBeUndefined();
      expect(s.count()).toBe(2);
    } finally { s.close(); }
  });

  it("todas estouram → 408 timedOut depois de RETRY_COUNT+1 tentativas", async () => {
    const s = await withServer(() => true);
    try {
      const r = await s.mod.callEdge("x", { body: "{" });
      expect(r).toMatchObject({ status: 408, timedOut: true });
      expect(s.count()).toBe(4);
    } finally { s.close(); }
  });

  it("retryOnTimeout: false (happy-path, efeito real) não repete", async () => {
    const s = await withServer(() => true);
    try {
      const r = await s.mod.callEdge("x", { body: "{", retryOnTimeout: false });
      expect(r).toMatchObject({ status: 408, timedOut: true });
      expect(s.count()).toBe(1);
    } finally { s.close(); }
  });

  it("EDGE_LIVE_RETRIES=0 desliga os retries (antes virava 3)", async () => {
    vi.stubEnv("EDGE_LIVE_RETRIES", "0");
    let n = 0;
    const srv = http.createServer((_q, res) => { n += 1; setTimeout(() => { res.writeHead(422); res.end("{}"); }, 1_000); });
    await new Promise<void>((r) => srv.listen(0, "127.0.0.1", () => r()));
    vi.resetModules();
    vi.stubEnv("SUPABASE_URL", `http://127.0.0.1:${(srv.address() as AddressInfo).port}`);
    vi.stubEnv("EDGE_LIVE_TIMEOUT_MS", "150");
    try {
      const mod = await import("./live/_live-client");
      const r = await mod.callEdge("x", { body: "{" });
      expect(r).toMatchObject({ status: 408, timedOut: true });
      expect(n).toBe(1);
    } finally { srv.closeAllConnections(); srv.close(); }
  });
});

// ---------------------------------------------------------------------------
// Reforço de mutantes (12/11): R4 + EDGE_LIVE_RETRIES inválido + 504 re-tentado
// ---------------------------------------------------------------------------
/** Servidor cujo status por tentativa é decidido por `statusFor(n)` (resposta imediata). */
async function withStatusServer(statusFor: (n: number) => number, retries: string | undefined) {
  let n = 0;
  const srv = http.createServer((_req, res) => {
    n += 1;
    const st = statusFor(n);
    res.writeHead(st, { "content-type": "application/json" });
    res.end(JSON.stringify({ attempt: n }));
  });
  await new Promise<void>((r) => srv.listen(0, "127.0.0.1", () => r()));
  vi.resetModules();
  vi.stubEnv("SUPABASE_URL", `http://127.0.0.1:${(srv.address() as AddressInfo).port}`);
  vi.stubEnv("SUPABASE_ANON_KEY", "sb_publishable_test");
  vi.stubEnv("EDGE_LIVE_TIMEOUT_MS", "2000");
  vi.stubEnv("EDGE_LIVE_RETRY_DELAY_MS", "5");
  if (retries !== undefined) vi.stubEnv("EDGE_LIVE_RETRIES", retries);
  const mod = await import("./live/_live-client");
  return { mod, count: () => n, close: () => { srv.closeAllConnections(); srv.close(); } };
}

describe("callEdge: status transitório 504", () => {
  it("504 é re-tentado: 1ª tentativa 504, 2ª 422 → devolve 422 após 2 chamadas", async () => {
    const s = await withStatusServer((k) => (k === 1 ? 504 : 422), "3");
    try {
      const r = await s.mod.callEdge("x", { body: "{}" });
      expect(r.status).toBe(422);
      expect(s.count()).toBe(2);
    } finally { s.close(); }
  });

  it("504 persistente → devolve o 504 depois de RETRY_COUNT+1 tentativas", async () => {
    const s = await withStatusServer(() => 504, "2");
    try {
      const r = await s.mod.callEdge("x", { body: "{}" });
      expect(r.status).toBe(504);
      expect(s.count()).toBe(3);
    } finally { s.close(); }
  });
});

describe("EDGE_LIVE_RETRIES inválido cai no padrão (3 retries = 4 tentativas)", () => {
  // Antes: "-1" → loop `attempt <= -1` nunca rodava e callEdge devolvia `undefined`
  // (TypeError no chamador); "1.5" → 2 tentativas sem nunca bater `attempt === RETRY_COUNT`.
  for (const raw of ["-1", "-3", "1.5", "abc", "Infinity", ""]) {
    it(`EDGE_LIVE_RETRIES=${JSON.stringify(raw)} → 4 tentativas e resultado definido`, async () => {
      const s = await withStatusServer(() => 503, raw);
      try {
        const r = await s.mod.callEdge("x", { body: "{}" });
        expect(r).toBeDefined();
        expect(r.status).toBe(503);
        expect(s.count()).toBe(4);
        expect(Number.isFinite(s.mod.MAX_RETRY_BUDGET_MS)).toBe(true);
      } finally { s.close(); }
    });
  }

  it("EDGE_LIVE_RETRIES=\"2\" (inteiro válido) é respeitado → 3 tentativas", async () => {
    const s = await withStatusServer(() => 502, "2");
    try {
      const r = await s.mod.callEdge("x", { body: "{}" });
      expect(r.status).toBe(502);
      expect(s.count()).toBe(3);
    } finally { s.close(); }
  });
});

describe("R4: happy-path do _live-suite não repete após timeout", () => {
  it("o callEdge do happy-path passa retryOnTimeout: false", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(here, "live/_live-suite.ts"), "utf8");
    const start = src.indexOf('it("happy-path');
    expect(start, "bloco happy-path não encontrado em _live-suite.ts").toBeGreaterThan(-1);
    const call = src.indexOf("callEdge(fn, {", start);
    expect(call).toBeGreaterThan(start);
    // Objeto de opções da chamada: até o primeiro "});" depois de callEdge(fn, {
    const opts = src.slice(call, src.indexOf("});", call));
    expect(opts).toMatch(/\bretryOnTimeout:\s*false\b/);
  });
});
