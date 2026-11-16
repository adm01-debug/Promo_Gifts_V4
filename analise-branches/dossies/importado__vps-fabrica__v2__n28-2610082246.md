# origin/importado/vps-fabrica/v2/n28-2610082246

- **Veredito:** RESGATAR_PARCIAL  ·  **Confiança:** alta
- **O que isso faz pelo negócio:** faz o teste automático do gerador de mockup rodar o código que está em produção de verdade, em vez de conferir uma resposta de mentira — é o que avisa que a geração de mockup quebrou antes do cliente descobrir.
- **Tip / merge-base / main:** tip `66e707f1bf951223492c153c526640e8d0ec81c1` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um único commit: `66e707f1bf test(edge-functions): contrato do handler real do generate-mockup (B F-29)`.

A branch reescreveu `tests/edge-functions/integration/generate-mockup.test.ts` para **executar o handler real**
da edge function. O arquivo passa a: empacotar `supabase/functions/generate-mockup/index.ts` em memória com
esbuild (stubando só `npm:@supabase/supabase-js`), capturar o handler registrado por `Deno.serve`, substituir
`OffscreenCanvas` / `createImageBitmap` / `Deno.env` por dublês, e chamar o handler com objetos `Request`
reais — asserindo o status e o corpo que o código de produção realmente devolve.

O motivo técnico está no cabeçalho que a branch apagou: a versão anterior (que é a que a main tem hoje)
declara que "o edge function não roda em processo no vitest" e por isso **mocka a camada HTTP**. O efeito
disso é que o teste da main fabrica a resposta e depois confere a própria fabricação. Exemplo literal, na
versão da main, linhas 116–124:

```
it(`returns 400 validation_failed for: ${label}`, async () => {
  mockEdgeFunctionFetch({ "/generate-mockup": { status: 400, body: { error: "validation_failed" } } });
  ...
  expect(res.status).toBe(400);
  expect(data.error).toBe("validation_failed");
```

Ou seja: o teste da main continua verde mesmo que o `index.ts` de produção pare de validar entrada. Era
exatamente isso que a branch queria eliminar.

## Item por item: está na main?

| item | onde está na main (ou NÃO ESTÁ) | evidência |
|---|---|---|
| Harness que empacota o `index.ts` real com esbuild e executa o handler | **NÃO ESTÁ.** A main mantém a versão com mock de HTTP | `git grep -ln "esbuild" origin/main -- tests` retorna só `tests/config/vite8-toolchain-contract.test.ts` e `tests/scripts/verify-build-integrity.test.mjs`; `git log -S"esbuild" origin/main -- tests/edge-functions/integration/generate-mockup.test.ts` é **vazio** (nunca entrou e foi revertido) |
| Dublê do `createClient` via `globalThis.__generateMockupCreateClient` | **NÃO ESTÁ** | `git grep -ln "__generateMockupCreateClient" origin/main` não retorna nada |
| Captura do handler por `Deno.serve` em teste | **NÃO ESTÁ** em nenhum teste do repo | `git grep -rn "não registrou o handler" origin/main` vazio; os hits de `Deno.serve` em `tests/` da main são apenas comentários/strings |
| Versão da main do mesmo arquivo | existe, mas é a antiga baseada em mock | `git show origin/main:tests/edge-functions/integration/generate-mockup.test.ts` linhas 1–17 (cabeçalho "these tests mock the HTTP layer") — 259 linhas contra 204 da branch |
| Cobertura de `url_resolution_failed` | **NÃO ESTÁ.** O caminho existe em produção e nenhum teste o cobre | `supabase/functions/generate-mockup/index.ts:529` (`JSON.stringify({ error: "url_resolution_failed" })`) na main; `git grep -n "url_resolution_failed" origin/main -- tests` vazio |
| `GET` → `405 method_not_allowed` no generate-mockup | **NÃO ESTÁ** para esta função | `git grep -n "method_not_allowed" origin/main -- tests` lista 6 arquivos (ai-recommendations, categories-api, decommissioned-and-cron, receive-crm-callback ×2, secure-upload) e nenhum é o generate-mockup |
| Códigos de erro `PRODUCT_URL_UNFETCHABLE` / `SVG_NOT_SUPPORTED` verificados contra o handler real | parcialmente: a main **cita** os códigos, mas só contra resposta mockada | main `tests/.../generate-mockup.test.ts:127` e `:145` definem o corpo no mock e depois o asserem; o handler real tem os códigos em `index.ts:204` e `:383` |
| URL do projeto Supabase correta (`doufsxqlfjyuvxuezpln`) | **ESTÁ** na main | `git show origin/main:tests/edge-functions/integration/generate-mockup.test.ts` linha 19: `const BASE = "https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1";` — este ponto da branch foi resolvido por outro caminho |
| Pré-requisito do resgate: esbuild já é dependência | **ESTÁ** — resgatar não adiciona dependência nova | `git show origin/main:package.json` linha 449: `"esbuild": "^0.28.1"` |
| Compatibilidade do harness com o handler de hoje | **COMPATÍVEL** | `index.ts` da main: linha 3 `import { createClient } from "npm:@supabase/supabase-js@2.49.4"` (casa com o filtro do plugin), linha 330 `Deno.serve(async (req) => {`, demais imports são relativos (`../_shared/cors.ts`, `auth.ts`, `zod-validate.ts`, `kill_switch.ts`, `./fetch-guard.ts`…) e o esbuild os empacota |

