/**
 * Prova dos tetos de ENTRADA do generate-mockup — C-4 / plano etapa 36.
 *
 * O handler (index.ts) importa `npm:@supabase/supabase-js` e `Deno.env` (via
 * _shared/*), então não sobe no Vitest. Estes testes exercitam exatamente as funções
 * que ele chama (./limits.ts):
 *   1. corpo acima do teto recusado ANTES de processar (Content-Length declarado e,
 *      quando ele falta, a contagem de bytes lidos);
 *   2. imagem remota acima de 10 MB cortada pelo Content-Length declarado (sem
 *      baixar) E pela contagem de bytes lidos — corta no meio do stream em vez de
 *      bufferizar tudo para comparar depois (era o defeito do arrayBuffer());
 *   3. lote declarado acima de 6 áreas recusado.
 */
import { describe, expect, it } from "vitest";
import {
  MAX_BATCH_AREAS,
  MAX_BODY_BYTES,
  MAX_IMAGE_BYTES,
  PayloadTooLargeError,
  batchExceedsLimit,
  declaredExceedsLimit,
  readBodyTextCapped,
  readImageResponseCapped,
} from "./limits.ts";

const MB = 1024 * 1024;
const ENDPOINT = "https://edge.local/functions/v1/generate-mockup";

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
    expect((err as PayloadTooLargeError).source).toBe("body");
    expect((err as PayloadTooLargeError).limitBytes).toBe(MAX_BODY_BYTES);
  });

  it("recusa pela contagem de bytes lidos quando o Content-Length falta", async () => {
    const oversized = "x".repeat(MAX_BODY_BYTES + 1);
    const err = await readBodyTextCapped(postRequest(oversized)).catch((e) => e);
    expect(err).toBeInstanceOf(PayloadTooLargeError);
    expect((err as PayloadTooLargeError).source).toBe("body");
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
});

describe("teto da imagem remota — MAX_IMAGE_BYTES (10 MB)", () => {
  it("corta pelo Content-Length declarado sem baixar o corpo", async () => {
    const { stream, produced } = countingStream(100, 64 * 1024);
    const res = new Response(stream, {
      headers: { "content-length": String(MAX_IMAGE_BYTES + 1) },
    });

    const err = await readImageResponseCapped(res).catch((e) => e);

    expect(err).toBeInstanceOf(PayloadTooLargeError);
    expect((err as PayloadTooLargeError).source).toBe("image");
    expect((err as PayloadTooLargeError).limitBytes).toBe(MAX_IMAGE_BYTES);
    expect(produced()).toBe(0); // nenhum pedaço lido: o Content-Length já decidiu
  });

  it("corta pela contagem de bytes lidos (sem Content-Length) sem bufferizar tudo", async () => {
    // 100 MB disponíveis, teto de 10 MB: com arrayBuffer() `produced` chegava a 100.
    const { stream, produced } = countingStream(100, MB);
    const err = await readImageResponseCapped(new Response(stream)).catch((e) => e);

    expect(err).toBeInstanceOf(PayloadTooLargeError);
    expect(produced()).toBeLessThan(100); // cortou no meio
    expect(produced()).toBeLessThanOrEqual(12); // o 11º MB estoura o teto de 10 MB
  });

  it("aceita imagem dentro do teto e devolve os bytes exatos", async () => {
    const { stream } = countingStream(2, 1024);
    const bytes = await readImageResponseCapped(new Response(stream));
    expect(bytes.byteLength).toBe(2048);
  });

  it("respeita o limite exato (<= passa, > recusa)", async () => {
    const { stream } = countingStream(1, 4);
    await expect(readImageResponseCapped(new Response(stream), 4)).resolves.toHaveLength(4);
    const { stream: over } = countingStream(1, 5);
    await expect(readImageResponseCapped(new Response(over), 4)).rejects.toBeInstanceOf(
      PayloadTooLargeError,
    );
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

describe("invariantes dos tetos", () => {
  it("corpo e imagem respeitam os números do cartão (10 MB / folga p/ logo base64)", () => {
    expect(MAX_IMAGE_BYTES).toBe(10 * MB);
    expect(MAX_BODY_BYTES).toBeGreaterThan(Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 64);
  });

  it("Content-Length ausente ou não numérico não conta como estouro", () => {
    expect(declaredExceedsLimit(String(MAX_BODY_BYTES + 1), MAX_BODY_BYTES)).toBe(true);
    expect(declaredExceedsLimit(String(MAX_BODY_BYTES), MAX_BODY_BYTES)).toBe(false);
    expect(declaredExceedsLimit(null, MAX_BODY_BYTES)).toBe(false);
    expect(declaredExceedsLimit("", MAX_BODY_BYTES)).toBe(false);
    expect(declaredExceedsLimit("not-a-number", MAX_BODY_BYTES)).toBe(false);
  });
});
