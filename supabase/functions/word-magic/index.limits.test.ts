/**
 * F-08 — word-magic com limite de uso, quota e registro de consumo.
 *
 * Exercita o handler REAL (capturado do `Deno.serve` de index.ts) com as
 * fronteiras de rede/DB mockadas; o fluxo do handler e o Zod são reais. Prova:
 *   1. acima de 20 req/min por usuário → 429 sem chamar o provedor;
 *   2. toda chamada que chega ao provedor registra consumo em ai_usage_logs;
 *   3. laço com force_regenerate não ultrapassa o teto por minuto;
 *   4. quota reservada por `acquire_ai_quota` (esgotada → 429, sem tocar a chave);
 *   5. o modelo continua o Flash (`deepseek-v4-flash`) — nunca o Pro.
 *
 * Entra na suíte pelo shim `tests/edge-functions/word-magic.limits.test.ts`
 * (`supabase/functions/**` não está no include do vitest.config.ts).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const PRODUCT_ID = "00000000-0000-0000-0000-000000000001";
const FLASH_MODEL = "deepseek-v4-flash";
const SRC_PATH = "supabase/functions/word-magic/index.ts";

const h = vi.hoisted(() => {
  const product = {
    id: "00000000-0000-0000-0000-000000000001", name: "Caneca Premium",
    ai_title: null, ai_description: null, ai_summary: null, ai_version: 0,
    ai_generated_at: null, locked_fields: null, is_active: true, is_deleted: false,
  };
  // Query builder mínimo: encadeia e resolve em maybeSingle/single e no `await` direto.
  const chain = (result: { data: unknown; error: unknown }) => {
    const builder: Record<string, unknown> = {};
    for (const m of ["select", "eq", "insert", "update"]) builder[m] = () => builder;
    builder.maybeSingle = async () => result;
    builder.single = async () => result;
    builder.then = (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null });
    return builder;
  };
  const client = {
    from: (table: string) =>
      table === "products"
        ? chain({ data: product, error: null })
        : chain({ data: { id: "queue-1", status: "done" }, error: null }),
    rpc: async (name: string) => {
      if (name === "fn_get_product_ai_context") return { data: { category_id: "cat-1", name: "Caneca" }, error: null };
      if (name === "get_copywriting_config") return { data: {}, error: null };
      if (name === "fn_save_ai_enrichment_results") return { data: { new_version: 2 }, error: null };
      return { data: null, error: null };
    },
  };
  return {
    userId: "user-1",
    rateCounts: new Map<string, number>(),
    rateIds: [] as string[],
    rateLimiterUsed: null as unknown,
    quota: { allowed: true, log_id: "log-1", used: 1, limit: 100, remaining: 99 } as Record<string, unknown>,
    quotaCalls: [] as Array<Record<string, unknown>>,
    usage: [] as Array<Record<string, unknown>>,
    providerCalls: [] as Array<{ url: string; body: Record<string, unknown> }>,
    providerStatus: 200,
    providerBody: "",
    served: null as null | ((req: Request) => Promise<Response>),
    client,
  };
});

vi.mock("https://esm.sh/@supabase/supabase-js@2.49.4", () => ({ createClient: () => h.client }));

vi.mock("../_shared/auth.ts", () => ({
  authenticateRequest: async () => ({
    userId: h.userId, userRole: "vendedor", userRoles: ["vendedor"], localServiceClient: {},
  }),
  authErrorResponse: () => new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }),
}));

vi.mock("../_shared/credentials.ts", () => ({
  resolveCredential: async () => ({ value: "deepseek-key-test", source: "test" }),
}));

vi.mock("../_shared/external-fetch.ts", () => ({
  fetchWithBreaker: async (_service: string, url: string, init: { body: string }) => {
    h.providerCalls.push({ url, body: JSON.parse(init.body) as Record<string, unknown> });
    return new Response(h.providerBody, { status: h.providerStatus });
  },
  CircuitOpenError: class CircuitOpenError extends Error {},
  circuitOpenResponse: () => new Response("{}", { status: 503 }),
}));

// Mesmo comportamento do limiter SSOT: 20 req/min por identificador; a 21ª → 429.
vi.mock("../_shared/rate-limiter.ts", () => {
  const aiLimiter = { maxRequests: 20, windowMs: 60_000, keyPrefix: "ai" };
  return {
    rateLimiters: { ai: aiLimiter },
    applyRateLimit: async (req: Request, limiter: unknown, getIdentifier: (r: Request) => string) => {
      h.rateLimiterUsed = limiter;
      const id = getIdentifier(req);
      h.rateIds.push(id);
      const used = (h.rateCounts.get(id) ?? 0) + 1;
      h.rateCounts.set(id, used);
      if (used > aiLimiter.maxRequests) {
        return new Response(JSON.stringify({ error: "Too Many Requests" }), {
          status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" },
        });
      }
      return null;
    },
  };
});

vi.mock("../_shared/ai-usage.ts", () => ({
  acquireAiQuota: async (userId: string, functionName: string, model: string) => {
    h.quotaCalls.push({ userId, functionName, model });
    return h.quota;
  },
  logAiUsage: async (params: Record<string, unknown>) => {
    h.usage.push(params);
  },
  QuotaExceededError: class QuotaExceededError extends Error {},
}));

// O runner Node não tem `Deno`: stub do `serve` (captura o handler) e do `env`.
(globalThis as unknown as { Deno: unknown }).Deno = {
  serve: (fn: (req: Request) => Promise<Response>) => { h.served = fn; return {}; },
  env: {
    get: (key: string) =>
      ({
        SUPABASE_URL: "https://doufsxqlfjyuvxuezpln.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
      } as Record<string, string>)[key],
  },
};

const mod = await import("./index.ts");
const { rateLimiters } = await import("../_shared/rate-limiter.ts");

const AI_BODY = JSON.stringify({
  choices: [{ message: { content: JSON.stringify({
    ai_title: "Caneca Premium Personalizada", ai_description: "Descrição B2B.", ai_summary: "Resumo.",
  }) } }],
  usage: { prompt_tokens: 111, completion_tokens: 222 },
});

/** Chamada do produto com force_regenerate (nunca cai no cache). */
function regenerate(): Promise<Response> {
  if (!h.served) throw new Error("handler não registrado via Deno.serve");
  return h.served(new Request("https://edge.test/functions/v1/word-magic", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer test.jwt.token" },
    body: JSON.stringify({ product_id: PRODUCT_ID, force_regenerate: true }),
  }));
}

