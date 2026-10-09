/**
 * Integration tests — edge function `magic-up-score` contra o CONTRATO REAL.
 *
 * Ao contrário da versão anterior (que mockava `fetch` e assertava contra o
 * próprio mock, inventando `product_id`/`factors`/`tier`/`eligible_for_magic_up`
 * inexistentes), aqui a função REAL é carregada e executada em processo:
 * capturamos o handler entregue a `Deno.serve` em
 * `supabase/functions/magic-up-score/index.ts` e o invocamos com `Request`
 * reais, assertando as `Response` reais. Apenas as dependências Deno-only
 * (auth, bot-protection, ai-usage, ai-credentials, cors — todas com import
 * `npm:`/`Deno.env`) são substituídas por stubs.
 *
 * Contrato real (index.ts): entrada `{ imageUrl(min 10), productName?,
 * clientName?, campaignBrief?, brandKit?, creativeControls?, promptText?,
 * channel?, aspectRatio? }`; sucesso `{ total, label, summary, criteria[4..10],
 * strengths, risks, recommendations, source:'ai' }`; 400 `{ error:"Validation
 * failed", details }`; 401 auth; repassa status da IA (ex.: 402); 429 quota.
 *
 * Se o handler mudar (schema de entrada, status codes, envelope de sucesso,
 * modelo ou mensagens), estes testes ficam vermelhos.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

type EdgeHandler = (req: Request) => Promise<Response>;

const shared = vi.hoisted(() => {
  class QuotaExceededError extends Error {}
  return {
    QuotaExceededError,
    authenticate: vi.fn(),
    authError: vi.fn(),
    botProtection: vi.fn(),
    cors: vi.fn(),
    resolveKey: vi.fn(),
    callAi: vi.fn(),
  };
});

vi.mock("../../../supabase/functions/_shared/cors.ts", () => ({ getCorsHeaders: shared.cors }));
vi.mock("../../../supabase/functions/_shared/auth.ts", () => ({
  authenticateRequest: shared.authenticate,
  authErrorResponse: shared.authError,
}));
vi.mock("../../../supabase/functions/_shared/bot-protection.ts", () => ({
  runBotProtection: shared.botProtection,
}));
vi.mock("../../../supabase/functions/_shared/ai-credentials.ts", () => ({
  resolveAiApiKey: shared.resolveKey,
}));
vi.mock("../../../supabase/functions/_shared/ai-usage.ts", () => ({
  callAiWithTracking: shared.callAi,
  QuotaExceededError: shared.QuotaExceededError,
}));

const CORS_ORIGIN = "https://www.promogifts.com.br";
const IMAGE_URL = "https://cdn.example.com/magic-up/ad.png";

// Envelope de sucesso no formato REAL do DiagnosisSchema (index.ts:29-37).
const DIAGNOSIS = {
  total: 78.5,
  label: "boa",
  summary: "Peça clara, com boa visibilidade de logo.",
  criteria: [
    { id: "product_clarity", label: "Clareza do produto", score: 85, passed: true, weight: 3, recommendation: "Manter o enquadramento atual." },
    { id: "logo_visibility", label: "Visibilidade do logo", score: 70, passed: true, weight: 4, recommendation: "Aumentar o contraste do logo." },
    { id: "channel_fit", label: "Adequação ao canal", score: 65, passed: true, weight: 3, recommendation: "Ajustar o formato ao canal." },
    { id: "brand_coherence", label: "Coerência com a marca", score: 80, passed: true, weight: 2, recommendation: "Manter as cores da marca." },
  ],
  strengths: ["Boa iluminação"],
  risks: ["Pouco espaço para copy"],
  recommendations: ["Ampliar a área de CTA"],
};

function aiContent(content: unknown): Response {
  const text = typeof content === "string" ? content : JSON.stringify(content);
  return new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function upstream(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function post(body: unknown): Request {
  return new Request("https://edge.local/functions/v1/magic-up-score", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer valid-jwt" },
    body: JSON.stringify(body),
  });
}

let handler!: EdgeHandler;

beforeAll(async () => {
  const serve = vi.fn<(h: EdgeHandler) => void>();
  (globalThis as unknown as Record<string, unknown>).Deno = { serve };
  await import("../../../supabase/functions/magic-up-score/index.ts");
  expect(serve).toHaveBeenCalledTimes(1);
  handler = serve.mock.calls[0][0];
});

beforeEach(() => {
  shared.authenticate.mockClear();
  shared.authError.mockClear();
  shared.botProtection.mockClear();
  shared.cors.mockClear();
  shared.resolveKey.mockClear();
  shared.callAi.mockReset();
  shared.authenticate.mockResolvedValue({
    userId: "u-1",
    userRole: "vendedor",
    userRoles: ["vendedor"],
    localServiceClient: {},
  });
  shared.botProtection.mockResolvedValue({ allowed: true, blockResponse: undefined });
  shared.cors.mockReturnValue({ "Access-Control-Allow-Origin": CORS_ORIGIN });
  shared.resolveKey.mockResolvedValue({ apiKey: "test-key" });
  shared.authError.mockImplementation((err: { status?: number; message?: string }) =>
    new Response(JSON.stringify({ error: err?.message ?? "Erro de autenticação" }), {
      status: typeof err?.status === "number" ? err.status : 500,
      headers: { "Access-Control-Allow-Origin": CORS_ORIGIN, "Content-Type": "application/json" },
    }),
  );
  shared.callAi.mockReset();
});

describe("magic-up-score — contrato real do handler", () => {
  it("401 quando a autenticação falha (usa authErrorResponse com o status do erro)", async () => {
    shared.authenticate.mockRejectedValue({ status: 401, message: "Token de autenticação ausente" });
    const res = await handler(post({ imageUrl: IMAGE_URL }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Token de autenticação ausente" });
    expect(shared.callAi).not.toHaveBeenCalled();
  });

  it("400 'Validation failed' quando imageUrl está ausente (e não chama a IA)", async () => {
    const res = await handler(post({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toHaveProperty("imageUrl");
    expect(shared.callAi).not.toHaveBeenCalled();
  });

  it("400 quando imageUrl tem menos de 10 caracteres (min(10) do schema real)", async () => {
    const res = await handler(post({ imageUrl: "curto" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Validation failed");
    expect(shared.callAi).not.toHaveBeenCalled();
  });

  it("200 com o envelope REAL {total,label,summary,criteria,strengths,risks,recommendations,source:'ai'}", async () => {
    shared.callAi.mockResolvedValue(aiContent(DIAGNOSIS));
    const res = await handler(post({ imageUrl: IMAGE_URL }));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    const body = await res.json();
    expect(body).toMatchObject({ source: "ai", total: 78.5, label: "boa", summary: DIAGNOSIS.summary });
    expect(body.criteria).toHaveLength(4);
    expect(body.criteria[0]).toMatchObject({ id: "product_clarity", passed: true, weight: 3 });
    expect(body.strengths).toEqual(["Boa iluminação"]);
    expect(body.risks).toEqual(["Pouco espaço para copy"]);
    expect(body.recommendations).toEqual(["Ampliar a área de CTA"]);

    // O contrato imaginado do teste antigo NÃO existe no handler real.
    expect(body).not.toHaveProperty("product_id");
    expect(body).not.toHaveProperty("factors");
    expect(body).not.toHaveProperty("tier");
    expect(body).not.toHaveProperty("eligible_for_magic_up");
  });

  it("encaminha à IA o modelo google/gemini-2.5-pro e functionName magic-up-score", async () => {
    shared.callAi.mockResolvedValue(aiContent(DIAGNOSIS));
    await handler(
      post({ imageUrl: IMAGE_URL, channel: "instagram", productName: "Caneca", aspectRatio: "1:1" }),
    );

    expect(shared.callAi).toHaveBeenCalledTimes(1);
    const args = shared.callAi.mock.calls[0][0] as {
      functionName: string;
      model: string;
      requestBody: {
        model: string;
        messages: Array<{ content: Array<{ type: string; text?: string; image_url?: { url: string } }> }>;
      };
    };
    expect(args.functionName).toBe("magic-up-score");
    expect(args.model).toBe("google/gemini-2.5-pro");
    expect(args.requestBody.model).toBe("google/gemini-2.5-pro");

    const parts = args.requestBody.messages[0].content;
    expect(parts.find((p) => p.type === "image_url")?.image_url?.url).toBe(IMAGE_URL);
    // O contexto estruturado leva os campos opcionais recebidos.
    expect(parts.find((p) => p.type === "text")?.text).toContain('"channel": "instagram"');
  });

  it("500 quando a IA devolve um diagnóstico que viola o schema real (criteria < 4)", async () => {
    shared.callAi.mockResolvedValue(aiContent({ ...DIAGNOSIS, criteria: DIAGNOSIS.criteria.slice(0, 3) }));
    const res = await handler(post({ imageUrl: IMAGE_URL }));
    expect(res.status).toBe(500);
  });

  it("500 quando o content da IA não contém JSON", async () => {
    shared.callAi.mockResolvedValue(aiContent("desculpe, não consigo avaliar"));
    const res = await handler(post({ imageUrl: IMAGE_URL }));
    expect(res.status).toBe(500);
  });

  it("500 quando a resposta da IA não tem content textual", async () => {
    shared.callAi.mockResolvedValue(upstream(200, { choices: [] }));
    const res = await handler(post({ imageUrl: IMAGE_URL }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("AI response missing content");
  });

  it("repassa o status da IA (402 → créditos esgotados)", async () => {
    shared.callAi.mockResolvedValue(upstream(402, { error: "no credits" }));
    const res = await handler(post({ imageUrl: IMAGE_URL }));
    expect(res.status).toBe(402);
    expect((await res.json()).error).toBe("Créditos de IA esgotados para análise de score.");
  });

  it("429 quando a quota de IA é excedida (QuotaExceededError)", async () => {
    shared.callAi.mockRejectedValue(new shared.QuotaExceededError("quota"));
    const res = await handler(post({ imageUrl: IMAGE_URL }));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe("Limite mensal de IA atingido.");
  });

  it("respeita o bloqueio anti-bot (devolve o blockResponse)", async () => {
    shared.botProtection.mockResolvedValue({
      allowed: false,
      blockResponse: new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { "Access-Control-Allow-Origin": CORS_ORIGIN },
      }),
    });
    const res = await handler(post({ imageUrl: IMAGE_URL }));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe("rate_limited");
    expect(shared.callAi).not.toHaveBeenCalled();
  });

  it("OPTIONS devolve preflight (200 vazio) com os headers CORS, sem exigir auth", async () => {
    const res = await handler(
      new Request("https://edge.local/functions/v1/magic-up-score", { method: "OPTIONS" }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(CORS_ORIGIN);
    expect(await res.text()).toBe("");
    expect(shared.authenticate).not.toHaveBeenCalled();
  });
});
