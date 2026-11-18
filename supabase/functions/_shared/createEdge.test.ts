import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createEdge } from "./createEdge.ts";

Deno.test("createEdge cron auth: secret válido => 200 e handler executa", async () => {
  Deno.env.set("TEST_CREATE_EDGE_CRON_SECRET_OK", "valid-secret");
  let called = false;

  const edge = createEdge(
    { auth: "cron", secretEnv: "TEST_CREATE_EDGE_CRON_SECRET_OK" },
    async (_req, _ctx) => {
      called = true;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    },
  );

  const req = new Request("https://example.com/cron", {
    method: "POST",
    headers: { "x-cron-secret": "valid-secret" },
  });

  const res = await edge(req);
  assertEquals(res.status, 200);
  assertEquals(called, true);

  Deno.env.delete("TEST_CREATE_EDGE_CRON_SECRET_OK");
});

// Contrato: secret não configurado (nem vault, nem env) => 401, não 503.
// Fonte: supabase/functions/_shared/dispatcher-auth.ts:278-295 (auditoria SEC-003)
// — ausência de credencial configurada é falha de autorização, não
// indisponibilidade de serviço. Fail-closed mantido (handler não executa).
Deno.test("createEdge cron auth: secret ausente => 401 e handler NÃO executa", async () => {
  Deno.env.delete("TEST_CREATE_EDGE_CRON_SECRET_MISSING");
  let called = false;

  const edge = createEdge(
    { auth: "cron", secretEnv: "TEST_CREATE_EDGE_CRON_SECRET_MISSING" },
    async (_req, _ctx) => {
      called = true;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    },
  );

  const req = new Request("https://example.com/cron", {
    method: "POST",
    headers: { "x-cron-secret": "any" },
  });

  const res = await edge(req);
  assertEquals(res.status, 401);
  // O corpo e o que separa este ramo do "secret invalido", que tambem da 401:
  // secret nao configurado => "service_misconfigured" (dispatcher-auth.ts:292);
  // secret errado => "unauthorized" (dispatcher-auth.ts:315). Sem esta linha os
  // dois casos ficariam indistinguiveis e um bug que confundisse os caminhos
  // passaria batido.
  assertEquals((await res.json()).error, "service_misconfigured");
  assertEquals(called, false);
});

Deno.test("createEdge cron auth: secret inválido => 401 e handler NÃO executa", async () => {
  Deno.env.set("TEST_CREATE_EDGE_CRON_SECRET_INVALID", "expected-secret");
  let called = false;

  const edge = createEdge(
    { auth: "cron", secretEnv: "TEST_CREATE_EDGE_CRON_SECRET_INVALID" },
    async (_req, _ctx) => {
      called = true;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    },
  );

  const req = new Request("https://example.com/cron", {
    method: "POST",
    headers: { "x-cron-secret": "wrong-secret" },
  });

  const res = await edge(req);
  assertEquals(res.status, 401);
  assertEquals((await res.json()).error, "unauthorized"); // dispatcher-auth.ts:315
  assertEquals(called, false);

  Deno.env.delete("TEST_CREATE_EDGE_CRON_SECRET_INVALID");
});