beforeEach(() => {
  h.rateCounts.clear();
  h.rateIds.length = 0;
  h.rateLimiterUsed = null;
  h.usage.length = 0;
  h.quotaCalls.length = 0;
  h.providerCalls.length = 0;
  h.providerStatus = 200;
  h.providerBody = AI_BODY;
  h.quota = { allowed: true, log_id: "log-1", used: 1, limit: 100, remaining: 99 };
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("F-08 — limite por minuto", () => {
  it("a 21ª chamada no minuto responde 429 e o provedor não é chamado", async () => {
    for (let i = 0; i < 20; i++) {
      expect((await regenerate()).status).toBe(200);
    }
    expect(h.providerCalls).toHaveLength(20);

    const res = await regenerate();
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    expect(res.headers.get("X-Request-Id")).toBeTruthy();
    expect(await res.json()).toEqual({ error: "Too Many Requests" });
    // teto atingido: a 21ª não chegou ao provedor nem registrou consumo
    expect(h.providerCalls).toHaveLength(20);
    expect(h.usage).toHaveLength(20);
  });

  it("o limite é contado por usuário autenticado no limiter SSOT da IA", async () => {
    await regenerate();
    expect(h.rateLimiterUsed).toBe(rateLimiters.ai);
    expect(h.rateIds).toEqual(["user-1"]);
  });
});

describe("F-08 — quota do usuário", () => {
  it("quota esgotada responde 429 sem chamar o provedor nem registrar consumo", async () => {
    h.quota = { allowed: false, used: 100, limit: 100, remaining: 0, reason: "quota_exceeded" };

    const res = await regenerate();

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      error: "Limite de uso de IA atingido.", reason: "quota_exceeded", used: 100, limit: 100, remaining: 0,
    });
    expect(h.providerCalls).toHaveLength(0);
    expect(h.usage).toHaveLength(0);
    expect(h.quotaCalls).toEqual([{ userId: "user-1", functionName: "word-magic", model: FLASH_MODEL }]);
  });
});