## A resgatar

1. **`tests/edge-functions/integration/generate-mockup.test.ts` (versão da branch) — o harness do handler real.**
   É o item principal. Hoje a suíte de integração do gerador de mockup não toca o código de produção; ela
   confere mocks. Enquanto isso continuar, o CI verde não é prova de que gerar mockup funciona.
   **Como resgatar (importante):** adicionar a suíte da branch **como arquivo novo** (ex.
   `generate-mockup.handler.test.ts`), **sem apagar** o arquivo da main. A versão da branch tem 204 linhas
   contra 259 da main e deixou de fora casos que a main cobre: `504 composition_timeout`,
   `productImageUrl` com protocolo `javascript:`, URL relativa `/placeholder.svg`, "mockupUrl aponta para
   CDN https seguro" e "nunca vaza stack trace no corpo do erro". Substituir um pelo outro perderia esses
   cinco casos.
2. **Teste do caminho `url_resolution_failed`.** Está em produção (`supabase/functions/generate-mockup/index.ts:529`)
   e sem nenhum teste. É o caso em que o mockup é gerado e enviado, mas o endereço público da imagem não é
   resolvido — o cliente recebe erro depois de a imagem já ter sido criada.
3. **Teste de `GET` → `405 method_not_allowed` no generate-mockup.** Outras seis funções têm esse teste; esta não.

## Risco de fechar esta branch

Fechar sem resgatar não quebra nada hoje, mas congela um ponto cego: a suíte automática do gerador de
mockup continua passando mesmo se a função de produção parar de validar entrada, parar de recusar logo em
SVG ou parar de barrar endereço interno (SSRF). O time perde o aviso automático e descobre pelo cliente.
Além disso, dois caminhos de erro reais seguem sem teste nenhum (`url_resolution_failed` e método não
permitido). Custo de resgatar: baixo — um arquivo de teste, nenhuma dependência nova, nenhuma mudança em
código de produção.

## Não verificado

- **Se a suíte da branch passa hoje.** Não a executei: rodar `npm test` neste arquivo não foi feito nesta
  análise. A compatibilidade acima é por inspeção de símbolos (`Deno.serve`, `npm:@supabase/supabase-js`,
  códigos de erro), não por execução. O handler mudou desde 09/10/2026, então o resgate pode exigir ajuste
  nos dublês (em especial `_shared/kill_switch.ts`, que o teste atende devolvendo `[]` para
  `system_kill_switches`).
- **Se existe PR aberta tocando este mesmo arquivo.** Não consultei as PRs abertas nesta análise.
- **Se outro agente tentou o mesmo harness em outra branch ainda não triada.** Verifiquei apenas a main.
