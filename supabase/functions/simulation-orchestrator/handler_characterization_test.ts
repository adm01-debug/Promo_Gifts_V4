/**
 * Caracterizacao local do handler real de simulation-orchestrator.
 *
 * Intercepta Deno.serve e o fetch do cliente Supabase; nenhum request de rede,
 * deploy ou escrita no banco e realizado. O foco e exigir AAL2, impedir falso
 * verde e deixar alvos sem contrato seguro explicitamente como skipped.
 */
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

type EdgeHandler = (request: Request) => Response | Promise<Response>;

const ENV_NAMES = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;
const originalEnv = new Map(
  ENV_NAMES.map((name) => [name, Deno.env.get(name)] as const),
);
Deno.env.set("SUPABASE_URL", "https://local-simulation-test.invalid");
Deno.env.set("SUPABASE_ANON_KEY", "anon-test-only");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-test-only");

let handler: EdgeHandler | undefined;
const serveDescriptor = Object.getOwnPropertyDescriptor(Deno, "serve");

Object.defineProperty(Deno, "serve", {
  configurable: true,
  writable: true,
  value: (candidate: EdgeHandler) => {
    handler = candidate;
    return {};
  },
});

try {
  await import("./index.ts");
} finally {
  if (serveDescriptor) Object.defineProperty(Deno, "serve", serveDescriptor);
}

if (!handler) {
  throw new Error("index.ts deve registrar um callback em Deno.serve");
}

const originalFetch = globalThis.fetch;
const targetCalls: string[] = [];
const dbCalls: Array<{ method: string; path: string }> = [];

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function localSupabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const request = new Request(input, init);
  const url = new URL(request.url);
  dbCalls.push({ method: request.method, path: url.pathname });

  if (url.pathname === "/auth/v1/user") {
    return Promise.resolve(json({
      user: {
        id: "00000000-0000-4000-8000-000000000001",
        email: "dev@local.invalid",
      },
    }));
  }

  if (url.pathname === "/rest/v1/user_roles" && request.method === "GET") {
    return Promise.resolve(json([{ role: "dev" }]));
  }

  if (url.pathname.startsWith("/functions/v1/")) {
    targetCalls.push(url.pathname);
    return Promise.resolve(
      json({ error: "target must not be called while gated" }, 500),
    );
  }

  return Promise.resolve(
    json({ message: `unexpected local request: ${url.pathname}` }, 500),
  );
}

function mockJwt(aal: "aal1" | "aal2"): string {
  const encode = (value: Record<string, unknown>) =>
    btoa(JSON.stringify(value)).replace(/=/g, "").replace(/\+/g, "-")
      .replace(/\//g, "_");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({ aal })}.test`;
}

function request(
  body: Record<string, unknown> = {},
  aal: "aal1" | "aal2" | null = "aal2",
): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (aal) headers.set("authorization", `Bearer ${mockJwt(aal)}`);
  return new Request(
    "https://local-simulation-test.invalid/functions/v1/simulation-orchestrator",
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    },
  );
}

Deno.test({
  name:
    "simulation-orchestrator real handler: AAL2 e alvos gated nao viram verde",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    globalThis.fetch = localSupabaseFetch as typeof fetch;
    try {
      const anonymous = await handler!(request({}, null));
      assertEquals(anonymous.status, 401);

      const aal1 = await handler!(request({}, "aal1"));
      assertEquals(aal1.status, 403);
      assertEquals((await aal1.json()).error, "aal2_required");

      targetCalls.length = 0;
      dbCalls.length = 0;
      const gated = await handler!(request({
        targetFunctions: [
          "external-db-bridge",
          "webhook-inbound",
          "product-webhook",
        ],
      }));
      assertEquals(gated.status, 200);
      const report = await gated.json();
      assertEquals(report.status, "blocked");
      assertEquals(report.requestedScenarios, 100);
      assertEquals(report.successes, 0);
      assertEquals(report.failures, 3);
      assertEquals(report.skipped, 3);
      assertEquals(report.outcomes, {
        total: 3,
        passed: 0,
        rejected: 0,
        infra_failed: 0,
        skipped: 3,
        expectation_failed: 3,
      });
      assertEquals(targetCalls, []);
      assertEquals(
        dbCalls.some(({ path }) =>
          path.includes("simulation_runs") || path.includes("simulation_logs")
        ),
        false,
      );
    } finally {
      globalThis.fetch = originalFetch;
      for (const [name, value] of originalEnv) {
        if (value === undefined) Deno.env.delete(name);
        else Deno.env.set(name, value);
      }
    }
  },
});
