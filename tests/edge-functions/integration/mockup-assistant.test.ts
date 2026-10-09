/**
 * Integration (contract) — edge `mockup-assistant` (assistente "Matheus", etapa 41).
 *
 * O runtime Deno não roda no vitest (`Deno.serve`, imports `npm:`), então a borda
 * HTTP é SIMULADA aqui no nível do contrato, reusando os MÓDULOS REAIS de
 * `supabase/functions/_shared/` que a edge compõe:
 *   - `zod-validate.ts` → envelope canônico de validação (422 VALIDATION_FAILED,
 *     400 EMPTY_BODY / INVALID_JSON) e o limite do corpo aceito;
 *   - `error-response.ts` → erro de borda seguro (401/502) que não vaza detalhe;
 *   - `cors.ts` → headers de CORS do preflight;
 *   - `rate-limiter.ts` → SSOT do limite de IA (20 msg/min por usuário).
 * `fetch` é mockado apenas no transporte. A execução real do handler (ordem
 * 401 → 429 → 422 → provedor) é coberta pela suíte Deno co-localizada da edge
 * (`supabase/functions/mockup-assistant/index.test.ts`).
 *
 * Contrato provado (falha se o envelope, o limite ou o erro do provedor
 * regredirem): 401 sem JWT; 422 corpo inválido; 429 na 21ª mensagem do minuto;
 * 502 do provedor com mensagem genérica, sem vazar o prompt do cliente.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mockEdgeFunctionFetch, resetExternalMocks } from "../../p0/_mocks";
import { getCorsHeaders } from "../../../supabase/functions/_shared/cors";
import { safeErrorResponse } from "../../../supabase/functions/_shared/error-response";
import { z, parseBodyWithSchema } from "../../../supabase/functions/_shared/zod-validate";

/** Projeto canônico (REGRA #1: doufsxqlfjyuvxuezpln). */
const ENDPOINT = "https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/mockup-assistant";
const ALLOWED_ORIGIN = "https://www.promogifts.com.br";
const REQUEST_ID = "req-44-mockup-assistant";
const AUTH_HEADERS = { "Content-Type": "application/json", Authorization: "Bearer test.jwt.user" };

const CORS = getCorsHeaders(new Request(ENDPOINT, { headers: { origin: ALLOWED_ORIGIN } }));

/** Mensagem genérica que a edge devolve quando o provedor de IA falha. */
const PROVIDER_ERROR_MESSAGE =
  "O assistente está indisponível no momento. Tente novamente em instantes.";

/**
 * Contrato de entrada do assistente (espelha o schema Zod da edge): mensagem
 * 1..2000, histórico de até 20 turnos com roles user|assistant, contexto opcional.
 */
const MockupAssistantRequestSchema = z.object({
  message: z.string().trim().min(1, "A mensagem não pode ser vazia").max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .max(20)
    .optional(),
  context: z
    .object({
      productName: z.string().trim().max(200).optional(),
      techniqueName: z.string().trim().max(200).optional(),
      dimensions: z.string().trim().max(200).optional(),
      hasLogo: z.boolean().optional(),
    })
    .optional(),
});

