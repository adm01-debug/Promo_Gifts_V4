/**
 * generate-ad-image — teto de tamanho e formatos aceitos do logo inline (F pergunta 7).
 *
 * Critério do cartão: `logoBase64` era aceito sem limite — um logo gigante ficava na
 * memória do isolate e era reenviado inteiro ao provedor (custo por imagem). Correção:
 * até 10 MB decodificados e formatos PNG/JPG/WebP, medidos ANTES de decodificar e
 * recusados ANTES de montar o prompt/chamar o provedor (mesmo padrão do generate-mockup).
 *
 * Exercita o handler REAL (`./index.ts`): o stub de `Deno.serve` captura o handler que a
 * função registra e o teste entrega requisições POST de verdade — assim o 413/415 e o
 * código no corpo são os que o cliente recebe, e a prova de que o provedor não foi chamado
 * vem do mock de `callAiWithTracking`. Reimplementar a regra aqui (em vez de importar
 * `./index.ts`) deixaria o teste verde com o defeito de volta.
 *
 * Roda pelo shim `tests/edge-functions/generate-ad-image.logo.test.ts`
 * (`supabase/functions/**` não está no include do vitest.config.ts).
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ callAiWithTracking: vi.fn() }));

// Deps de rede/banco do `_shared` não sobem no Node — mockadas. O resto do arquivo
// (schema zod, CORS e a guarda do logo) é o código REAL.
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

/** Mesmo teto do cartão: 10 MB decodificados. */
const MAX_BYTES = 10 * 1024 * 1024;
const PRODUCT_URL = "https://cdn.example.com/products/mug.png";
const GENERATED_URL = "https://cdn.example.com/out/ad.png";

type AdImageHandler = (req: Request) => Promise<Response>;
let handler: AdImageHandler;

beforeAll(async () => {
  // `index.ts` chama `Deno.serve` no top-level — o stub captura o handler real em vez de
  // subir servidor (não há Deno dentro do vitest).
  (globalThis as unknown as { Deno: { serve: (h: AdImageHandler) => void } }).Deno = {
    serve: (h: AdImageHandler) => {
      handler = h;
    },
  };
  await import("./index.ts");
});

beforeEach(() => {
  mocks.callAiWithTracking.mockReset();
  // Resposta do provedor: Response nova a cada chamada (corpo só pode ser lido uma vez).
  mocks.callAiWithTracking.mockImplementation(async () =>
    new Response(
      JSON.stringify({
        choices: [{ message: { images: [{ image_url: { url: GENERATED_URL } }], content: "ok" } }],
      }),
      { status: 200 },
    )
  );
});

function postAdImage(body: Record<string, unknown>): Promise<Response> {
  return handler(
    new Request("https://example.supabase.co/functions/v1/generate-ad-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function validBody(extra: Record<string, unknown> = {}) {
  return {
    productImageUrl: PRODUCT_URL,
    scenePrompt: "clean studio scene",
    logoBase64: "data:image/png;base64,iVBORw0KGgo=",
    ...extra,
  };
}

/** Tamanho decodificado de um payload base64 (aritmética, sem decodificar). */
function decodedBytes(payload: string): number {
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
}

/** Data URL cujo payload base64 decodifica para `bytes` bytes. */
function dataUrlOfDecodedBytes(mime: string, bytes: number): string {
  return `data:${mime};base64,${"A".repeat(Math.ceil((bytes * 4) / 3))}`;
}

describe("generate-ad-image — teto e formato do logo inline", () => {
  it("recusa logo acima de 10 MB com 413 logo_too_large ANTES de chamar o provedor", async () => {
    const logoBase64 = dataUrlOfDecodedBytes("image/png", MAX_BYTES + 1);
    // Sanidade da fixture: sem isto o teste passaria com um payload pequeno.
    expect(decodedBytes(logoBase64.slice(logoBase64.indexOf(",") + 1))).toBe(MAX_BYTES + 1);

    const res = await postAdImage(validBody({ logoBase64 }));
    const data = await res.json();

    expect(res.status).toBe(413);
    expect(data.error).toBe("logo_too_large");
    expect(mocks.callAiWithTracking).not.toHaveBeenCalled();
  });

  it("aceita o teto exato de 10 MB (limite inclusivo) e segue para o provedor", async () => {
    const logoBase64 = dataUrlOfDecodedBytes("image/webp", MAX_BYTES);
    expect(decodedBytes(logoBase64.slice(logoBase64.indexOf(",") + 1))).toBe(MAX_BYTES);

    const res = await postAdImage(validBody({ logoBase64 }));

    expect(res.status).toBe(200);
    expect(mocks.callAiWithTracking).toHaveBeenCalledTimes(1);
  });

  it("recusa formato fora de PNG/JPG/WebP com 415 logo_type_not_allowed", async () => {
    const rejected = [
      "data:image/svg+xml;base64,PHN2Zy8+",
      "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
      "data:image/avif;base64,AAAAHGZ0eXBhdmlm",
      "data:text/plain;base64,aGk=",
      "data:application/pdf;base64,JVBERi0=",
      // Sem prefixo `data:` (base64 cru) não há tipo declarado → recusa.
      "aGVsbG8gd29ybGQ=",
    ];

    for (const logoBase64 of rejected) {
      const res = await postAdImage(validBody({ logoBase64 }));
      const data = await res.json();

      expect(res.status, `esperava 415 para ${logoBase64.slice(0, 24)}`).toBe(415);
      expect(data.error).toBe("logo_type_not_allowed");
    }
    expect(mocks.callAiWithTracking).not.toHaveBeenCalled();
  });

  it("aceita PNG, JPG e WebP dentro do limite", async () => {
    const accepted = [
      "data:image/png;base64,iVBORw0KGgo=",
      "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
      "data:image/jpg;base64,/9j/4AAQSkZJRg==",
      "data:image/webp;base64,UklGRhIAAABXRUJQVlA4TAYAAAAv",
      // MIME em maiúsculas e com parâmetro extra continuam válidos.
      "data:image/PNG;charset=utf-8;base64,iVBORw0KGgo=",
    ];

    for (const logoBase64 of accepted) {
      const res = await postAdImage(validBody({ logoBase64 }));

      expect(res.status, `esperava 200 para ${logoBase64.slice(0, 24)}`).toBe(200);
    }
    expect(mocks.callAiWithTracking).toHaveBeenCalledTimes(accepted.length);
  });

  it("não interfere no caminho do logoUrl (sem logoBase64)", async () => {
    const res = await postAdImage({
      productImageUrl: PRODUCT_URL,
      scenePrompt: "clean studio scene",
      logoUrl: "https://cdn.example.com/logos/acme.png",
    });

    expect(res.status).toBe(200);
    expect(mocks.callAiWithTracking).toHaveBeenCalledTimes(1);
  });
});
