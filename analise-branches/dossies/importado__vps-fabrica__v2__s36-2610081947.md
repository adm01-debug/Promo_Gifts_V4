# origin/importado/vps-fabrica/v2/s36-2610081947

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** impede que alguem derrube o gerador de mockup mandando um arquivo ou um pedido gigante; a parte do "pedido" ja esta em producao, a parte do "arquivo baixado" nao.
- **Tip / merge-base / main:** tip `e86bcbc6fa8aae823356cc37eb684b71da94ccd3` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`e86bcbc6fa`, "fix(edge/generate-mockup): teto de corpo, lote e imagem antes de
processar", cartao C-4). A edge function que gera o mockup aceitava, sem nenhum teto:

1. um corpo JSON de tamanho livre, que era lido inteiro na memoria antes de qualquer checagem;
2. uma imagem remota baixada com `arrayBuffer()` completo e so **depois** comparada com o limite — ou
   seja, um servidor que nao declara (ou mente no) `Content-Length` conseguia fazer a edge carregar o
   arquivo inteiro na memoria antes de ser recusado;
3. um lote de areas de personalizacao sem limite, multiplicando memoria e CPU por N invocacoes paralelas.

A solucao da branch: mover os tres tetos para um modulo proprio (`limits.ts`), testavel no Vitest porque
o `index.ts` importa `npm:`/`Deno.env` e nao sobe no runner de Node; recusar o corpo com **413
BODY_TOO_LARGE** antes do `JSON.parse`; recusar lote acima de 6 areas com **400 BATCH_TOO_LARGE** antes de
qualquer download; e, para a imagem, **cortar o download no teto** (leitura por pedacos com contagem de
bytes) em vez de bufferizar tudo. Mais 12 testes em `index.size.test.ts`.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Modulo `limits.ts` com os tetos testaveis | **esta** (reconciliado em 2026-11-15) | `origin/main:supabase/functions/generate-mockup/limits.ts` existe; `git ls-tree -r --name-only origin/main -- supabase/functions/generate-mockup` lista `limits.ts` |
| `MAX_BODY_BYTES` (teto do corpo) | **esta**, agora derivado do teto de imagem | `limits.ts:30` `export const MAX_BODY_BYTES = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + BODY_OVERHEAD_BYTES;` |
| Corpo lido com teto antes do parse | **esta** | `index.ts:354` `const raw = req.body ? await readBodyTextCapped(req, MAX_BODY_BYTES) : await req.text();` |
| Resposta `413 payload_too_large / BODY_TOO_LARGE` com `limit_bytes` | **esta** | `index.ts:105` `errorCode: "BODY_TOO_LARGE"`, `index.ts:109` `{ status: 413, ... }` |
| `MAX_BATCH_AREAS = 6` e recusa do lote NO SERVIDOR antes de qualquer fetch | **esta** | `limits.ts:33`; `index.ts:371` `if (batchExceedsLimit(body.areas))`, `index.ts:375` `"BATCH_TOO_LARGE"` |
| `PayloadTooLargeError`, `declaredExceedsLimit`, `readStreamCapped`, `readBodyTextCapped`, `batchExceedsLimit` | **esta** (sem o campo `source`, que a main removeu por so sobrar um caso) | `limits.ts:35`, `:46`, `:59`, `:99`, `:112` |
| `index.size.test.ts` (prova dos tetos no Vitest) | **esta**, adaptado | `git ls-tree -r --name-only origin/main -- supabase/functions/generate-mockup` lista `index.size.test.ts` |
| **Corte do download da imagem no teto** (`readImageResponseCapped` / leitura por pedacos) | **NAO ESTA** | `git grep -n "readImageResponseCapped" origin/main` → so uma mencao em documento (`analise-branches/auditoria-261115/veredito_lote02.md:371`), nenhum codigo. A main continua bufferizando tudo: `fetch-guard.ts:84` `const bytes = new Uint8Array(await res.arrayBuffer());` e so em `:85` compara `bytes.byteLength > MAX_IMAGE_BYTES` |
| **Qualquer teste do teto de imagem** | **NAO ESTA** | `index.size.test.ts` da main afirma que o teto de imagem "e coberto por index.test.ts (runner Deno)", mas `index.test.ts` tem 5 testes e todos sao de allowlist/redirect/SSRF (`Deno.test(...)` nas linhas 38, 46, 53, 63, 71) — nenhum de tamanho |
| Teto de imagem em **10 MB** (alinhado ao bucket) | **main usa 15 MB** | `fetch-guard.ts:18` `export const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB` vs. `limits.ts` da branch: `10 * 1024 * 1024` |

