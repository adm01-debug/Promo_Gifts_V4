/**
 * Prova dos tetos de ENTRADA do generate-mockup — C-4 / plano etapa 36.
 *
 * O handler (index.ts) importa `npm:@supabase/supabase-js` e `Deno.env` (via
 * _shared/*), então não sobe no Vitest. Estes testes exercitam exatamente as funções
 * que ele chama (./limits.ts):
 *   1. corpo acima do teto recusado ANTES de processar (Content-Length declarado e,
 *      quando ele falta, a contagem de bytes lidos);
 *   2. lote declarado acima de 6 áreas recusado.
 *
 * O teto de TAMANHO DE IMAGEM não é provado aqui porque não vive aqui: ele está em
 * ./fetch-guard.ts (MAX_IMAGE_BYTES) e é coberto por index.test.ts (runner Deno).
 * Este arquivo só garante que o teto do corpo seja DERIVADO dele e nunca menor —
 * senão um logo inline que o handler aceita seria recusado antes com 413.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";
import {
  MAX_BATCH_AREAS,
  MAX_BODY_BYTES,
  PayloadTooLargeError,
  batchExceedsLimit,
  declaredExceedsLimit,
  readBodyTextCapped,
  readStreamCapped,
} from "./limits.ts";
import { MAX_IMAGE_BYTES } from "./fetch-guard.ts";

const MB = 1024 * 1024;
const ENDPOINT = "https://edge.local/functions/v1/generate-mockup";

const INDEX_SRC = readFileSync(
  resolve(process.cwd(), "supabase/functions/generate-mockup/index.ts"),
  "utf8",
);

/** `Request` de POST com corpo JSON e, opcionalmente, um Content-Length declarado. */
function postRequest(body: string, declaredContentLength?: number): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (declaredContentLength !== undefined) {
    headers["content-length"] = String(declaredContentLength);
  }
  return new Request(ENDPOINT, { method: "POST", headers, body });
}

/** Stream que produz `chunks` pedaços de `chunkBytes` e conta quantos produziu. */
function countingStream(
  chunks: number,
  chunkBytes: number,
): { stream: ReadableStream<Uint8Array>; produced: () => number } {
  let produced = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (produced >= chunks) {
        controller.close();
        return;
      }
      produced += 1;
      controller.enqueue(new Uint8Array(chunkBytes));
    },
  });
  return { stream, produced: () => produced };
}

describe("teto do corpo JSON — MAX_BODY_BYTES", () => {
  it("recusa pelo Content-Length declarado, sem esperar o corpo", async () => {
    // Corpo real minúsculo: quem barra é o header declarado, antes de qualquer leitura.
    const err = await readBodyTextCapped(postRequest("{}", MAX_BODY_BYTES + 1)).catch((e) => e);
    expect(err).toBeInstanceOf(PayloadTooLargeError);
    expect((err as PayloadTooLargeError).limitBytes).toBe(MAX_BODY_BYTES);
  });

  it("recusa pela contagem de bytes lidos quando o Content-Length não barra", async () => {
    const oversized = "x".repeat(MAX_BODY_BYTES + 1);
    const err = await readBodyTextCapped(postRequest(oversized)).catch((e) => e);
    expect(err).toBeInstanceOf(PayloadTooLargeError);
    expect((err as PayloadTooLargeError).limitBytes).toBe(MAX_BODY_BYTES);
  });

  it("corta no meio do stream em vez de bufferizar tudo", async () => {
    // 40 MB disponíveis, teto de MAX_BODY_BYTES: com `arrayBuffer()` `produced`
    // chegaria a 40. `readStreamCapped` é exatamente o que readBodyTextCapped
    // delega para ler o corpo.
    const { stream, produced } = countingStream(40, MB);

    await expect(readStreamCapped(stream, MAX_BODY_BYTES)).rejects.toBeInstanceOf(
      PayloadTooLargeError,
    );

    // Nem 0 (não leu nada) nem 40 (bufferizou tudo): parou no pedaço que estourou.
    const noTeto = Math.ceil(MAX_BODY_BYTES / MB);
    expect(produced()).toBeGreaterThan(1);
    expect(produced()).toBeLessThanOrEqual(noTeto + 1);
    expect(noTeto + 1).toBeLessThan(40);
  });

  it("aceita e devolve o texto de um corpo dentro do teto", async () => {
    const body = '{"productImageUrl":"https://cdn.example.com/mug.png"}';
    await expect(readBodyTextCapped(postRequest(body))).resolves.toBe(body);
  });

  it("respeita o limite exato (<= passa, > recusa)", async () => {
    await expect(readBodyTextCapped(postRequest("abcde"), 5)).resolves.toBe("abcde");
    await expect(readBodyTextCapped(postRequest("abcdef"), 5)).rejects.toBeInstanceOf(
      PayloadTooLargeError,
    );
  });

  it("Content-Length ausente ou não numérico não conta como estouro", () => {
    expect(declaredExceedsLimit(String(MAX_BODY_BYTES + 1), MAX_BODY_BYTES)).toBe(true);
    expect(declaredExceedsLimit(String(MAX_BODY_BYTES), MAX_BODY_BYTES)).toBe(false);
    expect(declaredExceedsLimit(null, MAX_BODY_BYTES)).toBe(false);
    expect(declaredExceedsLimit("", MAX_BODY_BYTES)).toBe(false);
    expect(declaredExceedsLimit("not-a-number", MAX_BODY_BYTES)).toBe(false);
  });
});

