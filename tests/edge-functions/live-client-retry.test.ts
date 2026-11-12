// tests/edge-functions/live-client-retry.test.ts — offline: servidor HTTP local lento
import http from "node:http";
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
});
