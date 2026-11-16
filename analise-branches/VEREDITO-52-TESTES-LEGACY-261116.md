# Os 52 testes de versão única: o primeiro veredito estava errado

**Data:** 2026-11-16 · **`main` de referência:** `43fc3595af` · **Status:** veredito anterior
**RETRATADO** nesta revisão

> **Retratação.** A primeira versão deste documento concluiu que os 52 testes eram obsoletos porque
> os 26 módulos que eles importam teriam sido aposentados em `recovery/src-legacy/`. **Isso é falso
> para 21 dos 26.** A revisão do Codex na PR #3706 apontou o erro e a medição abaixo confirma: 21
> módulos estão **vivos em `src/`**, em caminhos reorganizados. O que quebrava os testes era o
> caminho do import, não a ausência do código. O documento foi reescrito inteiro; o veredito
> "obsoleto, não resgatar" **não vale**.

## De onde vieram

A varredura byte a byte de 2.372 commits preservados (os cinco refs `salvo/*`) mais 95 branches
remotas achou 52 arquivos de teste que não existem na `main` em caminho nenhum e têm uma única
versão em todo o universo.

Origem principal: `origin/codex/fix-gate1-kit-pdf-types-261109-2252` (40 arquivos), mais
`claude/fix-pr3517-gate1-baseline-261113-2336`, `claude/resgate-3390-261113`,
`recuperado/chore/graphify-sql-map-20261029`, `importado/vps-fabrica/v2/n52` e `s24`,
`codex/fix-e2e-relevance-261107-1148`.

## O erro do primeiro veredito

Rodando os 52 como vieram, 42 de 44 arquivos falhavam com `(0 test)` — nem carregavam:

```
Failed to resolve import "@/hooks/useQuoteTemplates" from "tests/hooks/useQuoteTemplates.legacy.test.ts"
```

