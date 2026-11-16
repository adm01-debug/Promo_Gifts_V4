# origin/importado/vps-fabrica/v2/s51-2610081948

- **Veredito:** DECISAO_HUMANA  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** faz a logo sair na imagem gerada do mesmo tamanho que o vendedor posicionou na tela (isso ja esta em producao) e, alem disso, queria PROIBIR a geracao de mockup para produto sem medidas cadastradas — essa proibicao foi deixada de fora de proposito e e a decisao que falta.
- **Tip / merge-base / main:** tip `e7a99e07e9400676cdeac15a94ff856fb9461c66` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Commit unico, `e7a99e07e9` ("fix(mockup): servidor usa a mesma geometria do editor e recusa payload sem dimensoes"), com **duas** intencoes distintas:

1. **WYSIWYG.** A edge `generate-mockup` calculava o tamanho da logo com uma regra propria — supunha um "produto de referencia de 20 cm" enchendo o quadro (`FALLBACK_PRODUCT_REFERENCE_CM`), minimo de 8 px, fracao do produto = 1 e um teto de 98% do quadro que encolhia logo grande. Resultado: a imagem entregue ao cliente saia com a logo em tamanho diferente do que o vendedor viu e aprovou na tela. A branch criou `supabase/functions/generate-mockup/geometry.ts` replicando a formula do editor (`cmParaPx` em `src/lib/mockup-geometry.ts`): minimo de 40 px, fracao default 0.85, inferencia de uma medida a partir da outra, sem o teto de 98%.
2. **Portao de medidas.** Sem as medidas reais do produto (cm), a branch fazia o servidor **recusar** a geracao (HTTP 422, codigo `missing_dimensions`), em vez de desenhar com a medida estimada 8x20 cm do editor. Era o `checkProductDimensions` de `geometry.ts` + o bloco de recusa em `index.ts`.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Modulo `geometry.ts` com `cmParaPx` / `logoSizePx` | ESTA | `supabase/functions/generate-mockup/geometry.ts:90` (`export function cmParaPx`) e `:126` (`export function logoSizePx`) |
| Minimo de 40 px (saiu o de 8 px) | ESTA | `geometry.ts:29` `export const MIN_LOGO_PX = 40` |
| Fracao default do produto 0.85 (saiu o 1) | ESTA | `geometry.ts:47` `export const DEFAULT_PRODUCT_FRACTION = 0.85` |
| Inferencia de uma dimensao a partir da outra (0.4 / 2.5) | ESTA | `geometry.ts` (`physW = prodW ?? (prodH ? prodH * 0.4 : 8)`), mesmo codigo da branch |
| `index.ts` passa a usar a formula compartilhada | ESTA | `supabase/functions/generate-mockup/index.ts:9` `import { logoSizePx } from "./geometry.ts";` e `:308` `const { lw, lh } = logoSizePx({` |
| Saida do produto-referencia de 20 cm e do `computeLogoPx` | ESTA (removidos) | `git show origin/main:.../index.ts \| grep -n "FALLBACK_PRODUCT_REFERENCE_CM\|computeLogoPx"` nao retorna nenhuma linha |
| Saida do teto de 98% do quadro (`MAX_LOGO_CANVAS_FRACTION`) | ESTA (removido), trocado por teto de absurdo | `geometry.ts:40` `export const MAX_LOGO_PX = 8 * 1024`, aplicado proporcionalmente em `logoSizePx` |
| Teste que prova a paridade com o editor | ESTA, e roda no CI | `supabase/functions/generate-mockup/index.geometry.test.ts` na main; incluido em `vitest.config.ts:71`; execucao nesta sessao: `npx vitest run supabase/functions/generate-mockup/index.geometry.test.ts` → `Test Files 1 passed (1) / Tests 18 passed (18)` |
| Portao 422 `missing_dimensions` (`checkProductDimensions`) | **NAO ESTA** — descartado de proposito | `git show origin/main:.../geometry.ts \| grep -n "checkProductDimensions\|MISSING_DIMENSIONS"` nao retorna nada; `geometry.ts` da main documenta no cabecalho: "A branch de origem recusava com 422 missing_dimensions; essa parte nao foi aplicada por mudar regra de negocio para o usuario final" |
| `validationError` com status variavel (existia so para servir o 422) | **NAO ESTA** — voltou a 400 fixo | `index.ts` da main: `{ status: 400, headers: ... }`; teste na main cobre isso ("validationError segue com 400 fixo") |

