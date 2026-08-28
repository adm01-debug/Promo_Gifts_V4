import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildEmaHealthResponse, normalizeEmaHealthStatus } from "./handler.ts";

Deno.test("normaliza todos os estados canônicos sem transformar desconhecido em OK", () => {
  assertEquals(normalizeEmaHealthStatus("OK"), "OK");
  assertEquals(normalizeEmaHealthStatus("WARN"), "WARN");
  assertEquals(normalizeEmaHealthStatus("ATRASO"), "WARN");
  assertEquals(normalizeEmaHealthStatus("ERRO"), "ERROR");
  assertEquals(normalizeEmaHealthStatus("CRÍTICO"), "ERROR");
  assertEquals(normalizeEmaHealthStatus("novo_estado"), "UNKNOWN");
  assertEquals(normalizeEmaHealthStatus(null), "UNKNOWN");
});

Deno.test("publica freshness real, origem e nunca inventa próxima execução", () => {
  const response = buildEmaHealthResponse(
    [{
      check_name: "C06_VELOCITY_FRESCA",
      status: "WARN",
      value_atual: "2026-08-27",
      threshold: ">=hoje-1d",
      severidade: "3_MEDIO",
    }],
    [
      { refreshed_at: "2026-08-27T09:00:00.000Z" },
      { refreshed_at: "2026-08-28T10:00:00.000Z" },
    ],
    "2026-08-28T11:00:00.000Z",
  );

  assertEquals(response.freshness, {
    last_refreshed_at: "2026-08-28T10:00:00.000Z",
    status: "WARN",
    semantics: "read_model_refresh",
  });
  assertEquals(response.components[0].next_scheduled_at, null);
  assertEquals(response.components[0].source, "rupture_health_check");
});

Deno.test("retorno vazio fica UNKNOWN e não falso verde", () => {
  const response = buildEmaHealthResponse([], [], "2026-08-28T11:00:00.000Z");
  assertEquals(response.freshness.status, "UNKNOWN");
  assertEquals(response.freshness.last_refreshed_at, null);
  assertEquals(response.components, []);
});