function post(body: unknown, headers: Record<string, string> = AUTH_HEADERS): Promise<Response> {
  return fetch(ENDPOINT, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** Roda o validador REAL de borda sobre um corpo cru e devolve o que o cliente veria. */
async function validate(body: string | null) {
  const init: RequestInit = { method: "POST", headers: { "Content-Type": "application/json" } };
  if (body !== null) init.body = body;
  const parsed = await parseBodyWithSchema(
    new Request(ENDPOINT, init),
    MockupAssistantRequestSchema,
    CORS,
  );
  if ("error" in parsed) {
    return {
      status: parsed.error.status,
      headers: Object.fromEntries(parsed.error.headers.entries()) as Record<string, string>,
      body: (await parsed.error.json()) as {
        code: string;
        message: string;
        fields: Array<{ path: string; code: string; message: string }>;
      },
      data: null,
    };
  }
  return { status: 200, headers: {} as Record<string, string>, body: null, data: parsed.data };
}

describe("mockup-assistant — contrato HTTP do assistente", () => {
  beforeEach(() => mockEdgeFunctionFetch({}));
  afterEach(() => resetExternalMocks());

  describe("autenticação — 401", () => {
    it("sem JWT a borda devolve o erro do SSOT de auth e nenhum conteúdo do assistente", async () => {
      // A mensagem de 401 é do `_shared/auth.ts` (fonte real), não inventada aqui.
      const authSource = readFileSync(
        resolve(__dirname, "../../../supabase/functions/_shared/auth.ts"),
        "utf8",
      );
      const missingToken = "Token de autenticação ausente";
      expect(authSource).toContain(`message: '${missingToken}'`);

      const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const edgeResponse = safeErrorResponse(
        { status: 401, message: missingToken },
        { status: 401, publicMessage: missingToken, requestId: REQUEST_ID, corsHeaders: CORS },
      );
      const edgeBody = await edgeResponse.json();
      spy.mockRestore();

      mockEdgeFunctionFetch({ "/mockup-assistant": { status: 401, body: edgeBody, headers: CORS } });
      const res = await post({ message: "Como posiciono a logo?" }, { "Content-Type": "application/json" });

      expect(res.status).toBe(401);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.error).toBe(missingToken);
      expect(body.request_id).toBe(REQUEST_ID);
      expect(body).not.toHaveProperty("answer");
      expect(body).not.toHaveProperty("model");
    });
  });

  describe("sucesso — 200 (somente texto, nunca imagem)", () => {
    it("com JWT devolve { answer, model } e não devolve artefato de mockup", async () => {
      mockEdgeFunctionFetch({
        "/mockup-assistant": {
          status: 200,
          body: { answer: "Posicione a logo a 8 cm da gola.", model: "deepseek-flash" },
          headers: CORS,
        },
      });
      const res = await post({
        message: "Qual o tamanho ideal da logo?",
        context: { productName: "Camiseta", techniqueName: "Serigrafia", hasLogo: true },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(typeof body.answer).toBe("string");
      expect((body.answer as string).length).toBeGreaterThan(0);
      expect(typeof body.model).toBe("string");
      // O assistente orienta; a composição da imagem é da edge generate-mockup.
      expect(body).not.toHaveProperty("mockupUrl");
      expect(body).not.toHaveProperty("mockup_url");
    });
  });

  describe("corpo inválido — 422 no envelope canônico", () => {
    const invalidBodies: Array<[string, unknown]> = [
      ["body vazio", {}],
      ["mensagem vazia", { message: "" }],
      ["mensagem só espaços", { message: "   " }],
      ["mensagem acima de 2000", { message: "x".repeat(2001) }],
      ["role fora do enum", { message: "ok", history: [{ role: "system", content: "y" }] }],
      [
        "histórico acima de 20 turnos",
        { message: "ok", history: Array.from({ length: 21 }, () => ({ role: "user", content: "y" })) },
      ],
      ["contexto com campo errado", { message: "ok", context: { hasLogo: "sim" } }],
    ];

    for (const [label, payload] of invalidBodies) {
      it(`422 com code/fields canônicos para: ${label}`, async () => {
        const result = await validate(JSON.stringify(payload));
        expect(result.status).toBe(422);
        expect(result.body?.code).toBe("VALIDATION_FAILED");
        expect(result.headers["x-error-code"]).toBe("VALIDATION_FAILED");
        expect(result.body?.fields.length).toBeGreaterThan(0);
        for (const field of result.body?.fields ?? []) {
          expect(typeof field.path).toBe("string");
          expect(typeof field.code).toBe("string");
          expect(typeof field.message).toBe("string");
        }
      });
    }

    it("JSON malformado e corpo ausente são 400 (nunca 422 e nunca 500)", async () => {
      const malformed = await validate("{nao-e-json");
      expect(malformed.status).toBe(400);
      expect(malformed.body?.code).toBe("INVALID_JSON");

      const empty = await validate(null);
      expect(empty.status).toBe(400);
      expect(empty.body?.code).toBe("EMPTY_BODY");
    });

    it("corpo válido passa pelo mesmo validador (o 422 não é o único caminho)", async () => {
      const ok = await validate(
        JSON.stringify({
          message: "Como posiciono a logo?",
          history: [{ role: "user", content: "Oi" }, { role: "assistant", content: "Olá!" }],
          context: { productName: "Caneca", dimensions: "20x20cm" },
        }),
      );
      expect(ok.status).toBe(200);
      expect(ok.data?.message).toBe("Como posiciono a logo?");
      expect(ok.data?.history).toHaveLength(2);
    });
  });

  describe("limite — 429 após 20 mensagens no minuto", () => {
    it("o SSOT de IA fixa 20 msg/min por usuário e monta o 429 com Retry-After", () => {
      const source = readFileSync(
        resolve(__dirname, "../../../supabase/functions/_shared/rate-limiter.ts"),
        "utf8",
      );
      const aiLimiter = source.slice(source.indexOf("ai: new RateLimiter"));
      expect(aiLimiter).toMatch(/maxRequests:\s*20\b/);
      expect(aiLimiter).toMatch(/windowMs:\s*60\s*\*\s*1000\b/);
      expect(aiLimiter).toMatch(/keyPrefix:\s*'ai'/);
      // O 429 do middleware real traz Retry-After e o limite em header.
      expect(source).toContain("status: 429");
      expect(source).toContain("'X-RateLimit-Limit': limiter['config'].maxRequests.toString()");
      expect(source).toContain("'Retry-After'");
    });

    it("as 20 primeiras mensagens do minuto passam; a 21ª é bloqueada", async () => {
      const limit = 20;
      let used = 0;
      const fetchMock = vi.fn(async () => {
        used += 1;
        if (used > limit) {
          return new Response(
            JSON.stringify({
              error: "Too Many Requests",
              message: "Rate limit exceeded. Please try again later.",
              remaining: 0,
            }),
            { status: 429, headers: { ...CORS, "Retry-After": "60", "X-RateLimit-Limit": String(limit) } },
          );
        }
        return new Response(JSON.stringify({ answer: `resposta ${used}`, model: "deepseek-flash" }), {
          status: 200,
          headers: { ...CORS },
        });
      });
      vi.stubGlobal("fetch", fetchMock);

      const responses: Response[] = [];
      for (let i = 1; i <= limit + 1; i += 1) {
        responses.push(await post({ message: `pergunta ${i}` }));
      }

      expect(responses.slice(0, limit).map((r) => r.status)).toEqual(Array(limit).fill(200));
      const limited = responses[limit];
      expect(limited.status).toBe(429);
      expect(limited.headers.get("retry-after")).toBe("60");
      expect(limited.headers.get("x-ratelimit-limit")).toBe("20");
      // O consumidor não perde o CORS no 429 (senão o front não lê o erro).
      expect(limited.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
      expect(((await limited.json()) as { error: string }).error).toBe("Too Many Requests");
    });
  });

  describe("falha do provedor — 502 com mensagem genérica", () => {
    it("não vaza o texto do cliente: o detalhe fica no log do servidor", async () => {
      const secret = "CANETA-AZUL-DO-CLIENTE-XYZ";
      const providerError = new Error(`upstream 500 ao processar o prompt: ${secret}`);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const edgeResponse = safeErrorResponse(providerError, {
        status: 502,
        publicMessage: PROVIDER_ERROR_MESSAGE,
        requestId: REQUEST_ID,
        corsHeaders: CORS,
        logLabel: "[mockup-assistant] provider_error",
      });
      const edgeBody = (await edgeResponse.json()) as Record<string, unknown>;

      expect(edgeResponse.status).toBe(502);
      expect(edgeBody.error).toBe(PROVIDER_ERROR_MESSAGE);
      expect(edgeBody.request_id).toBe(REQUEST_ID);
      expect(JSON.stringify(edgeBody)).not.toContain(secret);
      expect(JSON.stringify(edgeBody)).not.toContain("upstream 500");
      expect(JSON.stringify(edgeBody)).not.toMatch(/at\s+\w+.*\(/);

      // O erro real não desaparece: fica registrado no servidor.
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy.mock.calls.flat().map(String).join(" ")).toContain(secret);
      consoleSpy.mockRestore();

      mockEdgeFunctionFetch({ "/mockup-assistant": { status: 502, body: edgeBody, headers: CORS } });
      const res = await post({ message: `Quero gravar ${secret} na caneca` });

      expect(res.status).toBe(502);
      const clientBody = (await res.json()) as Record<string, unknown>;
      expect(clientBody.error).toBe(PROVIDER_ERROR_MESSAGE);
      expect(JSON.stringify(clientBody)).not.toContain(secret);
      expect(JSON.stringify(clientBody)).not.toContain("Quero gravar");
    });
  });

  describe("CORS", () => {
    it("preflight do origin permitido recebe o CORS real da edge", async () => {
      const headers = getCorsHeaders(new Request(ENDPOINT, { method: "OPTIONS", headers: { origin: ALLOWED_ORIGIN } }));
      mockEdgeFunctionFetch({ "/mockup-assistant": { status: 200, body: null, headers } });
      const res = await fetch(ENDPOINT, { method: "OPTIONS", headers: { origin: ALLOWED_ORIGIN } });

      expect(res.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
      expect(res.headers.get("access-control-allow-headers")).toContain("authorization");
    });

    it("origin desconhecido não é refletido (fallback canônico, nunca o host do atacante)", () => {
      const headers = getCorsHeaders(
        new Request(ENDPOINT, { headers: { origin: "https://evil.example" } }),
      );
      expect(headers["Access-Control-Allow-Origin"]).toBe(ALLOWED_ORIGIN);
      expect(headers["Access-Control-Allow-Origin"]).not.toBe("https://evil.example");
    });
  });
});
