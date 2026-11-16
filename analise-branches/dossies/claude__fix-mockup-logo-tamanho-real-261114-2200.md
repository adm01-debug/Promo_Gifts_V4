# origin/claude/fix-mockup-logo-tamanho-real-261114-2200

- **Veredito:** DECISAO_HUMANA  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** faz a imagem de mockup entregue ao cliente sair com a logo do tamanho que o vendedor posicionou na tela (ja esta valendo na producao) e levanta uma pergunta de negocio ainda aberta: quando o produto nao tem medidas cadastradas, o sistema deve recusar o mockup ou entregar um mockup com medida estimada?
- **Tip / merge-base / main:** tip `df0ccdfe271de63555484efca4fe13956d07e42d` · merge-base `7b84ebe5130cbe36aa8f817fed4ba873648dbfe3` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`df0ccdfe27`, "fix(mockup): logo no tamanho real na imagem gerada"). A edge
`generate-mockup` dimensionava a logo com uma regra propria (produto-referencia de 20 cm, minimo de
8 px e um teto de 98% do quadro que encolhia logo grande), diferente da regra que o editor usa na
tela. Resultado: a imagem gerada saia com a logo num tamanho diferente do que o vendedor tinha
posicionado. A branch fez quatro coisas:

1. criou `supabase/functions/generate-mockup/geometry.ts` replicando a formula do editor
   (`src/lib/mockup-geometry.ts`): minimo de 40 px, inferencia de uma medida a partir da outra,
   fracao default do produto 0,85 e teto de absurdo `MAX_LOGO_PX = 8*1024` no lugar do teto de 98%;
2. trocou, em `index.ts`, o `computeLogoPx()` interno por `logoSizePx()` desse modulo, removendo
   `FALLBACK_PRODUCT_REFERENCE_CM = 20` e `MAX_LOGO_CANVAS_FRACTION = 0.98`;
3. criou o teste `index.geometry.test.ts` e registrou o arquivo no coletor (`vitest.config.ts`),
   sem o qual o teste nao roda;
4. **mudou a regra de negocio:** sem nenhuma medida real do produto, a edge passaria a RECUSAR o
   pedido (HTTP 422 `missing_dimensions`, via `checkProductDimensions`) em vez de estimar.

Esta branch e ainda duplicata byte-a-byte da branch `claude/fix-mockup-geometria-wysiwyg-261115-0045`
(mesmo blob de `geometry.ts`: `35951d576ab94e34b8085582bbe9992ab3a3633d` nas duas), que foi a que
chegou a main.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| modulo de geometria da edge (`geometry.ts`) com minimo de 40 px, fracao default 0,85 e `MAX_LOGO_PX = 8*1024` | esta | `origin/main:supabase/functions/generate-mockup/geometry.ts:29` (`MIN_LOGO_PX = 40`), `:40` (`MAX_LOGO_PX = 8 * 1024`), `:47` (`DEFAULT_PRODUCT_FRACTION = 0.85`), `:90` (`cmParaPx`), `:126` (`logoSizePx`) |
| inferencia de uma medida a partir da outra (mesma razao do editor) | esta | `origin/main:supabase/functions/generate-mockup/geometry.ts:96` — `const physW = prodW ?? (prodH ? prodH * 0.4 : 8);` |
| edge usa a formula do editor no lugar do calculo proprio | esta | `origin/main:supabase/functions/generate-mockup/index.ts:9` (`import { logoSizePx } from "./geometry.ts"`), `:308` (`const { lw, lh } = logoSizePx({`) |
| remocao do produto-referencia de 20 cm, do minimo de 8 px e do teto de 98% (a causa do tamanho errado) | esta | `git show origin/main:supabase/functions/generate-mockup/index.ts \| grep -n "computeLogoPx\|FALLBACK_PRODUCT_REFERENCE_CM\|MAX_LOGO_CANVAS_FRACTION"` nao retorna nada |
| teste da geometria (`index.geometry.test.ts`) | esta | `git ls-tree -r --name-only origin/main \| grep generate-mockup` lista `supabase/functions/generate-mockup/index.geometry.test.ts` |
| registro do teste no coletor (`vitest.config.ts`) | esta | o diff branch->main de `vitest.config.ts` mostra a linha `'supabase/functions/generate-mockup/index.geometry.test.ts'` como contexto inalterado (a main so acrescentou `index.size.test.ts` depois) |
| **recusa 422 `missing_dimensions` quando o produto nao tem medidas** (`checkProductDimensions`, `hasProductDimensions`, `MISSING_DIMENSIONS_*` e o bloco no handler; `validationError` com status variavel) | **NAO ESTA — descartada de proposito** | `git grep -n checkProductDimensions origin/main` so acha mencao em documento e a assercao NEGATIVA do teste: `origin/main:supabase/functions/generate-mockup/index.geometry.test.ts:75-78` — `it("o handler nao recusa payload sem dimensoes (kit-builder depende disso)")` com `expect(INDEX_SRC).not.toContain("checkProductDimensions")`. A razao esta escrita em `origin/main:supabase/functions/generate-mockup/geometry.ts:12-18`: "A branch de origem recusava com 422 missing_dimensions; essa parte nao foi aplicada por mudar regra de negocio para o usuario final" |

