/**
 * Teto de download de imagem do generate-mockup — guarda de memória da edge.
 *
 * Por que existe: `fetchBytes` buscava a imagem com `await res.arrayBuffer()` e só
 * então comparava o tamanho com `MAX_IMAGE_BYTES`. Um servidor de imagem que OMITE
 * ou MENTE no `Content-Length` fazia a edge pública baixar o arquivo inteiro para a
 * memória antes de recusar; com várias invocações em paralelo, isso derruba o
 * gerador de mockup e o vendedor fica sem conseguir gerar nada.
 *
 * Estes casos provam o corte por pedaços: o stream é cancelado assim que passa do
 * teto, sem acumular o resto. Resgatado de importado/vps-fabrica/v2/s36-2610081947.
 *
 * Roda sob Node (vitest) porque `fetch-guard.ts` não usa nada de Deno além do
 * `Deno.env` em outra função, que estes casos não tocam. A entrada precisa estar em
 * `vitest.config.ts` → `include` para ser coletada.
 */
import { describe, expect, it } from 'vitest';

import { fetchBytes, GENERIC_FETCH_ERROR_MESSAGE, MAX_IMAGE_BYTES } from './fetch-guard.ts';

const ALLOW_ALL = () => true;
const CHUNK = 64 * 1024;

/**
 * Responde um corpo em pedaços de 64 KB, contando quantos foram realmente pedidos.
 * `declaredLength` controla o header: `null` = omitido, número = declarado (pode mentir).
 */
function streamingFetch(totalBytes: number, declaredLength: number | null) {
  const state = { chunksServed: 0 };
  const impl = (): Promise<Response> => {
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= totalBytes) {
          controller.close();
          return;
        }
        const size = Math.min(CHUNK, totalBytes - sent);
        sent += size;
        state.chunksServed += 1;
        controller.enqueue(new Uint8Array(size));
      },
    });
    const headers: Record<string, string> = {};
    if (declaredLength !== null) headers['content-length'] = String(declaredLength);
    return Promise.resolve(new Response(body, { status: 200, headers }));
  };
  return { impl, state };
}

/**
 * `ImageFetchError` mostra mensagem genérica ao cliente de propósito e guarda o motivo
 * em `.detail`. Conferir os dois prova que a guarda disparou pelo motivo certo E que o
 * detalhe interno não vaza para a tela.
 */
async function recusaPorTeto(promise: Promise<unknown>) {
  const erro = await promise.then(
    () => null,
    (e: unknown) => e as { name?: string; message?: string; detail?: string },
  );
  expect(erro, 'deveria ter recusado').not.toBeNull();
  expect(erro?.name).toBe('ImageFetchError');
  expect(erro?.message).toBe(GENERIC_FETCH_ERROR_MESSAGE);
  expect(erro?.detail).toMatch(/image too large/i);
}

describe('fetchBytes — teto de imagem', () => {
  it('recusa sem abrir o corpo quando o Content-Length declarado passa do teto', async () => {
    const { impl, state } = streamingFetch(MAX_IMAGE_BYTES + CHUNK, MAX_IMAGE_BYTES + CHUNK);

    await recusaPorTeto(
      fetchBytes('https://cdn.example.com/grande.png', 5000, ALLOW_ALL, impl),
    );

    // A recusa vem do header, antes de ler o corpo. O `<= 1` é por conta do runtime:
    // o undici (Node) pode puxar um pedaço ao montar a Response, antes de qualquer
    // leitura nossa. O que importa é que o arquivo não foi baixado: 1 pedaço de 64 KB
    // contra os 15 MB declarados.
    expect(state.chunksServed).toBeLessThanOrEqual(1);
  });

  it('corta no teto quando o servidor OMITE o Content-Length', async () => {
    const total = MAX_IMAGE_BYTES * 3;
    const { impl, state } = streamingFetch(total, null);

    await recusaPorTeto(
      fetchBytes('https://cdn.example.com/sem-header.png', 5000, ALLOW_ALL, impl),
    );

    // O ponto da guarda: parou perto do teto em vez de baixar os 45 MB.
    // +2: o pedaço que estoura o teto, mais um que o runtime já tinha puxado antes de
    // o cancel ser processado. Sem a guarda seriam os 45 MB inteiros (720 pedaços).
    const maxChunksAteOTeto = Math.ceil(MAX_IMAGE_BYTES / CHUNK) + 2;
    expect(state.chunksServed).toBeLessThanOrEqual(maxChunksAteOTeto);
    expect(state.chunksServed * CHUNK).toBeLessThan(total);
  });

  it('corta no teto quando o servidor MENTE no Content-Length', async () => {
    const total = MAX_IMAGE_BYTES * 2;
    const { impl, state } = streamingFetch(total, 1024); // diz 1 KB, manda 30 MB

    await recusaPorTeto(
      fetchBytes('https://cdn.example.com/mentiroso.png', 5000, ALLOW_ALL, impl),
    );

    const maxChunksAteOTeto = Math.ceil(MAX_IMAGE_BYTES / CHUNK) + 2;
    expect(state.chunksServed).toBeLessThanOrEqual(maxChunksAteOTeto);
    expect(state.chunksServed * CHUNK).toBeLessThan(total);
  });

  it('imagem dentro do teto passa e volta com os bytes completos', async () => {
    const total = CHUNK * 3;
    const { impl } = streamingFetch(total, total);

    const bytes = await fetchBytes('https://cdn.example.com/ok.png', 5000, ALLOW_ALL, impl);

    expect(bytes.byteLength).toBe(total);
  });

  it('imagem exatamente no teto passa (o corte é > teto, não >=)', async () => {
    const { impl } = streamingFetch(MAX_IMAGE_BYTES, null);

    const bytes = await fetchBytes('https://cdn.example.com/limite.png', 20000, ALLOW_ALL, impl);

    expect(bytes.byteLength).toBe(MAX_IMAGE_BYTES);
  });
});