Contexto: a propria main registra que essa reconciliacao foi deliberada —
`origin/main:supabase/functions/generate-mockup/limits.ts:7-13` ("RECONCILIACAO (2026-11-15): o teto de
TAMANHO DE IMAGEM nao vive aqui. Ele ja esta resolvido em ./fetch-guard.ts ... com Content-Length
declarado e **recontagem pos-download**"). A escolha de nao duplicar o numero esta certa; o que passou
batido e que "recontagem pos-download" **e exatamente o defeito que esta branch veio corrigir**.

## A resgatar

1. **`supabase/functions/generate-mockup/fetch-guard.ts` (linha 84) — cortar o download no teto.**
   Trocar `await res.arrayBuffer()` por uma leitura por pedacos com contagem de bytes (a funcao
   `readStreamCapped` ja existe na main, em `limits.ts:59`, e ja foi escrita para isso). Hoje, se o
   servidor da imagem nao declara `Content-Length` ou declara um valor menor que o real, a edge carrega o
   arquivo inteiro na memoria e so entao recusa — o teto de 15 MB nao protege contra o caso que importa.
   Cuidado tecnico para quem executar: `limits.ts` ja importa `MAX_IMAGE_BYTES` de `fetch-guard.ts`, logo
   importar `readStreamCapped` na direcao oposta cria import circular; o correto e mover a funcao para um
   terceiro modulo (ou duplicar a leitura dentro do `fetch-guard.ts`), nao cruzar os imports.

2. **`supabase/functions/generate-mockup/index.test.ts` (ou `index.size.test.ts`) — provar o teto de imagem.**
   Nenhum teste da main exercita o teto de imagem, e um comentario da main afirma, errado, que ele esta
   coberto. A branch tinha 4 testes exatamente disso, inclusive contando quantos pedacos foram lidos para
   provar que o download para no meio (`index.size.test.ts` da branch, bloco "teto da imagem remota").
   Sem isso, o item 1 pode ser desfeito no proximo refactor sem ninguem perceber.

## Risco de fechar esta branch

Se a branch for apagada agora, o unico prejuizo e o do item 1: **o gerador de mockup continua vulneravel
a ser derrubado por um arquivo de imagem grande hospedado em host permitido** que nao declare o proprio
tamanho. O efeito pratico para o negocio e a funcao de gerar mockup ficar fora do ar por consumo de
memoria, com o vendedor vendo erro na hora de montar a arte do cliente. Nao e perda de dado e nao afeta
preco, pedido ou permissao. Todo o resto do trabalho (corpo e lote) ja esta em producao e nao se perde.

Risco adicional, menor: perde-se a unica prova automatizada do teto de imagem que alguem escreveu neste
repositorio.

## Nao verificado

- **Nao executei nenhum teste** (`index.size.test.ts`, `index.test.ts` ou a suite Deno). A afirmacao do
  commit ("12/12 PASS; 8/12 falham contra a variante pre-fix") e do autor da branch, nao minha.
- **O numero certo do teto de imagem (10 MB x 15 MB) e decisao de negocio e nao foi verificado.** A branch
  diz que 10 MB alinha com o limite do bucket do Supabase; nao consultei o limite real do bucket. Nao
  tratei isso como item a resgatar: mexer nesse numero muda o tamanho de arte que o vendedor consegue
  enviar, e isso o dono decide, nao o agente.
- **Nao verifiquei se a edge em producao corresponde a este codigo da main.** Existe pendencia conhecida
  de 19 edge functions divergentes do repositorio; se `generate-mockup` for uma delas, o comportamento em
  producao pode ser outro.