Eu li isso como "o módulo não existe mais" e fui conferir `recovery/src-legacy/`, onde há uma cópia
de quase todos. Encontrei a cópia, li o `README.md` daquela pasta ("cópias antigas, layout plano
pré-reorganização, 360 erros de `tsc`") e concluí aposentadoria deliberada.

O que não conferi: se o módulo também existe em `src/`, **em outro caminho**. Existe. A
reorganização moveu os hooks de `src/hooks/<nome>.ts` para `src/hooks/<domínio>/<nome>.ts` e deixou
a cópia plana antiga em `recovery/src-legacy/`. O import do teste aponta para o caminho plano, que
não resolve mais. É quebra de caminho, não código morto.

## Os 26 módulos, um por um

Medido em `43fc3595af` com `find src -name '<nome>.ts*'`:

| Módulo importado pelos testes | Está vivo em `src/`? | Caminho real hoje |
| --- | --- | --- |
| `useAIRecommendations` | **sim** | `src/hooks/intelligence/useAIRecommendations.ts` |
| `useAdvancedFilters` | **sim** | `src/hooks/products/useAdvancedFilters.ts` |
| `useColorEnrichment` | **sim** | `src/hooks/products/useColorEnrichment.ts` |
| `useCustomKitPersistence` | **sim** | `src/hooks/kit-builder/useCustomKitPersistence.ts` |
| `useDeviceDetection` | **sim** | `src/hooks/admin/useDeviceDetection.ts` |
| `useKitAutoSave` | **sim** | `src/hooks/kit-builder/useKitAutoSave.ts` |
| `useKitBuilderPageState` | **sim** | `src/hooks/kit-builder/useKitBuilderPageState.ts` |
| `useKitBuilderQueries` | **sim** | `src/hooks/kit-builder/useKitBuilderQueries.ts` |
| `useKitBuilderTransformers` | **sim** | `src/hooks/kit-builder/useKitBuilderTransformers.ts` |
| `useMagicUpState` | **sim** | `src/hooks/intelligence/useMagicUpState.ts` |
| `useMockupDraft` | **sim** | `src/hooks/mockup/useMockupDraft.ts` |
| `useProductsByCategory` | **sim** | `src/hooks/products/useProductsByCategory.ts` |
| `useProductsLightweight` | **sim** | `src/hooks/products/useProductsLightweight.ts` |
| `useQuoteTemplates` | **sim** | `src/hooks/quotes/useQuoteTemplates.ts` |
| `useQuoteVersions` | **sim** | `src/hooks/quotes/useQuoteVersions.ts` |
| `useRamoAtividadeFilter` | **sim** | `src/hooks/crm/useRamoAtividadeFilter.ts` |
| `useSearch` | **sim** | `src/hooks/common/useSearch.ts` |
| `KitBuilderPage` | **sim** | `src/pages/kit-builder/KitBuilderPage.tsx` |
| `MagicUp` | **sim** | `src/pages/tools/MagicUp.tsx` |
| `QuoteBuilderPage` | **sim** | `src/pages/quotes/QuoteBuilderPage.tsx` |
| `QuoteActionHandlers` | **sim** | `src/pages/quotes/quote-view/QuoteActionHandlers.ts` |
| `LegacyCartInsights` | não | — |
| `FavoritePresentationLauncher` | não | — |
| `QuoteCommentsSection` | não | — |
| `QuoteTemplateForm` | não | — |
| `useQuoteComments` | não | — |

**21 vivos, 5 ausentes.** Dos 5 ausentes, 4 têm cópia em `recovery/src-legacy/`
(`FavoritePresentationLauncher.tsx`, `QuoteCommentsSection.tsx`, `QuoteTemplateForm.tsx`,
`useQuoteComments.ts`) e 1 não está em lugar nenhum (`LegacyCartInsights`).

## A medição que o veredito anterior não tinha

Reescrevi os imports dos testes para os caminhos reais da tabela acima e rodei. Agora eles
carregam — **nenhum** erro de `Cannot find module` no run:

```
Test Files  37 failed | 2 passed (39)
     Tests  376 failed | 294 passed (670)
  Duration  65.24s
```

Ou seja: **294 asserções escritas contra o código pré-reorganização continuam valendo contra o
código de hoje.** Não é código morto — é contrato que a `main` ainda cumpre. E 376 não valem mais:
é o mapa de onde a reorganização mudou comportamento.

### Por arquivo

| Arquivo de teste | testes | passam hoje | falham hoje |
| --- | --: | --: | --: |
| `tests/hooks/device-and-supplier-trust.contract.test.ts` | 79 | 76 | 3 |
| `tests/hooks/useLegacyCatalogContracts.test.ts` | 50 | 29 | 21 |
| `tests/pages/quote-view/root-quote-helpers.test.ts` | 123 | 27 | 96 |
| `tests/components/IntelligenceBadges.legacy-compat.test.tsx` | 35 | 26 | 9 |
| `tests/hooks/useQuoteTemplates.copy-preservation.test.ts` | 40 | 24 | 16 |
| `tests/hooks/useLegacyLintLifecycle.test.ts` | 27 | 18 | 9 |
| `tests/components/QuotesConfigurableList.approval.test.tsx` | 16 | 13 | 3 |
| `tests/hooks/useKitAutoSave.legacy.test.tsx` | 21 | 13 | 8 |
| `tests/hooks/useMockupDraft.legacy.test.ts` | 17 | 12 | 5 |
| `tests/hooks/useMagicUpState.legacy.test.tsx` | 9 | 8 | 1 |
| `tests/hooks/useCustomKitPersistence.legacy.test.tsx` | 14 | 6 | 8 |
| `tests/hooks/useLegacyLintMemoContracts.test.tsx` | 31 | 6 | 25 |
| `tests/hooks/useKitBuilderQueries.legacy.test.tsx` | 6 | 4 | 2 |
| `tests/scripts/e2e-relevance.test.mjs` | 42 | 4 | 38 |
| `tests/components/mockup/MockupConfigPanel.errors.test.tsx` | 6 | 3 | 3 |
| `tests/hooks/useKitBuilderPageState.financial.test.tsx` | 9 | 3 | 6 |
| `tests/hooks/useLegacyLintFilters.test.ts` | 7 | 3 | 4 |
| `tests/lib/legacy-kit-price-source.test.ts` | 10 | 3 | 7 |
| `tests/hooks/useLegacyLintDerived.test.tsx` | 4 | 2 | 2 |
| `tests/hooks/legacy-admin-utils-preservation.test.ts` | 46 | 1 | 45 |
| `tests/hooks/useCustomKitPersistence.financial.test.tsx` | 3 | 1 | 2 |
| `tests/hooks/useKitAutoSave.financial.test.tsx` | 2 | 1 | 1 |
| `tests/components/mockup/MockupHistoryPanel.techniques.test.tsx` | 1 | 0 | 1 |
| `tests/edge-functions/generate-mockup.cors.test.ts` | 0 | 0 | 0 |
| `tests/hooks/mockupHistoryAdapter.test.ts` | 5 | 0 | 5 |
| `tests/hooks/useKitBuilderPageState.legacy.test.tsx` | 31 | 0 | 31 |
| `tests/hooks/useQuoteTemplates.raw-fetch.test.ts` | 3 | 0 | 3 |
| `tests/hooks/useQuoteVersions.legacy.test.ts` | 6 | 0 | 6 |
| `tests/pages/legacy-KitBuilder.partial-preservation.test.tsx` | 5 | 0 | 5 |
| `tests/pages/legacy-MagicUp.search-lifetime.test.tsx` | 2 | 0 | 2 |
| `tests/pages/legacy-QuoteBuilder.partial-preservation.test.tsx` | 5 | 0 | 5 |
| `tests/scripts/db-reconcile-migration-history-workflow.test.mjs` | 0 | 0 | 0 |
| `tests/scripts/e2e-cart-artifact-safety.test.mjs` | 2 | 0 | 2 |
| `tests/scripts/enrich-typescript-references.test.mjs` | 0 | 0 | 0 |
| `tests/scripts/p200-e007-dependabot-secrets.test.mjs` | 2 | 0 | 2 |
| `tests/scripts/postprocess-graphify-report.test.mjs` | 0 | 0 | 0 |
| `tests/scripts/preflight-migration-history-revert.test.mjs` | 0 | 0 | 0 |


Os 5 arquivos com `0 testes` são `.mjs`/`.ts` de script e edge function que não coletaram nada
sob a config de vitest usada no run — eles precisam de um projeto de teste diferente, não de
resgate de código.

### Limite honesto desta medição

O relatório do vitest mostra `[156/381]` blocos de erro: ele imprime os primeiros 156 e corta. Das
156 falhas visíveis, 96 são `AssertionError` (valor diferente do esperado), 37 `Error`, 19
`TypeError` e 4 `TestingLibraryElementError`. **Não classifiquei as 225 falhas restantes** — não sei
quanto delas é mudança real de comportamento e quanto é mock desatualizado do próprio teste. Isso
fica como trabalho, não como conclusão.

## O que isso muda no veredito

| Antes (errado) | Agora (medido) |
| --- | --- |
| 25 dos 26 módulos aposentados em `recovery/src-legacy/` | 21 dos 26 **vivos em `src/`**, em caminho novo |
| testes exercitam código que quebrava o build | testes exercitam código em produção, por caminho velho |
| resgatar exigiria ressuscitar 25 módulos e trazer 360 erros de `tsc` | resgatar exige **reescrever imports**, nada mais |
| "obsoleto, não resgatar" | **não são obsoletos**; são snapshots de comportamento, 294/670 ainda verdes |

O argumento dos "360 erros de `tsc`" do `recovery/src-legacy/README.md` continua verdadeiro — mas
é sobre as **cópias planas antigas**, que ninguém propõe trazer de volta. Ele não se aplica aos 21
módulos que já estão em `src/` e já passam pelo `Gate 1`.

## O que já foi resgatado desta leva

Os 2 arquivos que passam **100%** foram para a `main` pela PR #3707
(`claude/fix-gate-e23-fork-e-teste-resgatado-261116-1530`), com 11 testes verdes:

- `tests/hooks/useAIRecommendations.legacy-retry.test.ts`
- `tests/hooks/useKitBuilderPageState.quantity.test.tsx`

Mais um terceiro, `tests/scripts/p200-e007-dependabot-secrets.test.mjs` (29 linhas), que **falha na
`main` de propósito**: ele afirma a política do `Gate E23` para fork e Dependabot que a `main` não
tinha. A mesma PR #3707 implementa a política e o teste fica verde. É o caso mais claro de que esta
leva não era lixo: um agente escreveu o teste correto de um bug que ninguém tinha corrigido ainda.

## Os 5 módulos ausentes

- `LegacyCartInsights` — **decidido, não resgatar.** Não está em `src/` nem em
  `recovery/src-legacy/`. `analise-branches/auditoria-261115/veredito_lote00.md:148-152` registra
  "código morto: o único consumidor na própria branch é o teste dele"; e
  `analise-branches/dossies/claude__resgate-3390-261113.md:83-84` registra "a main removeu esses
  painéis de propósito".
  **Correção ao que escrevi antes:** eu disse que o CI "quebra se eles voltarem". A revisão do Devin
  na PR #3706 mostrou que isso é mais forte do que a evidência. O que os testes da `main` fazem é
  vetar **uso**, não **existência**: `SellerCartContext.test.tsx:63-75` proíbe os símbolos no fonte
  do contexto e `CartSidebar.render.test.tsx:113-142` afirma que os painéis não são renderizados.
  Nenhum dos dois impede que o arquivo do módulo seja re-adicionado sem consumidor. A guarda cobre
  regressão de comportamento, não re-entrada de arquivo morto.
- `FavoritePresentationLauncher`, `QuoteCommentsSection`, `QuoteTemplateForm`, `useQuoteComments` —
  só em `recovery/src-legacy/`. Aqui o veredito anterior **se sustenta**: são as cópias planas
  aposentadas, e trazê-las de volta é que reabre o problema do `tsc`. Os testes que dependem
  **só** deles não têm como ficar verdes sem essa decisão.

## Veredito revisado

Os 52 **não são obsoletos**. São snapshots de comportamento do código pré-reorganização, que hoje
só precisam de import correto para rodar. Com os imports corrigidos, 294 de 670 asserções passam
contra a `main` atual.

O resgate correto não é "trazer os 52" nem "descartar os 52". É, por arquivo:

1. **Passa 100%** → entra na `main` como teste de regressão. 2 arquivos, feito na PR #3707.
2. **Passa parcial** → a parte verde é contrato válido que a `main` não testava; a parte vermelha é
   deriva de comportamento a investigar (o teste está velho ou a `main` regrediu — não dá para
   afirmar qual sem ler caso a caso). 30 arquivos.
3. **Depende só dos 4 módulos em `recovery/src-legacy/`** → fica fora, pelo motivo do `README.md`
   daquela pasta.
4. **`0 testes` coletados** → problema de config de vitest, não de resgate. 5 arquivos.

## A regra que o primeiro veredito estabeleceu, corrigida

**Errada:** "arquivo cujo caminho tem contrapartida em `recovery/src-legacy/` é aposentadoria
deliberada".

**Certa:** a existência de uma cópia em `recovery/src-legacy/` **não** prova aposentadoria — prova
apenas que o layout plano antigo foi arquivado. Antes de chamar qualquer módulo de aposentado, é
obrigatório procurá-lo em `src/` **por nome de arquivo**, não por caminho:

```bash
find src -type f \( -name "<nome>.ts" -o -name "<nome>.tsx" \)
```

Só é aposentadoria quando esse comando não devolve nada. Essa é a diferença entre os 21 e os 4
desta leva — e é o passo que faltou no primeiro veredito.
