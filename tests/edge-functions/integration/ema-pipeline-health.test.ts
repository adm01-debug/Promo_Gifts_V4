/**
 * Client contract — ema-pipeline-health.
 *
 * O handler real possui testes Deno e descritor live. Este recorte garante que
 * consumidores HTTP não promovam ausência de freshness, auth ou falha de RPC a
 * um estado saudável.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  mockEdgeFunctionFetch,
  resetExternalMocks,
  type EdgeFnResponseSpec,
} from "../../p0/_mocks";

const ENDPOINT =
  "https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/ema-pipeline-health";

describe("ema-pipeline-health", () => {
  afterEach(() => resetExternalMocks());

  it("preserva freshness real e a origem canônica no happy-path", async () => {
    const ok: EdgeFnResponseSpec = {
      status: 200,
      body: {
        version: 1,
        checked_at: "2026-08-29T12:00:00.000Z",
        freshness: {
          last_refreshed_at: "2026-08-29T11:55:00.000Z",
          status: "OK",
          semantics: "read_model_refresh",
        },
        components: [{
          id: "C06_VELOCITY_FRESCA",
          status: "OK",
          last_refreshed_at: "2026-08-29T11:55:00.000Z",
          next_scheduled_at: null,
          detail: "valor=2026-08-29",
          source: "rupture_health_check",
        }],
      },
    };
    mockEdgeFunctionFetch({ "/ema-pipeline-health": ok });

    const response = await fetch(ENDPOINT, {
      headers: { Authorization: "Bearer dev-test-jwt" },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.freshness).toMatchObject({
      status: "OK",
      semantics: "read_model_refresh",
    });
    expect(body.components[0]).toMatchObject({
      source: "rupture_health_check",
      next_scheduled_at: null,
    });
  });

  it("mantém retorno vazio como UNKNOWN, nunca como falso verde", async () => {
    const unknown: EdgeFnResponseSpec = {
      status: 200,
      body: {
        version: 1,
        checked_at: "2026-08-29T12:00:00.000Z",
        freshness: {
          last_refreshed_at: null,
          status: "UNKNOWN",
          semantics: "read_model_refresh",
        },
        components: [],
      },
    };
    mockEdgeFunctionFetch({ "/ema-pipeline-health": unknown });

    const response = await fetch(ENDPOINT);
    const body = await response.json();

    expect(body.freshness.status).toBe("UNKNOWN");
    expect(body.freshness.last_refreshed_at).toBeNull();
  });

  it("expõe auth ausente como 401, não como saúde desconhecida", async () => {
    mockEdgeFunctionFetch({
      "/ema-pipeline-health": {
        status: 401,
        body: { error: "unauthorized" },
      },
    });

    const response = await fetch(ENDPOINT);
    expect(response.status).toBe(401);
  });

  it("propaga indisponibilidade das RPCs como 503", async () => {
    mockEdgeFunctionFetch({
      "/ema-pipeline-health": {
        status: 503,
        body: { error: "health_source_unavailable" },
      },
    });

    const response = await fetch(ENDPOINT, {
      headers: { Authorization: "Bearer dev-test-jwt" },
    });
    expect(response.status).toBe(503);
  });
});
