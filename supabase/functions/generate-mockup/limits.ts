/**
 * Tetos de ENTRADA do generate-mockup (C-4 / plano etapa 36).
 *
 * Módulo próprio para os tetos serem provados no Vitest: o handler (index.ts)
 * importa `npm:` e `Deno.env` (via _shared/*) e não sobe no Node. O handler usa
 * exatamente estas funções — não reimplementa nada aqui.
 *
 * RECONCILIAÇÃO (2026-11-15): o teto de TAMANHO DE IMAGEM não vive aqui. Ele já
 * está resolvido em ./fetch-guard.ts (`MAX_IMAGE_BYTES`, com Content-Length
 * declarado e recontagem pós-download, em cada hop do redirect validado), então
 * duplicá-lo criaria dois números conflitantes para a mesma regra. Aqui ficam só
 * os dois tetos que o main NÃO tem: corpo da requisição e lote de áreas.
 */

import { MAX_IMAGE_BYTES } from "./fetch-guard.ts";

/**
 * Folga do corpo além do logo inline: as demais strings do contrato
 * (productImageUrl/logoUrl 4 KiB cada, techniquePrompt 8 KiB, nomes) mais a
 * sintaxe do JSON.
 */
const BODY_OVERHEAD_BYTES = 128 * 1024;

/**
 * Teto do corpo JSON. DERIVADO do teto de imagem para não recusar um corpo que o
 * próprio handler aceita: um logo inline no limite ocupa `MAX_IMAGE_BYTES * 4/3`
 * caracteres em base64 (é esse o teto que o index.ts aplica em `logoBase64`), e o
 * corpo precisa comportar isso mais os outros campos.
 */
export const MAX_BODY_BYTES = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + BODY_OVERHEAD_BYTES;

/** Teto de áreas de personalização declaradas em um lote (`areas` no corpo). */
export const MAX_BATCH_AREAS = 6;

export class PayloadTooLargeError extends Error {
  readonly limitBytes: number;

  constructor(limitBytes: number) {
    super(`Request body too large (> ${limitBytes} bytes)`);
    this.name = "PayloadTooLargeError";
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
      if (total > limitBytes) throw new PayloadTooLargeError(limitBytes);
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
    throw new PayloadTooLargeError(limitBytes);
  }
  const bytes = await readStreamCapped(req.body, limitBytes);
  return new TextDecoder().decode(bytes);
}

/** Lote declarado no corpo acima do teto de áreas? */
export function batchExceedsLimit(
  areas: unknown,
  maxAreas: number = MAX_BATCH_AREAS,
): boolean {
  return Array.isArray(areas) && areas.length > maxAreas;
}
