# Veredito: os 52 testes de versão única NÃO entram na `main`

**Data:** 2026-11-16 · **`main` de referência:** `1f64212238` · **Decisão:** OBSOLETO, não resgatar

## De onde vieram

A varredura byte a byte de 2.372 commits preservados (os cinco refs `salvo/*`) mais 95 branches
remotas achou 52 arquivos de teste que **não existem na `main` em caminho nenhum** e têm **uma
única versão** em todo o universo — ou seja, pelo critério mecânico eram resgate determinístico.

Origem principal: `origin/codex/fix-gate1-kit-pdf-types-261109-2252` (40 arquivos), mais
`claude/fix-pr3517-gate1-baseline-261113-2336`, `claude/resgate-3390-261113`,
`recuperado/chore/graphify-sql-map-20261029`, `importado/vps-fabrica/v2/n52` e `s24`,
`codex/fix-e2e-relevance-261107-1148`.

Distribuição: `tests/hooks` 24, `tests/components` 7, `tests/scripts` 7, `tests/sql` 6,
`tests/pages` 5, `tests/edge-functions` 1, `tests/fixtures` 1, `tests/lib` 1.

## O que a medição mostrou

Escrevi os 52 numa branch e rodei:

| Comando | Resultado |
| --- | --- |
| `npm run qa:typecheck` | **exit 0** |
| `npx vitest run <os 52>` | **exit 1** — 44 de 45 arquivos falharam, 63 testes falharam |

A falha **não é de asserção**: 42 dos 44 arquivos falharam com `(0 test)`, isto é, nem carregaram.
O erro é sempre o mesmo formato:

```
Failed to resolve import "@/hooks/useQuoteTemplates" from "tests/hooks/useQuoteTemplates.legacy.test.ts"
```

São **26 módulos** que os testes importam e que não existem em `src/` na `main`.

## A causa, documentada pelo próprio repositório

**25 dos 26** módulos existem na `main`, mas dentro de `recovery/src-legacy/`:

`useQuoteTemplates`, `useQuoteComments`, `useQuoteVersions`, `useKitBuilderPageState`,
`useKitBuilderQueries`, `useKitBuilderTransformers`, `useKitAutoSave`, `useCustomKitPersistence`,
`useMockupDraft`, `useMagicUpState`, `useSearch`, `useAdvancedFilters`, `useProductsByCategory`,
`useProductsLightweight`, `useRamoAtividadeFilter`, `useAIRecommendations`, `useColorEnrichment`,
`useDeviceDetection`, `QuoteCommentsSection`, `QuoteTemplateForm`, `FavoritePresentationLauncher`,
`KitBuilderPage`, `MagicUp`, `QuoteBuilderPage`, `quote-view/QuoteActionHandlers`.

E `recovery/src-legacy/README.md`, na própria `main`, explica por que eles saíram de `src/`:

> Cópias **antigas** (layout plano pré-reorganização). Nenhum arquivo daqui é alcançável a partir de
> `src/main.tsx` nem de qualquer teste/script versionado; ao viverem em `src/` eles entravam no
> `tsc -p tsconfig.app.json` (**360 erros**) e no ESLint (**+369 problemas**), derrubando
> `Gate 1 - Lint + TypeScript` e o `Gate Final`.

A aposentadoria foi feita pela PR #3361, de propósito, e são 321 arquivos em
`recovery/src-legacy/` hoje.

## Veredito

Estes 52 testes exercitam **código aposentado de propósito porque quebrava o build**. Resgatá-los
exigiria ressuscitar os 25 módulos de `recovery/src-legacy/` para `src/`, o que traz de volta os 360
erros de TypeScript e derruba o `Gate Final`. Não é trabalho inacabado à espera de conclusão: é
trabalho que a `main` já decidiu descartar, com o motivo escrito.

**Não entram.** A branch local de teste foi descartada sem push.

## O único item que sobra desta leva

`src/components/cart/LegacyCartInsights` é o **único** dos 26 que não está nem em `src/` nem em
`recovery/src-legacy/` na `main`. Tem 2 versões em branch. Precisa de veredito próprio — está na
fila de classificação, não neste documento.

## Regra que isto estabelece para o resto do resgate

Arquivo cujo caminho tem contrapartida em `recovery/src-legacy/` é aposentadoria deliberada, não
perda. Medi o alcance: dos 1.797 arquivos com conteúdo fora da `main`, **9** caem nessa regra — ou
seja, ela resolve esta leva de testes mas **não** explica o resto, que segue precisando de veredito
um por um.
