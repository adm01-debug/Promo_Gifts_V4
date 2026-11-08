/**
 * Integration contract tests — decommissioned and cron edge functions
 * Covers: mcp-query (410), migrate-helper (410), xbz-image-uploader (cron)
 *
 * These tests verify HTTP contract (status codes, response shape)
 * using mocked fetch — they do NOT execute real Deno/Supabase code.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  mockEdgeFunctionFetch,
  resetExternalMocks,
  type EdgeFnResponseSpec,
} from "../../p0/_mocks";

const BASE = "https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1";

describe("mcp-query", () => {
  afterEach(() => {
    resetExternalMocks();
  });

  it("POST /mcp-query — retorna 410 Gone (descomissionada)", async () => {
    const gone: EdgeFnResponseSpec = {
      status: 410,
      body: {
        error: "decommissioned",
        message:
          "Esta função foi descomissionada em 2026-09-05. Use os MCPs da VPS para acesso ao banco.",
      },
    };
    mockEdgeFunctionFetch({ "/mcp-query": gone });
    const res = await fetch(`${BASE}/mcp-query`, {
      method: "POST",
      body: JSON.stringify({ query: "SELECT 1" }),
    });
    const data = await res.json();
    expect(res.status).toBe(410);
    expect(data.error).toBe("decommissioned");
  });

  it("GET /mcp-query — também retorna 410 Gone", async () => {
    const gone: EdgeFnResponseSpec = {
      status: 410,
      body: { error: "decommissioned" },
    };
    mockEdgeFunctionFetch({ "/mcp-query": gone });
    const res = await fetch(`${BASE}/mcp-query`, { method: "GET" });
    expect(res.status).toBe(410);
  });
});

describe("migrate-helper", () => {
  afterEach(() => {
    resetExternalMocks();
  });

  it("POST /migrate-helper — retorna 410 Gone (helper permanentemente desabilitado)", async () => {
    const gone: EdgeFnResponseSpec = {
      status: 410,
      body: {
        error: "migration_helper_disabled",
        message: "This temporary migration helper is permanently disabled.",
      },
    };
    mockEdgeFunctionFetch({ "/migrate-helper": gone });
    const res = await fetch(`${BASE}/migrate-helper`, { method: "POST" });
    const data = await res.json();
    expect(res.status).toBe(410);
    expect(data.error).toBe("migration_helper_disabled");
  });
});

describe("xbz-image-uploader", () => {
  afterEach(() => {
    resetExternalMocks();
  });

  it("POST /xbz-image-uploader — retorna 200 com pending count (not_implemented)", async () => {
    const ok: EdgeFnResponseSpec = {
      status: 200,
      body: { ok: true, pending: 0, processed: 0, message: "not_implemented" },
    };
    mockEdgeFunctionFetch({ "/xbz-image-uploader": ok });
    const res = await fetch(`${BASE}/xbz-image-uploader`, { method: "POST" });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(typeof data.pending).toBe("number");
    expect(typeof data.processed).toBe("number");
  });

  it("GET /xbz-image-uploader — retorna 405 method_not_allowed", async () => {
    const notAllowed: EdgeFnResponseSpec = {
      status: 405,
      body: { error: "method_not_allowed" },
    };
    mockEdgeFunctionFetch({ "/xbz-image-uploader": notAllowed });
    const res = await fetch(`${BASE}/xbz-image-uploader`, { method: "GET" });
    expect(res.status).toBe(405);
  });
});