**Quem incorporou e quando:** commit de merge `b89a44e100` na main (2026-11-15), que cita a branch pelo nome: "Resgate de claude/fix-mockup-geometria-wysiwyg-261115-0045 (commit 738445d92; gemea importado/vps-fabrica/v2/s51-2610081948 e7a99e07e), adaptado". Ou seja: a branch e a **gemea** de uma branch ja resgatada; o trabalho tecnico dela esta em producao.

**Por que o 422 foi recusado (evidencia conferida por mim, nao so a palavra do commit):** o kit-builder monta o pedido de previa **sem** as medidas do produto — `src/components/kit-builder/PersonalizationConfig.tsx:167-200` (`buildKitMockupRequest`) devolve `productImage`, `productName`, `technique` e `areas`, e nenhum `productWidthCm`/`productHeightCm`. O payload que chega na edge nasce em `src/hooks/mockup/mockupGenerationService.ts:377-378`, que repassa `params.productWidthCm ?? undefined`. Logo: com o portao da branch ligado, **toda previa de kit pararia de gerar** (422). O portao do lado do cliente que existe hoje (`MISSING_DIMENSIONS_REFUSAL`, `src/hooks/mockup/useMockupGenerator.ts:534`) cobre so a tela de gerar mockup, nao o kit-builder.

## A resgatar

Nada para aplicar por conta propria. O que sobra e **uma pergunta de negocio** (por isso o veredito e DECISAO_HUMANA):

- **Arquivo:** `supabase/functions/generate-mockup/geometry.ts` (lado servidor) + `src/components/kit-builder/PersonalizationConfig.tsx:167-200` (quem gera sem medida).
- **O que:** hoje, quando o produto **nao tem medidas cadastradas**, o sistema gera o mockup usando uma medida **estimada** de 8x20 cm — a mesma que a tela desenha — e **nao avisa ninguem**. A branch queria barrar isso (recusar a geracao). Barrar como ela propunha derrubaria a previa do kit-builder, entao nao se faz; mas a pergunta segue aberta: *o vendedor deve ser avisado de que aquela imagem usou medida estimada?*
- **Por que importa:** o mockup e o que o cliente final aprova. Se o produto nao tem medidas cadastradas, a logo na imagem pode nao corresponder ao tamanho real impresso, e hoje ninguem percebe. Tres caminhos, todos de negocio: (a) deixar como esta; (b) gerar e marcar a imagem/tela com "tamanho estimado - produto sem medidas cadastradas"; (c) recusar so no gerador de mockups (onde o vendedor pode cadastrar a medida) e manter a previa do kit gerando.

## Risco de fechar esta branch

Baixo para o codigo: os 8 itens tecnicos da branch estao na main e com teste verde no CI (18 testes). Apagar a branch nao perde o WYSIWYG.

O unico risco real e **perder o registro da pergunta**: o portao de medidas foi descartado por um agente, nao pelo dono. Se a branch for fechada sem registrar a duvida acima, ninguem mais lembra que existe produto sem medida cadastrada gerando mockup com tamanho estimado e sem aviso. Este dossie preserva isso; a branch pode ser apagada depois que o dono responder (a) / (b) / (c).

## Nao verificado

- `deno check` na edge `generate-mockup`: nao executado (Deno ausente neste ambiente). A prova de comportamento veio do Vitest sobre a formula pura, que e o padrao do repo para esta edge.
- Comportamento em producao da edge `generate-mockup` hoje (se o deploy em producao corresponde ao arquivo da main): nao conferido nesta sessao. Pendencia conhecida do repo (19 edge functions divergem do repositorio).
- Quantos produtos do catalogo estao hoje sem `width`/`height` cadastrados: nao medido. Esse numero dimensiona o tamanho do problema do item acima e sai de uma consulta de leitura ao banco.
