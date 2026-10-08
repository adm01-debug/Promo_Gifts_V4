/**
 * Tetos de ENTRADA do generate-mockup (C-4 / plano etapa 36).
 *
 * Módulo próprio para os tetos serem provados no Vitest: o handler (index.ts)
 * importa `npm:` e `Deno.env` (via _shared/*) e não sobe no Node. O handler usa
 * exatamente estas funções — não reimplementa nada aqui.
 */

/** Teto do corpo JSON. Comporta o maior logo inline: 10 MB crus em base64 ≈ 13,3 MB. */
export const MAX_BODY_BYTES = 15 * 1024 * 1024; // 15 MB

/** Teto de QUALQUER imagem (remota ou inline) — cobre o limite de 10 MB do bucket. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

/** Teto de áreas de personalização declaradas em um lote (`areas` no corpo). */
export const MAX_BATCH_AREAS = 6;

export type LimitSource = "body" | "image";

export class PayloadTooLargeError extends Error {
  readonly source: LimitSource;
  readonly limitBytes: number;

  constructor(source: LimitSource, limitBytes: number) {
    super(
      source === "body"
        ? `Request body too large (> ${limitBytes} bytes)`
        : `Image too large (> ${limitBytes} bytes)`,
    );
    this.name = "PayloadTooLargeError";
    this.source = source;
    this.limitBytes = limitBytes;
  }
}

/** O `Content-Length` declarado (quando presente e numérico) já estoura o teto? */
export function declaredExceedsLimit(
  contentLength: string | null,
  limitBytes: number,
): boolean {
  const declared = Number(contentLength ?? "");
  return Number.isFinite(declared) && declared > limitBytes;
}

/**
 * Lê um stream CONTANDO os bytes e aborta (cancela o stream) assim que o total passa
 * do teto — em vez de bufferizar tudo para só então comparar o tamanho, que era o
 * defeito do `arrayBuffer()` completo.
 */
export async function readStreamCapped(
  stream: ReadableStream<Uint8Array> | null,
  limitBytes: number,
  source: LimitSource,
): Promise<Uint8Array> {
  if (!stream) return new Uint8Array(0);

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      total += value.byteLength;
      if (total > limitBytes) throw new PayloadTooLargeError(source, limitBytes);
      chunks.push(value);
    }
  } catch (err) {
    // Cortou no teto (ou o produtor falhou): descarta o resto em vez de drenar.
    try { await reader.cancel(err); } catch { /* stream já encerrado */ }
    throw err;
  } finally {
    try { reader.releaseLock(); } catch { /* lock já liberado pelo cancel */ }
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/**
 * Corpo da requisição → texto, recusado acima de `limitBytes` ANTES de parsear:
 * Content-Length declarado primeiro (sem ler), contagem real de bytes depois
 * (servidor/proxy pode omitir ou mentir o header).
 */
export async function readBodyTextCapped(
  req: Request,
  limitBytes: number = MAX_BODY_BYTES,
): Promise<string> {
  if (declaredExceedsLimit(req.headers.get("content-length"), limitBytes)) {
    try { await req.body?.cancel(); } catch { /* corpo indisponível */ }
    throw new PayloadTooLargeError("body", limitBytes);
  }
  const bytes = await readStreamCapped(req.body, limitBytes, "body");
  return new TextDecoder().decode(bytes);
}

/**
 * Resposta de imagem → bytes, recusada acima de `limitBytes`: pelo Content-Length
 * declarado (sem baixar o corpo) e, quando ele falta/mente, pela contagem de bytes
 * realmente lidos.
 */
export async function readImageResponseCapped(
  res: Response,
  limitBytes: number = MAX_IMAGE_BYTES,
): Promise<Uint8Array> {
  if (declaredExceedsLimit(res.headers.get("content-length"), limitBytes)) {
    try { await res.body?.cancel(); } catch { /* corpo indisponível */ }
    throw new PayloadTooLargeError("image", limitBytes);
  }
  return await readStreamCapped(res.body, limitBytes, "image");
}

/** Lote declarado no corpo acima do teto de áreas? */
export function batchExceedsLimit(
  areas: unknown,
  maxAreas: number = MAX_BATCH_AREAS,
): boolean {
  return Array.isArray(areas) && areas.length > maxAreas;
}
