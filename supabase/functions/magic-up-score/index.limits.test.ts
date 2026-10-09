/**
 * F-05/F-07 — limites de tamanho da entrada da pontuação do Magic Up: corpo
 * acima do teto → 413 ANTES do download completo (content-length denuncia, ou a
 * leitura para ao passar do teto); imagem acima do limite → 413 antes do
 * provedor; texto livre cortado no máximo; corpo válido continua passando.
 *
 * Exercita o handler real (`handleRequest`); as deps de rede são mockadas.
 * Roda pelo shim `tests/edge-functions/magic-up-score.limits.test.ts`
 * (`supabase/functions/**` não está no include do vitest.config.ts).
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const mocks = vi.hoisted(() => ({ callAiWithTracking: vi.fn() }));

vi.mock("../_shared/auth.ts", () => ({
  authenticateRequest: async () => ({ userId: "user-1" }),
  authErrorResponse: () => new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }),
}));
vi.mock("../_shared/ai-usage.ts", () => ({
  callAiWithTracking: mocks.callAiWithTracking,
  QuotaExceededError: class QuotaExceededError extends Error {},
}));
vi.mock("../_shared/bot-protection.ts", () => ({
  runBotProtection: async () => ({ allowed: true, blockResponse: null }),
}));
vi.mock("../_shared/ai-credentials.ts", () => ({
  resolveAiApiKey: async () => ({ apiKey: "test-key" }),
}));

const AI_DIAGNOSIS = {
  total: 88,
  label: "Bom",
  summary: "Resumo",
  criteria: Array.from({ length: 4 }, (_, i) => ({
    id: `c${i}`, label: `Critério ${i}`, score: 80, passed: true, weight: 1, recommendation: "ok",
  })),
  strengths: [], risks: [], recommendations: [],
};

type LimitsModule = typeof import("./index.ts");
let mod: LimitsModule;

beforeAll(async () => {
  // `index.ts` chama `Deno.serve` no top-level; o stub evita quebrar no Node.
  (globalThis as unknown as { Deno: { serve: (h: unknown) => void } }).Deno = { serve: () => undefined };
  mod = await import("./index.ts");
});

beforeEach(() => {
  mocks.callAiWithTracking.mockReset();
  mocks.callAiWithTracking.mockResolvedValue(
    new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(AI_DIAGNOSIS) } }] }), { status: 200 }),
  );
});

// Corpo falso: conta quando pedem o reader (prova "não abriu o download") e os
// bytes já entregues (prova o corte cedo).
function bodyStream(text: string, chunkSize = 64 * 1024) {
  const bytes = new TextEncoder().encode(text);
  let sent = 0, pulled = 0, readers = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent >= bytes.length) { controller.close(); return; }
      const end = Math.min(sent + chunkSize, bytes.length);
      const chunk = bytes.slice(sent, end);
      sent = end;
      pulled += chunk.byteLength;
      controller.enqueue(chunk);
    },
  });
  const body = {
    getReader() { readers += 1; return stream.getReader(); },
  } as unknown as ReadableStream<Uint8Array>;
  return { body, pulledBytes: () => pulled, readerRequests: () => readers };
}

// Request mínimo (method/headers/body) — evita as travas do Request do undici.
function fakeRequest(opts: { contentLength?: string | number; body?: ReadableStream<Uint8Array> | null }): Request {
  const headers = new Headers();
  if (opts.contentLength !== undefined) headers.set("content-length", String(opts.contentLength));
  return { method: "POST", headers, body: opts.body ?? null } as unknown as Request;
}

const validBody = (overrides: Record<string, unknown> = {}) => ({
  imageUrl: "https://cdn.example.com/mockup/peca.png",
  productName: "Caneca Premium",
  clientName: "ACME",
  campaignBrief: { channel: "whatsapp", objective: "orcamento-rapido" },
  brandKit: { primaryColor: "#0055ff" },
  creativeControls: { aspectRatio: "1:1" },
  promptText: "Foto publicitária da caneca com logo",
  channel: "whatsapp",
  aspectRatio: "1:1",
  ...overrides,
});
const bodyOf = (payload: unknown) => JSON.stringify(payload);

describe("F-07 — corpo acima do teto é recusado com 413 antes do download completo", () => {
  it("content-length acima do teto → 413 sem abrir o corpo", async () => {
    const { body, readerRequests } = bodyStream("x".repeat(mod.MAX_REQUEST_BYTES + 1_000));
    const res = await mod.handleRequest(fakeRequest({ contentLength: mod.MAX_REQUEST_BYTES + 1_000, body }));
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: "payload_too_large", limit_bytes: mod.MAX_REQUEST_BYTES });
    expect(readerRequests()).toBe(0);
    expect(mocks.callAiWithTracking).not.toHaveBeenCalled();
  });

  it("sem content-length, a leitura para ao passar do teto (não baixa tudo)", async () => {
    const total = mod.MAX_REQUEST_BYTES + 500_000;
    const { body, pulledBytes, readerRequests } = bodyStream("x".repeat(total));
    const res = await mod.handleRequest(fakeRequest({ body }));
    expect(res.status).toBe(413);
    expect(readerRequests()).toBe(1);
    expect(pulledBytes()).toBeLessThan(total);
    // corte logo após o teto (um chunk de folga para o buffering do stream)
    expect(pulledBytes()).toBeLessThanOrEqual(mod.MAX_REQUEST_BYTES + 2 * 64 * 1024);
    expect(mocks.callAiWithTracking).not.toHaveBeenCalled();
  });
});

describe("F-07 — imagem acima do limite é recusada com 413 antes do provedor", () => {
  it("imageUrl embutida (data:) acima de MAX_IMAGE_URL_BYTES → 413", async () => {
    const imageUrl = `data:image/png;base64,${"A".repeat(mod.MAX_IMAGE_URL_BYTES)}`;
    const { body } = bodyStream(bodyOf(validBody({ imageUrl })));
    const res = await mod.handleRequest(fakeRequest({ body }));
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: "payload_too_large", limit_bytes: mod.MAX_IMAGE_URL_BYTES });
    expect(mocks.callAiWithTracking).not.toHaveBeenCalled();
  });
});

describe("F-07 — texto livre é cortado no máximo definido", () => {
  it("truncateText corta o excedente e ignora valores não-textuais", () => {
    expect(mod.truncateText("a".repeat(5_000), 200)).toHaveLength(200);
    expect(mod.truncateText("  x  ", 10)).toBe("x");
    expect(mod.truncateText(42, 10)).toBeNull();
    expect(mod.truncateText(null, 10)).toBeNull();
    expect(mod.truncateText("   ", 10)).toBeNull();
  });

  it("o prompt enviado à IA recebe os campos já cortados", async () => {
    const { body } = bodyStream(bodyOf(validBody({
      productName: "p".repeat(5_000), promptText: "t".repeat(50_000), clientName: "c".repeat(5_000),
    })));
    const res = await mod.handleRequest(fakeRequest({ body }));
    expect(res.status).toBe(200);
    expect(mocks.callAiWithTracking).toHaveBeenCalledTimes(1);
    const arg = mocks.callAiWithTracking.mock.calls[0][0] as {
      requestBody: { messages: Array<{ content: Array<{ text: string }> }> };
    };
    const context = arg.requestBody.messages[0].content[0].text.split("Contexto:\n")[1] ?? "";
    expect(context.length).toBeLessThanOrEqual(mod.MAX_TEXT_LENGTHS.context);
    expect(context).toContain("p".repeat(mod.MAX_TEXT_LENGTHS.productName));
    expect(context).not.toContain("p".repeat(mod.MAX_TEXT_LENGTHS.productName + 1));
    expect(context).not.toContain("t".repeat(mod.MAX_TEXT_LENGTHS.promptText + 1));
    expect(context).not.toContain("c".repeat(mod.MAX_TEXT_LENGTHS.clientName + 1));
  });
});

describe("F-07 — corpo válido continua passando", () => {
  it("payload válido → 200 com o diagnóstico da IA", async () => {
    const { body } = bodyStream(bodyOf(validBody()));
    const res = await mod.handleRequest(fakeRequest({ body }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ total: 88, label: "Bom", source: "ai" });
    expect(mocks.callAiWithTracking).toHaveBeenCalledTimes(1);
  });

  it("content-length pequeno e verdadeiro não é barrado", async () => {
    const payload = bodyOf(validBody());
    const { body } = bodyStream(payload);
    const res = await mod.handleRequest(fakeRequest({ contentLength: new TextEncoder().encode(payload).byteLength, body }));
    expect(res.status).toBe(200);
  });

  it("campo obrigatório ausente continua 400 (não vira 413)", async () => {
    const { body } = bodyStream(bodyOf({ productName: "sem imagem" }));
    expect((await mod.handleRequest(fakeRequest({ body }))).status).toBe(400);
  });

  it("corpo não-JSON responde 400 invalid_json (falha mostrada ao cliente)", async () => {
    const { body } = bodyStream("nao-e-json");
    const res = await mod.handleRequest(fakeRequest({ body }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_json" });
  });
});

describe("F-07 — helpers puros de limite", () => {
  it("declaredBodyBytes lê content-length válido e ignora o resto; byteLength é UTF-8", () => {
    expect(mod.declaredBodyBytes(fakeRequest({ contentLength: 123 }))).toBe(123);
    expect(mod.declaredBodyBytes(fakeRequest({}))).toBeNull();
    expect(mod.declaredBodyBytes(fakeRequest({ contentLength: "abc" }))).toBeNull();
    expect(mod.declaredBodyBytes(fakeRequest({ contentLength: -5 }))).toBeNull();
    expect(mod.byteLength("abc")).toBe(3);
    expect(mod.byteLength("á")).toBe(2);
  });
});

describe("F-07 — index.ts usa a defesa", () => {
  const INDEX_SRC = readFileSync(path.resolve(process.cwd(), "supabase/functions/magic-up-score/index.ts"), "utf8");

  it("declara os tetos e lê o corpo com readBodyWithinLimit", () => {
    expect(INDEX_SRC).toContain("export const MAX_REQUEST_BYTES");
    expect(INDEX_SRC).toContain("export const MAX_IMAGE_URL_BYTES");
    expect(INDEX_SRC).toMatch(/readBodyWithinLimit\(req, MAX_REQUEST_BYTES\)/);
    expect(INDEX_SRC).toMatch(/declared !== null && declared > MAX_REQUEST_BYTES/);
  });

  it("responde 413 para corpo e imagem grandes", () => {
    expect(INDEX_SRC).toMatch(/byteLength\(parsed\.data\.imageUrl\) > MAX_IMAGE_URL_BYTES/);
    expect((INDEX_SRC.match(/payload_too_large/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it("corta os textos livres antes de compor o prompt", () => {
    expect(INDEX_SRC).toMatch(/truncateText\(parsed\.data\.promptText, MAX_TEXT_LENGTHS\.promptText\)/);
    expect(INDEX_SRC).toMatch(/truncateText\(parsed\.data\.productName, MAX_TEXT_LENGTHS\.productName\)/);
    expect(INDEX_SRC).not.toMatch(/promptText: parsed\.data\.promptText,/);
  });
});