Quando o conteudo entrou na main: commit `b89a44e100` (2026-11-15), PR #3665.

## A resgatar

Um unico item, e ele **nao pode ser simplesmente reaplicado** — depende de uma escolha de negocio:

- **Arquivo:** `supabase/functions/generate-mockup/geometry.ts` + `supabase/functions/generate-mockup/index.ts`
- **O que:** a recusa do servidor (HTTP 422 `missing_dimensions`) quando o produto nao tem nenhuma
  medida real cadastrada.
- **Por que importa:** hoje, nesse caso, o sistema **nao avisa**: ele estima um produto de 8x20 cm e
  entrega um mockup cuja proporcao de logo nao corresponde ao produto real. Se esse mockup for
  enviado ao cliente final como aprovacao de arte, a logo pode ser produzida em tamanho diferente do
  combinado.
- **Por que nao foi aplicado:** a previa do montador de kits chama a edge sem medidas. Verificado em
  `origin/main:src/components/kit-builder/PersonalizationConfig.tsx:167-199` (`buildKitMockupRequest`
  monta o pedido sem `productWidthCm`/`productHeightCm`) e `:853` (`await generateMockupApi(request)`,
  sem passar pelo portao do hook). Com o 422, essa previa pararia de funcionar.
- **Observacao:** no fluxo principal de mockup o bloqueio JA existe, mas apenas no navegador:
  `origin/main:src/hooks/mockup/useMockupGenerator.ts:531-534` recusa antes de chamar a edge, com a
  mensagem de `MISSING_DIMENSIONS_REFUSAL` (`origin/main:src/hooks/mockup/mockupGeneratorModel.ts:44-47`).
  O comentario dessa linha ainda diz "espelha o 422 da edge", o que hoje nao e mais verdade — a edge
  nao devolve 422 (`origin/main:src/hooks/mockup/useMockupGenerator.ts:529-530`).

**Decisao que o dono precisa tomar (uma linha):** quando o produto nao tem medidas cadastradas, o
sistema deve (A) continuar entregando o mockup com medida estimada, como hoje, ou (B) recusar e pedir
o cadastro das medidas — e nesse caso a previa do montador de kits precisa passar a enviar as medidas
do produto antes de (B) entrar.

Recomendacao tecnica: (B), porque mockup e documento de aprovacao de arte; mas (B) exige a correcao
do montador de kits no mesmo pacote, senao a previa do kit quebra.

## Risco de fechar esta branch

Baixo para o codigo: os 6 itens tecnicos da branch estao na main e em producao, e esta branch e
duplicata exata de outra. O que se perde ao fechar sem registro e **a pergunta de negocio**: fica
valendo, por omissao, que o sistema entrega mockup com medida estimada quando o produto nao tem
medidas, sem avisar ninguem — e nao ha nada na main que traga isso de volta a mesa (o teste atual
congela o comportamento atual). Registre a decisao como item de negocio antes de apagar a branch;
depois disso, apagar a branch nao perde trabalho.

## Nao verificado

- Se existe produto em producao, hoje, sem `width`/`height` cadastrados (ou seja, qual o tamanho real
  do problema). Exigiria consulta ao banco de produtos, nao feita nesta analise.
- Se a previa do montador de kits tem acesso as medidas do produto no ponto onde monta o pedido
  (`buildKitMockupRequest` recebe apenas `displayName`, `imageUrl` e `personalization`); se tem, a
  opcao (B) e barata, se nao tem, exige passar o produto adiante. Nao rastreado ate os chamadores.
- A branch nao toca banco, policy, grant, funcao de banco nem migration; toca `supabase/functions/`
  (codigo de edge function), que vai a producao somente pelo workflow `deploy-edge-functions.yml`.