describe("teto do lote de áreas — MAX_BATCH_AREAS", () => {
  it("recusa lote declarado acima de 6 áreas", () => {
    expect(MAX_BATCH_AREAS).toBe(6);
    expect(batchExceedsLimit(Array.from({ length: MAX_BATCH_AREAS + 1 }, () => ({})))).toBe(true);
  });

  it("aceita lote no teto e ausência de lote declarado", () => {
    expect(batchExceedsLimit(Array.from({ length: MAX_BATCH_AREAS }, () => ({})))).toBe(false);
    expect(batchExceedsLimit([])).toBe(false);
    expect(batchExceedsLimit(undefined)).toBe(false);
    expect(batchExceedsLimit({ length: 99 })).toBe(false);
  });
});

describe("invariante entre o teto do corpo e o teto de imagem do fetch-guard", () => {
  it("o corpo comporta o maior logo inline que o handler aceita", () => {
    // index.ts recusa logoBase64 acima de ceil(MAX_IMAGE_BYTES*4/3)+64 caracteres.
    // Se MAX_BODY_BYTES fosse menor que isso, o 413 chegaria antes e um logo VÁLIDO
    // seria recusado — era o conflito entre o teto de 15 MB do corpo (lote original
    // dos tetos, imagem de 10 MB) e o MAX_IMAGE_BYTES de 15 MB que o main já tem.
    const maiorLogoInline = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 64;
    expect(MAX_BODY_BYTES).toBeGreaterThan(maiorLogoInline);
    expect(INDEX_SRC).toContain("Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 64");
  });

  it("o teto de imagem NÃO é duplicado em limits.ts (dono é o fetch-guard)", async () => {
    const limits = await import("./limits.ts");
    expect(Object.keys(limits)).not.toContain("MAX_IMAGE_BYTES");
    expect(MAX_IMAGE_BYTES).toBe(15 * MB);
  });
});

describe("index.ts está ligado aos tetos de entrada", () => {
  it("usa o teto do corpo (413) e o do lote (400) antes de qualquer fetch", () => {
    expect(INDEX_SRC).toContain('from "./limits.ts"');
    expect(INDEX_SRC).toContain("readBodyTextCapped(req, MAX_BODY_BYTES)");
    expect(INDEX_SRC).toContain("batchExceedsLimit(body.areas)");
    expect(INDEX_SRC).toContain("BODY_TOO_LARGE");
    expect(INDEX_SRC).toContain("BATCH_TOO_LARGE");
    // O 413 do corpo tem resposta própria, não cai no validationError (400).
    expect(INDEX_SRC).toContain("status: 413");
  });
});