describe("F-08 — registro de consumo", () => {
  it("sucesso reserva quota e registra 1 consumo com os tokens da resposta", async () => {
    const res = await regenerate();

    expect(res.status).toBe(200);
    expect(h.quotaCalls).toEqual([{ userId: "user-1", functionName: "word-magic", model: FLASH_MODEL }]);
    expect(h.usage).toHaveLength(1);
    expect(h.usage[0]).toMatchObject({
      userId: "user-1", functionName: "word-magic", model: FLASH_MODEL,
      status: "success", inputTokens: 111, outputTokens: 222,
    });
    expect(typeof h.usage[0].durationMs).toBe("number");
  });

  it("erro do provedor registra consumo com status error (não engole a falha)", async () => {
    h.providerStatus = 500;
    h.providerBody = JSON.stringify({ error: "boom" });

    const res = await regenerate();

    expect(res.status).toBe(502);
    expect(h.usage).toHaveLength(1);
    expect(h.usage[0]).toMatchObject({ functionName: "word-magic", model: FLASH_MODEL, status: "error" });
    expect(String(h.usage[0].errorMessage)).toContain("HTTP 500");
  });
});

describe("F-08 — laço com force_regenerate", () => {
  it("25 regenerações: 20 chegam ao provedor e 5 viram 429", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 25; i++) {
      statuses.push((await regenerate()).status);
    }

    expect(statuses.filter((s) => s === 200)).toHaveLength(20);
    expect(statuses.filter((s) => s === 429)).toHaveLength(5);
    expect(h.providerCalls).toHaveLength(20);
    expect(h.usage).toHaveLength(20);
  });
});

describe("F-08 — modelo Flash, nunca Pro", () => {
  it("a constante é o Flash e é ela que vai no corpo enviado ao provedor", async () => {
    expect(mod.DEEPSEEK_MODEL).toBe(FLASH_MODEL);

    await regenerate();

    expect(h.providerCalls).toHaveLength(1);
    expect(h.providerCalls[0].body.model).toBe(FLASH_MODEL);
    expect(String(h.providerCalls[0].body.model)).not.toMatch(/pro/i);
    expect(h.usage[0].model).toBe(FLASH_MODEL);
  });

  it("a fonte não referencia nenhum modelo Pro", () => {
    const src = readFileSync(path.resolve(process.cwd(), SRC_PATH), "utf8");
    expect(src).toContain("'deepseek-v4-flash'");
    expect(src).not.toMatch(/deepseek[a-z0-9-]*pro/i);
  });
});

describe("F-08 — index.ts usa os helpers SSOT", () => {
  const SRC = readFileSync(path.resolve(process.cwd(), SRC_PATH), "utf8");

  it("aplica o limite com o limiter SSOT da IA por usuário autenticado", () => {
    expect(SRC).toContain("import { applyRateLimit, rateLimiters } from '../_shared/rate-limiter.ts'");
    expect(SRC).toMatch(/applyRateLimit\(req, rateLimiters\.ai, \(\) => auth\.userId\)/);
    expect(SRC).toMatch(/return new Response\(rateLimited\.body, \{ status: rateLimited\.status, headers \}\)/);
  });

  it("reserva quota (acquire_ai_quota) e registra consumo (logAiUsage)", () => {
    expect(SRC).toContain("import { acquireAiQuota, logAiUsage } from '../_shared/ai-usage.ts'");
    expect(SRC).toMatch(/acquireAiQuota\(auth\.userId, AI_FUNCTION_NAME, DEEPSEEK_MODEL\)/);
    expect(SRC).toMatch(/if \(!quota\.allowed\)/);
    expect(SRC).toMatch(/logAiUsage\(\{/);
    expect(SRC).toMatch(/status:\s*'success',/);
  });
});
