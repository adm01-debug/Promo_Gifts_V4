# Adjudicação byte-a-byte dos 219 arquivos ausentes do `main`

Data: 2026-11-17 · método e números medidos nesta sessão, não estimados.

## Por que este documento existe

A regra do dono para fechar branch ou PR é: só apagar o que está **provado** incorporado ao `main` ou
realmente obsoleto. Este arquivo é essa prova para os arquivos que existiam em alguma branch
`origin/salvo/*` e não existiam em `origin/main`.

## Medida do universo (32 branches `origin/salvo/*` vs `origin/main`)

| medida | nº | como foi medido |
|---|---:|---|
| caminhos presentes em alguma branch e ausentes do `main` | 722 | `comm -23` entre `git ls-tree -r --name-only` de cada branch e do `main` |
| byte-idênticos a um arquivo do `main` em outro caminho | 302 | hash de blob do git presente em `git ls-tree -r origin/main` |
| conteúdo presente no histórico do `main` para o mesmo basename | 4 | blob comparado commit a commit em `git rev-list origin/main -- <path>` |
| homônimo no `main` com conteúdo diferente | 197 | diferença real, avaliada caso a caso |
| basename inexistente em qualquer caminho do `main` | 219 | adjudicados um por um, tabela abaixo |

**Correção de medida anterior:** o inventário que circulava falava em 325 ausentes. Aquela conta
não cobria as 32 branches `salvo/*` atuais. O número medido agora é 722.

## Método de adjudicação

Cada um dos 219 arquivos foi lido na branch (`git show <branch>:<caminho>`) e confrontado com o `main`.
Veredito possível: **incorporado** (a função existe no `main` por outro arquivo/nome, com arquivo:linha),
**obsoleto** (mock, snapshot datado, duplicata, alvo removido do produto) ou **gap_real**.

Todo `gap_real` passou por uma segunda rodada **adversarial**: um agente independente recebeu a alegação
com a tarefa de refutá-la, e só podia concluir "gap" depois de procurar e não achar.
Resultado: **52 alegações, 33 refutadas, 19 confirmadas**.

| veredito | nº |
|---|---:|
| incorporado no `main` | 121 |
| obsoleto | 46 |
| gap real confirmado | 19 |
| gap alegado e refutado | 33 |

## Os 19 gaps confirmados

Natureza: **cobertura de teste perdida sobre código vivo do `main`** (16), um workflow de CI,
um helper e uma diferença de desenho de UI. Nenhuma função de produto do `main` ficou sem equivalente.

### `QuoteAutoSave.recovery.test.tsx` (em tests/components/ da branch, ausente do main)

- branch: `origin/salvo/claude-fix-pr3517-gate1-baseline-261113-2336, origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252`
- por quê é gap: O schema Zod foi resgatado (`src/lib/quotes/quoteDraftRecovery.ts` + `src/lib/quotes/__tests__/quoteDraftRecovery.test.ts`), mas a UI de recuperação NÃO: `QuoteAutoSaveProps` (`src/components/quotes/QuoteAutoSave.tsx:30-40`) não tem `onRestore`; `git grep -n 'Restaurar rascunho\|isRecoverableDraft\|QuoteBuilderDraftRecovery' origin/main -- src/` => vazio. O main valida o rascunho só dentro do hook `useQuoteAutoSave.loadDraft` (`:390-416`) e devolve `null` em silêncio — não há botão de restaurar, nem alerta de erro, nem garantia de não submeter o form / não escrever no storage. O teste cobre justamente isso: 15 envelopes inválidos sem oferta de recuperação e sem tocar o localStorage, restaur…
- ação: portar a feature + o teste: adicionar `onRestore` e o botão "Restaurar rascunho" em `src/components/quotes/QuoteAutoSave.tsx` usando `quoteDraftRecoverySchema`, e remover o import de `@/pages/quoteDraftRecovery` (shim que não existe no main). É o item 1 do dossiê `analise-branches/dossies/codex__fix-gate1-kit-pdf-types-261109-2252.md` ("A resgatar").
- refutação falhou porque: Tentei refutar e falhei: no main (origin/main @ 3c5785844) existe só o schema Zod e a validação silenciosa dentro do hook interno; não há nenhuma UI de recuperação de rascunho — nem prop onRestore no componente, nem botão "Restaurar rascunho", nem alerta de erro, nem teste equivalente. O arquivo alegado não existe no main (git ls-tree só lista QuoteAutoSave.tsx, QuoteAutoSave.failureVisible.test.tsx e quoteAutoSaveStatus.ts). O comportamento do main é até oposto ao que o teste cobre em dois pon…

### `useCustomKitPersistence.financial.test.tsx` (em tests/hooks/ da branch, ausente do main)

- branch: `origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252`
- por quê é gap: A guarda financeira existe no main e NÃO tem teste: `src/lib/kit-builder/persistence.ts:107` — `if (!hasKnownKitPrices(kitState)) throw new Error(KIT_UNKNOWN_PRICE_MESSAGE)` — chamada por `src/hooks/kit-builder/useCustomKitPersistence.ts`. Nenhum teste do main importa `pricing-availability` (`git grep -ln pricing-availability origin/main -- tests/` => vazio) e os testes de persistência (`tests/lib/kit-builder-persistence.test.ts`, `kit-builder-atomic-persistence.test.ts`, `kit-builder-draft-preservation.test.ts`) não exercitam esse throw. `priceKnown` sobrevive à hidratação de rascunho (`src/lib/kit-builder/snapshot/read-draft.ts:112,134`), logo kits históricos chegam ao insert/update com p…
- ação: portar reapontando `@/hooks/useCustomKitPersistence` -> `@/hooks/kit-builder/useCustomKitPersistence`; é o teste que trava a escrita de preço desconhecido antes do insert/update
- refutação falhou porque: Procurei e NÃO achei nada no main que cubra o throw da guarda financeira na persistência. A guarda existe no main (`src/lib/kit-builder/persistence.ts:112` — `if (!hasKnownKitPrices(kitState)) throw new Error(KIT_UNKNOWN_PRICE_MESSAGE)`, dentro de `buildKitPersistencePayload`, chamada em `src/hooks/kit-builder/useCustomKitPersistence.ts:108` e `src/hooks/kit-builder/useKitAutoSave.ts:168`), e nenhum teste do main a exercita: zero arquivos em `tests/` importam `pricing-availability`, zero mencio…

### `useCustomKitPersistence.legacy.test.tsx` (em tests/hooks/ da branch, ausente do main)

- branch: `origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252`
- por quê é gap: Alvo vivo (`src/hooks/kit-builder/useCustomKitPersistence.ts`, `src/lib/kit-library/buildCustomKitInsert.ts`). 2 dos 14 casos já estão no main (`tests/hooks/useCustomKitPersistence.pin-order.test.tsx`: "resposta atrasada do pin anterior não anuncia um estado final desatualizado" e "troca de conta no meio do voo suprime a notificação da conta anterior"), mas ficam sem cobertura: leitura de linha crua com nulls/extras JSON/organização/tipo/revisão sem normalizar nem esconder rascunhos; "RLS failed update rejects without a success message" (update negado pelo RLS não pode anunciar sucesso); e os 3 casos de duplicação preservando dados anuláveis — o main só tem `buildCustomKitInsert.test.ts`, com apenas 2 casos.
- ação: portar os blocos de leitura crua, RLS-negado e duplicação (reapontar `@/hooks/useCustomKitPersistence` -> `@/hooks/kit-builder/...`); descartar os 2 casos de pin/conta já cobertos
- refutação falhou porque: Não consegui refutar: os três grupos de asserções citados não existem no main. (1) Duplicação com dados anuláveis: `tests/lib/buildCustomKitInsert.test.ts` no main tem só 2 casos, ambos sobre `kit_type` (linhas 33 e 42); nenhum outro teste referencia `buildCustomKitInsert` nem `serializeJsonValue` (`git grep -ln` em origin/main -- tests só retorna esse arquivo), logo "sem id/revision/timestamps", "override null explícito limpa" e "serializa JSON preservando campos desconhecidos" ficam descobert…

### `useKitBuilderPageState.legacy.test.tsx` (em tests/hooks/ da branch, ausente do main)

- branch: `origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252`
- por quê é gap: Parte já foi resgatada: os describes "Hydrated controller roundtrip preserves nested future metadata" (4 casos) e "Raw NULL draft quantity..." estão no main em `tests/hooks/useKitBuilderPageState.quantity.test.tsx:220-316` e `:162-208`, com os mesmos títulos. O resto não: `src/hooks/kit-builder/useKitBuilderPageState.ts:260-285` carrega o produto do deep link (`?product=`) num efeito **sem nenhuma guarda** — não há AbortController, nem checagem de unmount, nem de troca de URL, nem de escopo de usuário, nem deadline, nem validação de encaixe na caixa selecionada. O arquivo da branch cobre exatamente isso em "Deep-link product integration respects mode, URL, account and deadlines" (9 casos: a…
- ação: gap de produto + teste: o efeito de deep link do main aplica resposta tardia depois de unmount/troca de URL/troca de conta. Portar as guardas junto com o teste (reapontar `@/hooks/use*` para as subpastas) e descartar os 2 describes já presentes em `.quantity.test.tsx`
- refutação falhou porque: Procurei no main e NÃO achei nada que cumpra a função. (1) O efeito do deep link em `origin/main:src/hooks/kit-builder/useKitBuilderPageState.ts:260-285` segue sem qualquer guarda: IIFE async com `await dbInvoke(...)`, sem AbortController, sem flag de unmount, sem revalidar `productIdParam` após o await, sem escopo de usuário (`user?.id` não está nem nas deps — há `eslint-disable react-hooks/exhaustive-deps` e deps `[productIdParam, kitIdParam]`) e sem deadline. (2) `git grep -n -i -E "AbortCon…

### `useLegacyLintDerived.test.tsx` (em tests/hooks/ da branch, ausente do main)

- branch: `origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252`
- por quê é gap: Alvos vivos e com ZERO teste no main: `src/hooks/products/useColorEnrichment.ts` e `src/hooks/products/useVariantStock.ts` — `git ls-tree -r --name-only origin/main | grep -iE '(tests?/|__tests__/).*(useColorEnrichment|useVariantStock)'` => vazio. Cobre: estabilidade referencial de `allProductStocks`/`alerts`/`summary` entre rerenders e a API pública completa (`getProductStock`, `getColorStock`, `dismissAlertsBySeverity`, `fetchStockData`, todos presentes em `src/hooks/products/useVariantStock.ts:241-251`); re-enriquecimento ao trocar a cor selecionada; e enriquecimento incremental que **não** repede os IDs antigos (contrato de custo — `variantCalls().at(-1)[0][0].filters.product_id` == só …
- ação: portar reapontando `@/hooks/useColorEnrichment` -> `@/hooks/products/useColorEnrichment`, `@/hooks/useVariantStock` -> `@/hooks/products/useVariantStock`, e trocando o mock de `@/lib/external-db` (`invokeBatchBridge`) por `@/lib/db/postgrest` (`dbInvoke`), que é o que o hook do main usa (`useColorEnrichment.ts:14,117,127,143,224`)
- refutação falhou porque: Não achei no main nenhum teste que exercite `useColorEnrichment` ou `useVariantStock` de fato. Todas as 7 referências em arquivos de teste do main são (a) `vi.mock` substituindo o hook, ou (b) cópias/espelhos da lógica pura, nunca o hook renderizado. Os comportamentos alegados (estabilidade referencial de allProductStocks/alerts/summary, API pública completa, re-enriquecimento ao trocar cor, enriquecimento incremental sem repedir IDs antigos) existem no código vivo do main e estão sem cobertura…

### `useLegacyLintFilters.test.ts` (em tests/hooks/ da branch, ausente do main)

- branch: `origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252`
- por quê é gap: Alvos vivos `src/hooks/products/useProductsByCategory.ts` e `useProductsByColor.ts`, com testes no main (`src/hooks/products/__tests__/`) que cobrem invocação, `includeDescendants` default, `enabled=false`, formato dos dados e erro — mas NÃO cobrem o contrato de ciclo de vida que este arquivo isola: "does not refetch after result size changes or an equal selection receives a new array" e "preserves same-content selections without duplicate requests" (pai que recria o array a cada render não pode disparar nova requisição) e "does not retry indefinitely when a request rejects and parents rebuild arrays" (loop de retry). Também cobre "reads current groups after a key change and never mixes red…
- ação: portar reapontando para `@/hooks/products/...` e trocando o mock `@/lib/external-db`/`invokeBatchBridge` por `@/lib/db/postgrest`/`dbInvoke` (o teste do main já mocka `dbInvoke`); manter só os casos de estabilidade/retry, o resto é duplicata
- refutação falhou porque: Procurei no main e NÃO achei cobertura equivalente. Os alvos estão vivos (src/hooks/products/useProductsByCategory.ts, src/hooks/products/useProductsByColor.ts) e a implementação já tem as guardas (lastFetchedKey/fetchTokenRef/AbortController), mas nenhum teste do main exercita o ciclo de vida desses dois hooks: os dois arquivos de teste existentes não fazem um único rerender. O único teste de estabilidade/render-loop do main é de OUTRO hook exportado no mesmo módulo (useCategoryDescendants), n…

### `useLegacyLintLifecycle.test.ts` (em tests/hooks/ da branch, ausente do main)

- branch: `origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252`
- por quê é gap: De 5 alvos, 3 estão vivos e sem teste nenhum no main: `src/hooks/products/useSuppliers.ts`, `src/hooks/products/useProductBounds.ts` (+ `src/lib/product-bounds-detector.ts`) e `src/hooks/simulation/useTechniquePricingOptions.ts` — `git ls-tree -r --name-only origin/main | grep -iE '(tests?/|__tests__/).*(useSuppliers|useProductBounds|useTechniquePricingOptions)'` => vazio (só há `useSupplierSalesRanking.test.ts` e `useTechniquePricing.test.ts`, outros hooks). Os describes correspondentes cobrem: carga única de fornecedores ordenados com `fetchAll` estável e defaults anuláveis; chave/cancelamento de `useProductBounds` ("does not let an old pending result overwrite a newer image", "cancels pe…
- ação: portar os 3 describes sem cobertura, reapontando `@/hooks/useSuppliers` -> `@/hooks/products/useSuppliers`, `@/hooks/useProductBounds` -> `@/hooks/products/useProductBounds`, `@/hooks/useTechniquePricingOptions` -> `@/hooks/simulation/useTechniquePricingOptions`; descartar os blocos de useAdvancedFilters e useDevGate
- refutação falhou porque: Procurei e NÃO achei cobertura equivalente no main. Os 3 alvos existem vivos no main (src/hooks/products/useSuppliers.ts, src/hooks/products/useProductBounds.ts + src/lib/product-bounds-detector.ts, src/hooks/simulation/useTechniquePricingOptions.ts) e nenhum teste do main os exercita: todas as 6 ocorrências desses símbolos em arquivos de teste do main são `vi.mock(...)` que SUBSTITUEM o hook ao testar outro componente, nunca o hook em si. tests/hooks/useTechniquePricing.test.ts é outro hook (u…

### `useMagicUpState.legacy.test.tsx` (em tests/hooks/ da branch, ausente do main)

- branch: `origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252`
- por quê é gap: Os 2 primeiros casos já estão no main com título idêntico (`tests/hooks/useMagicUpState.brandkit.test.tsx:134,169`). Os outros 7 não: `tests/hooks/useMagicUpProducts.helpers.test.ts` cobre o mapper de imagem/ranking FTS/limit50/falha do servidor, e `useMagicUpGeneration.share.test.tsx` cobre compartilhamento — nenhum cobre o ciclo de vida da busca em `src/hooks/intelligence/useMagicUpState.ts`: "first load failure finishes initial skeleton and exposes no fabricated products", "debounces real search, keeps selection and accepts only the latest server response", "clears selected-product loading state and suppresses stale images/colors after navigation", "hydrates the same client for a changed…
- ação: portar os describes "Original MagicUp search and asynchronous navigation" e "MagicUp active Gold colors/images", reapontando `@/hooks/useMagicUpState` -> `@/hooks/intelligence/useMagicUpState` e `@/hooks/useMockupTechniques` -> `@/hooks/mockup/useMockupTechniques`; descartar o describe de Brand Kit (já no main)
- refutação falhou porque: Procurei e NÃO achei cobertura equivalente no main. Os 2 primeiros casos realmente duplicam o main (tests/hooks/useMagicUpState.brandkit.test.tsx:134,169 — títulos idênticos). Os outros 7 não têm equivalente: no main só 2 arquivos de teste tocam o ciclo de vida da busca do Magic Up (tests/pages/MagicUp.search-lifetime.test.tsx e tests/pages/MagicUp.a11y.test.tsx) e AMBOS mockam o hook inteiro (`vi.mock('@/hooks/intelligence/useMagicUpState', () => ({ useMagicUpState: () => state }))`, search-li…

### `useMockupDraft.legacy.test.ts` (em tests/hooks/ da branch, ausente do main)

- branch: `origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252`
- por quê é gap: Alvo vivo `src/hooks/mockup/useMockupDraft.ts`, com cobertura ampla no main (`src/hooks/mockup/__tests__/useMockupDraft.test.ts` ~24 casos + `.race.test.ts` 3 casos) que já cobre debounce de 2s, localStorage imediato, fallback FK 23503, precedência backend/local, clearDraft, logo data:->URL http e clear vs gravação em voo. Ficam descobertos 3 casos: "normalizes malformed JSON entries without accessing null properties" (entradas `null`/`[]`/`123`/`'bad'`/campos inválidos em `personalization_areas` sem acessar propriedade de null — guarda de crash ao abrir rascunho sujo), "skips backend for unauthenticated user while retaining local draft" e "cancels pending backend save on unmount". Grep em …
- ação: portar só esses 3 casos (reapontar `@/hooks/useMockupDraft` -> `@/hooks/mockup/useMockupDraft`); o resto é duplicata
- refutação falhou porque: Procurei no main inteiro (árvore de testes + código) e NÃO achei nada que cubra os 3 casos. Os 3 caminhos de código existem e estão vivos em `src/hooks/mockup/useMockupDraft.ts` do main, sem teste algum: (1) normalização de `personalization_areas` (linhas ~300-317) faz `const a = item as Record<string, unknown>` e lê `a.id` sem guarda de null/array/número — entrada `null` no JSONB estoura TypeError ao abrir rascunho; (2) `if (!user) return false` no save ao backend (linha 150) + chave local `us…

### `useQuoteTemplates.copy-preservation.test.ts` (em tests/hooks/ da branch, ausente do main)

- branch: `origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252`
- por quê é gap: O arquivo roda `describe.each` sobre dois adaptadores e a metade "canonical" exercita o hook vivo `src/hooks/quotes/useQuoteTemplates.ts`, cuja única cobertura no main (`src/hooks/quotes/__tests__/useQuoteTemplates.test.ts`, 7 casos) só testa estado inicial, guarda `user=null`, fetch e guarda `isAdmin`. Ficam sem teste regras de segurança/negócio implementadas: a guarda de visibilidade da cópia (`useQuoteTemplates.ts:437-446` — cancela o clone e avisa "O vendedor não terá acesso à cópia" quando `is_active !== true` e o destino é outro vendedor), `templateCopyPayload` preservando JSON cru e zerando `usage_count` sem herdar id/created_at/updated_at (`:88-115`), `created_by`/`seller_id` confor…
- ação: portar só o ramo `canonical` (remover o import e o caso `root` de `@/hooks/useQuoteTemplates`, que não existe no main); é o teste que protege a política de RLS da cópia de template
- refutação falhou porque: Não achei no main nenhum teste que cubra essas regras. Busquei por símbolos, mensagens de UI/erro e arquivos de teste: 1) Único teste do hook no main é `src/hooks/quotes/__tests__/useQuoteTemplates.test.ts` (167 linhas, 7 casos): `estado inicial` (2), `user=null guard` (1), `fetchTemplates` (3), `fetchAllTemplates — isAdmin guard` (1). Nenhum caso de cópia/clone/duplicate/update/delete. `git grep -l useQuoteTemplates origin/main -- tests/** src/**/__tests__/** e2e/** *.test.* *.spec.*` retorna …

### `root-quote-helpers.test.ts` (em tests/pages/quote-view/ da branch, ausente do main)

- branch: `origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252`
- por quê é gap: Alvos vivos `src/pages/quotes/quote-view/QuoteActionHandlers.ts` e `QuoteBitrixSync.ts` — este último sem NENHUM teste no main (`git grep -ln QuoteBitrixSync origin/main -- tests/ src/` só acha o fonte e `useQuoteViewData.ts`). Os 2 arquivos do main (`QuoteActionHandlers.test.ts` (em __tests__/ da branch, ausente do main), `.fuzz.test.ts`) cobrem formatCurrency/calcPersTotal/formatCNPJ e o bloqueio de `draft` no sync; ficam descobertos os ~100 casos restantes: semântica do envelope da Edge (`ok` como sucesso, e nunca tratar `{ok:false}`/`{ok:'true',success:1}` como sucesso), bloqueio antes de qualquer operação externa com `quote.id` vazio, parada sem empresa quando o CRM falha ou não responde, guarda de itens vazios, aviso…
- ação: portar reapontando `@/pages/quote-view/QuoteActionHandlers` e `@/pages/quote-view/QuoteBitrixSync` -> `@/pages/quotes/quote-view/...`; priorizar o bloco do envelope da Edge e o `sync_error`, e descartar os casos de bloqueio de `draft` já cobertos pelo fuzz do main
- refutação falhou porque: Procurei no main por símbolos (syncQuoteToBitrix, buildWhatsAppUrl, handleDownloadPDF, selectCrmById, sync_error, sync_success, pdfUrl), pelos textos de UI do sync ("não possui um vínculo", "da sincronização") e por qualquer teste que importe QuoteBitrixSync — e NÃO achei cobertura. (1) `QuoteBitrixSync.syncQuoteToBitrix` não tem nenhum teste no main: o único arquivo de teste que cita o símbolo é `src/hooks/quotes/__tests__/useQuotes.test.ts:61`, que só o mocka (`syncQuoteToBitrix: vi.fn().mock…

### `ci-freight-quality.yml` (em .github/workflows/ da branch, ausente do main)

- branch: `origin/salvo/importado-vps-fabrica-v2-refazer-dc12be92-261116`
- por quê é gap: O E2E foi para e2e-freight.yml (cujo cabecalho :4-6 cita "ci-freight-quality (se tiver specs playwright)") e os testes unit/integration/fuzz de freight-quest rodam via `npm run test:quality` (ci.yml:107). MAS os dois gates bloqueantes de cobertura ficaram orfaos no main: `scripts/check-critical-path-coverage.mjs` (job "Freight Unit Tests + Coverage", linha 48 da branch) e `scripts/check-edge-integration-coverage.mjs` (job "Edge Coverage Gate (>=60%)", linha 98) existem no repo main mas `git grep` nao encontra nenhum workflow nem script de package.json que os chame — o main usa scripts DIFERENTES (`check:critical-coverage` -> scripts/test-critical-coverage.mjs, package.json:234; `check:edge-…
- ação: Religar os dois gates de cobertura no main (um passo `node scripts/check-critical-path-coverage.mjs` e outro `node scripts/check-edge-integration-coverage.mjs`, p.ex. em deploy-gates.yml ou edge-integration-all.yml) ou decidir explicitamente apagar os dois scripts orfaos.
- refutação falhou porque: Gap PARCIAL, mas real — não consigo refutar. (A) REFUTADO: o gate de edge coverage tem substituto MAIS ESTRITO no main. `origin/main:.github/workflows/edge-integration-all.yml:61` roda `npm run check:edge-live-coverage` -> `origin/main:package.json:224` -> `scripts/check-edge-live-coverage.mjs`, que exige 100% das edge functions com teste live chamando `runLiveSuite` (exit 1 listando faltantes), contra os 60% por substring de `check-edge-integration-coverage.mjs`. Perder esse job não perde cobe…

### `quoteBitrixId.ts` (em recovery/src-legacy/src/pages/quote-view/ da branch, ausente do main)

- branch: `origin/salvo/claude-fix-pr3517-gate1-baseline-261113-2336`
- por quê é gap: normalizeBitrixQuoteId valida o id do Bitrix com regra mais forte do que o main: exige dígitos (/^\d+$/), remove zeros à esquerda, e só aceita Number.isSafeInteger(value) && value > 0, devolvendo null caso contrário. O main normaliza em src/pages/quotes/quote-view/QuoteBitrixSync.ts:144-146 apenas com `Number(result.quote_id)` + `!isNaN(...)` + String(...), e grava em bitrix_quote_id na linha :152 — ou seja aceita valor fracionário ('1.5'), negativo e inteiro acima de Number.MAX_SAFE_INTEGER. Não há função equivalente em nenhum arquivo vivo do main (git grep normalizeBitrix em src só acha src/components/admin/connections/secretNormalizers.ts, assunto diferente).
- ação: Endurecer a normalização em src/pages/quotes/quote-view/QuoteBitrixSync.ts:144-146 com a regra de normalizeBitrixQuoteId (apenas inteiro seguro positivo, sem zeros à esquerda; null fora disso). Copiar do gêmeo quoteBitrixId.ts (em src/pages/quote-view/ da branch) em origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252 (blob idêntico), não deste caminho de quarentena.
- refutação falhou porque: Não existe equivalente no main: nenhum arquivo quoteBitrixId*, nenhuma função que valide o id do Bitrix (git grep normalizeBitrix em origin/main só acha secretNormalizers.ts, webhook/domínio), nenhum Number.isSafeInteger aplicado a quote_id do CRM, e o caminho vivo (src/pages/quotes/quote-view/QuoteBitrixSync.ts:144-152 e QuoteActionHandlers.ts:178-187) segue com Number()+!isNaN(), aceitando '1.5', negativos e acima de MAX_SAFE_INTEGER. A edge sync-quote-bitrix valida só company_id, e o banco d…

### `useCustomKitPersistence.financial.test.tsx` (em recovery/src-legacy/tests/hooks/ da branch, ausente do main)

- branch: `origin/salvo/claude-fix-pr3517-gate1-baseline-261113-2336`
- por quê é gap: Testa hook VIVO no main (src/hooks/kit-builder/useCustomKitPersistence.ts, conforme tabela 'Os 26 módulos' de VEREDITO-52-TESTES-LEGACY-261116.md) em asserções financeiras (preço/dono do kit). Medição do dono: 3 testes, 1 passando. Os testes do main para esse hook (tests/hooks/useCustomKitPersistence.account.test.tsx e .pin-order.test.tsx) não cobrem o ângulo financeiro.
- ação: Reescrever imports para src/hooks/kit-builder/useCustomKitPersistence.ts e trazer o verde; investigar os 2 vermelhos. Portar do gêmeo useCustomKitPersistence.financial.test.tsx (em tests/hooks/ da branch) em origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252 (blob idêntico), não deste caminho.
- refutação falhou porque: Não achei no main nenhum teste que cubra o ângulo financeiro na camada de persistência. A guarda existe viva em src/lib/kit-builder/persistence.ts:107 (`if (!hasKnownKitPrices(kitState)) throw new Error(KIT_UNKNOWN_PRICE_MESSAGE)`), chamada pelo hook vivo src/hooks/kit-builder/useCustomKitPersistence.ts (buildKitPersistencePayload no saveMutation, linha ~104), e nenhum teste do main a exercita: `grep -rn "priceKnown" tests/` só retorna financial-availability.test.ts (em tests/components/kit-builder/ da branch)…

### `useKitBuilderPageState.legacy.test.tsx` (em recovery/src-legacy/tests/hooks/ da branch, ausente do main)

- branch: `origin/salvo/claude-fix-pr3517-gate1-baseline-261113-2336`
- por quê é gap: 31 testes, 0 passando hoje (VEREDITO-52-TESTES-LEGACY-261116.md: é o maior dos 9 que 'falham 100%'), mas o hook alvo está VIVO em src/hooks/kit-builder/useKitBuilderPageState.ts. O próprio doc classifica esse grupo como 'carrega e roda, mas nenhuma asserção passa. É o grupo que exige leitura caso a caso antes de qualquer decisão' — não há base para chamar de obsoleto, e 31 asserções sobre o estado do kit builder podem indicar deriva de comportamento da main.
- ação: Ler caso a caso os 31 testes contra src/hooks/kit-builder/useKitBuilderPageState.ts e decidir, por teste, se o teste está velho ou se a main regrediu. Fazer isso a partir do gêmeo useKitBuilderPageState.legacy.test.tsx (em tests/hooks/ da branch) em origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252 (blob idêntico), não deste caminho.
- refutação falhou porque: Procurei e NÃO achei na main cobertura equivalente para a maior parte do arquivo. O hook alvo está vivo (src/hooks/kit-builder/useKitBuilderPageState.ts, 545 linhas) e a main só tem 3 testes dele: route.test.ts (apenas a função pura isKitMakerLandingRoute, 1 caso), snapshot.test.tsx (3 casos de hidratação) e quantity.test.tsx (9 casos de quantidade nula + roundtrip de metadados). Os dois últimos describes do legacy ('Raw NULL draft quantity...' e 'Hydrated controller roundtrip preserves nested …

### `useLegacyLintDerived.test.tsx` (em recovery/src-legacy/tests/hooks/ da branch, ausente do main)

- branch: `origin/salvo/claude-fix-pr3517-gate1-baseline-261113-2336`
- por quê é gap: 4 testes, 2 passando (VEREDITO-52-TESTES-LEGACY-261116.md, tabela 'Por arquivo'). Alvos vivos no main: useColorEnrichment (src/hooks/products/useColorEnrichment.ts, conforme tabela 'Os 26 módulos') e useVariantStock/stockFetcher. Não há teste equivalente de useColorEnrichment no main (grep por ColorEnrichment em paths de teste do main: nenhum).
- ação: Reescrever imports para src/hooks/products/useColorEnrichment.ts e trazer os 2 verdes; investigar os 2 vermelhos. Portar do gêmeo useLegacyLintDerived.test.tsx (em tests/hooks/ da branch) em origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252 (blob idêntico), não deste caminho.
- refutação falhou porque: Procurei e NÃO achei cobertura equivalente no main: nenhum teste do main renderiza useColorEnrichment nem useVariantStock — só mockam. Os alvos estão vivos no main (src/hooks/products/useColorEnrichment.ts, src/hooks/products/useVariantStock.ts), logo é gap de cobertura real. Ressalva forte, porém: o arquivo está obsoleto COMO ESTÁ e não roda contra o main — (a) está sob recovery/, que não entra no include do vitest (vitest.config.ts:64-72, idêntico em main e na branch), então nunca é coletado;…

### `useMagicUpState.legacy.test.tsx` (em recovery/src-legacy/tests/hooks/ da branch, ausente do main)

- branch: `origin/salvo/claude-fix-pr3517-gate1-baseline-261113-2336`
- por quê é gap: 9 testes, 8 passando contra a main atual — a melhor taxa da leva depois dos 2 já mergeados (VEREDITO-52-TESTES-LEGACY-261116.md, tabela 'Por arquivo'). Hook vivo em src/hooks/intelligence/useMagicUpState.ts (tabela 'Os 26 módulos'); o único teste do main para ele é tests/hooks/useMagicUpState.brandkit.test.tsx, de outro escopo.
- ação: Prioridade do grupo: reescrever imports para src/hooks/intelligence/useMagicUpState.ts e trazer os 8 verdes como regressão. Portar do gêmeo useMagicUpState.legacy.test.tsx (em tests/hooks/ da branch) em origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252 (blob idêntico), não deste caminho.
- refutação falhou porque: NÃO consegui refutar por completo: procurei no main (grep por initialProductsLoaded, isOgImage, loadingColors, handleUseBrandLogo, productImages, product_variants em tests/) e NÃO existe no main nenhum teste que exercite o miolo do hook vivo src/hooks/intelligence/useMagicUpState.ts (busca com debounce 300ms, resposta fora-de-ordem, mapeamento de product_images/product_variants). Os únicos testes de MagicUp em tests/pages/ mockam o hook inteiro (tests/pages/MagicUp.a11y.test.tsx:42-43 `vi.mock(…

### `useQuoteTemplates.copy-preservation.test.ts` (em recovery/src-legacy/tests/hooks/ da branch, ausente do main)

- branch: `origin/salvo/claude-fix-pr3517-gate1-baseline-261113-2336`
- por quê é gap: 40 testes, 24 passando contra a main atual (VEREDITO-52-TESTES-LEGACY-261116.md, tabela 'Por arquivo' — 5o melhor da leva). Já importa o caminho vivo @/hooks/quotes/useQuoteTemplates (src/hooks/quotes/useQuoteTemplates.ts) além do plano; o único teste do main para o hook é src/hooks/quotes/__tests__/useQuoteTemplates.test.ts, bem menor.
- ação: Reescrever o import plano para src/hooks/quotes/useQuoteTemplates.ts e trazer os 24 verdes como regressão de cópia de template; triar os 16 vermelhos. Portar do gêmeo useQuoteTemplates.copy-preservation.test.ts (em tests/hooks/ da branch) em origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252 (blob idêntico), não deste caminho.
- refutação falhou porque: Gap real de cobertura. O hook vivo src/hooks/quotes/useQuoteTemplates.ts implementa duplicateTemplate (:364, nome "(Cópia)" em :376), cloneTemplateToSeller (:401, nome "(Clonado)" em :423, guard "O vendedor não terá acesso à cópia" em :427, toast "Template clonado" em :445), createTemplate (:214), mas NENHUM teste do main exercita esses caminhos: busca em todos os *.test.ts/*.test.tsx/*.spec.ts (excluindo recovery/) por cloneTemplateToSeller|duplicateTemplate|"Template clonado"|"não terá acesso…

### `root-quote-helpers.test.ts` (em recovery/src-legacy/tests/pages/quote-view/ da branch, ausente do main)

- branch: `origin/salvo/claude-fix-pr3517-gate1-baseline-261113-2336`
- por quê é gap: O maior arquivo da leva: 123 testes, 27 passando contra a main atual (VEREDITO-52-TESTES-LEGACY-261116.md, tabela 'Por arquivo'). Cobre QuoteActionHandlers (vivo em src/pages/quotes/quote-view/QuoteActionHandlers.ts) e QuoteBitrixSync (vivo em src/pages/quotes/quote-view/QuoteBitrixSync.ts) — e QuoteBitrixSync NÃO tem nenhum teste no main (grep por QuoteBitrixSync em paths de teste do main: nenhum), apesar de gravar bitrix_quote_id em produção (QuoteBitrixSync.ts:152). As 96 falhas são o maior bloco de deriva potencial da leva.
- ação: Prioridade: reescrever imports para src/pages/quotes/quote-view/ e trazer os 27 verdes, cobrindo em especial QuoteBitrixSync (hoje sem teste); depois triar as 96 falhas junto com a normalização de bitrix_quote_id (ver quoteBitrixId.ts (em recovery/src-legacy/src/pages/quote-view/ da branch)). Portar do gêmeo root-quote-helpers.test.ts (em tests/pages/quote-view/ da branch) em origin/salvo/codex-fix-gate1-kit-pdf-types-261109-22…
- refutação falhou porque: Gap parcialmente real. Procurei em TODOS os arquivos de teste do origin/main por `syncQuoteToBitrix|QuoteBitrixSync` e NAO achei cobertura do modulo `src/pages/quotes/quote-view/QuoteBitrixSync.ts`, que esta vivo (importado em useQuoteViewData.ts:277 e :323) e grava `bitrix_quote_id` em producao. O unico hit e `src/hooks/quotes/__tests__/useQuotes.test.ts:61,146`, que mocka o `syncQuoteToBitrix` do HOOK (`src/hooks/quotes/useQuotes.ts:338`) — funcao diferente. `tests/edge-functions/live/sync-qu…

## Os 33 gaps refutados (ficam fechados)

| arquivo | por que não é gap |
|---|---|
| `20261101000001_security_invoker_views_p06.sql` (em supabase/migrations/ da branch, ausente do main) | Não é gap real: é abordagem superada/rejeitada do mesmo item (P06 / A-V01). O main já carrega a adjudicação posterior e medida desse achado em supabase/migrations/20261117073000_p06_security_invoker_v_product_properties_public.sql, que (a) aplica security_invoker=true na única view onde a troca não… |
| `20261101000001_rollback.sql` (em supabase/rollbacks/ da branch, ausente do main) | Não é gap: é o rollback de uma migration que o main REJEITOU de propósito, com medição em produção, e cujo substituto já está no main com rollback próprio. O arquivo é obsoleto. 1) O main documenta a rejeição explícita do P06 e aponta a própria branch como arquivo morto: supabase/MIGRATIONS_SYNC_LO… |
| `legacy-admin-utils-preservation.test.ts` (em tests/hooks/ da branch, ausente do main) | Os 46 casos são obsoletos: 45 deles afirmam a API plana aposentada (`recovery/src-legacy/`), não o código vivo da `main`. (1) `useRamoAtividadeFilter`: o teste usa `setSearchTerm`, `filteredSegmentos`, `activeFiltersCount`, `clearRamoFilters`, `clearSegmentoFilters` e `clearFilters` — NENHUM existe… |
| `useKitAutoSave.financial.test.tsx` (em tests/hooks/ da branch, ausente do main) | Arquivo é OBSOLETO: testa um hook que o main removeu. O teste importa `@/hooks/useKitAutoSave` (título do describe: "Legacy autosave") e chama `useKitAutoSave(state, 1, undefined)` com 3 argumentos. Em origin/main esse módulo não existe mais em src/ — foi movido para recovery/src-legacy/src/hooks/u… |
| `useKitAutoSave.legacy.test.tsx` (em tests/hooks/ da branch, ausente do main) | A alegação erra o alvo. O arquivo não testa o hook vivo: ele importa `@/hooks/useKitAutoSave` (hook legado), e esse caminho NÃO existe mais em `main` — foi movido para `recovery/src-legacy/src/hooks/useKitAutoSave.ts` pelo commit 5dd9b949d ("chore(repo): move 316 arquivos obsoletos da #3361 de src/… |
| `useKitBuilderPageState.financial.test.tsx` (em tests/hooks/ da branch, ausente do main) | A premissa "alvo vivo src/hooks/kit-builder/useKitBuilderPageState.ts" é falsa: o teste importa o controller LEGADO `@/hooks/useKitBuilderPageState`, que não existe no main. O arquivo não compila contra o main e 4 das 5 asserções dependem de API/feature que o controller vivo não tem (meta.pricesKno… |
| `useLegacyLintMemoContracts.test.tsx` (em tests/hooks/ da branch, ausente do main) | Não é gap real: o arquivo é obsoleto (escrito contra a estrutura de hooks pré-reorganização e inexecutável em main) e as 3 funções alegadas já estão cobertas em main. (1) Todos os vi.mock/imports usam caminhos planos que não existem mais em main (@/hooks/useSearch, @/hooks/useCatalogState, @/hooks/… |
| `useQuoteVersions.legacy.test.ts` (em tests/hooks/ da branch, ausente do main) | Arquivo obsoleto: afirma o contrato do hook legado (sem coerção de null), que a main substituiu deliberadamente. O hook vivo `/home/user/Promo_Gifts_V4/src/hooks/quotes/useQuoteVersions.ts:85-94` normaliza no map (`status: v.status ?? 'draft'`, `total/subtotal/discount_* ?? 0`, `created_at/updated_… |
| `legacy-KitBuilder.partial-preservation.test.tsx` (em tests/pages/ da branch, ausente do main) | A alegação é factualmente falsa no ponto central. O grep que ela apresenta como vazio retorna resultados: `tests/components/pages/KitBuilderPage.test.tsx` no main já cobre os três estados 1:1, com os mesmos asserts. Além disso o arquivo da branch importa módulos que não existem no main (`@/pages/Ki… |
| `legacy-QuoteBuilder.partial-preservation.test.tsx` (em tests/pages/ da branch, ausente do main) | Não é gap real: o teste só compila contra a página legada (todos os módulos que ele importa/mocka estão AUSENTES no main: QuoteBuilderPage.tsx (em src/pages/ da branch), useQuoteBuilderState.ts (em src/hooks/ da branch), QuoteTemplateSelector, SaveAsTemplateButton, DraggableQuoteItems) e exercita `QuoteAutoSave.onRestore`, prop q… |
| `cart-header-quality-gate.yml` (em .github/workflows/ da branch, ausente do main) | REFUTADO nos dois itens. (b) `rls-integration` — o job da branch nunca executou as asserções e, se restaurado, QUEBRA o main. Os segredos exigidos não existem no repo: `github_list_actions_secrets` (adm01-debug/Promo_Gifts_V4) devolve 25 segredos e NENHUM é `TEST_SELLER_A_JWT`/`TEST_SELLER_B_JWT` (… |
| `quality-gate.yml` (em .github/workflows/ da branch, ausente do main) | O arquivo foi apagado por eb2d7aec2 e seus gates foram absorvidos por deploy-gates.yml/ci-security-drift.yml/ci.yml, como a própria alegação reconhece. O único item alegado como perdido — o ratchet `as any` de scripts/check-any-type-baseline.mjs ter deixado de ser bloqueante em PR — NÃO é gap real:… |
| `useAutoSaveQuote.legacy.test.ts` (em recovery/src-legacy/src/hooks/__tests__/ da branch, ausente do main) | Os 3 "casos não cobertos" não são gap: nenhum deles descreve o comportamento do hook vivo no main — todos CONTRADIZEM o main, exatamente como a alegação já admitia só do 3º bloco. Portei os 3 casos contra `src/hooks/quotes/useAutoSaveQuote.ts` do main e os 5 testes falharam (saída abaixo). Causa ra… |
| `IntelligenceBadges.legacy-compat.test.tsx` (em recovery/src-legacy/tests/components/ da branch, ausente do main) | REFUTADO: a main já tem bateria própria sobre exatamente este componente, e a parte do arquivo que não está coberta é contrato que a main NÃO cumpre (quebra), não contrato "cumprido e não testado". 1) Já existe no main: `src/components/common/__tests__/IntelligenceBadges.adversarial.test.tsx` (20 b… |
| `supplier-trust-demo.ts` (em recovery/src-legacy/tests/fixtures/ da branch, ausente do main) | A premissa da alegação é falsa em três pontos verificados. (1) O teste que a fixture supostamente habilita JÁ ESTÁ NA MAIN: `tests/hooks/device-and-supplier-trust.contract.test.ts` existe em `main` (217 linhas, 2 describes, 24 testes) e foi resgatado exatamente da mesma linhagem (`codex/fix-gate1-k… |
| `legacy-admin-utils-preservation.test.ts` (em recovery/src-legacy/tests/hooks/ da branch, ausente do main) | A premissa da alegação é falsa: os quatro hooks ditos ausentes existem no main em src/, apenas reorganizados em src/hooks/crm/ e src/hooks/products/, exportados e consumidos por componentes de produção. O arquivo de teste importa de caminhos legados (@/hooks/useCategoryIcons, @/hooks/useRamoAtivida… |
| `useCustomKitPersistence.legacy.test.tsx` (em recovery/src-legacy/tests/hooks/ da branch, ausente do main) | A alegação é factualmente falsa no ponto que a sustenta: o arquivo NÃO tem 6 testes passando contra a main. Ele importa `@/hooks/useCustomKitPersistence`, módulo que não existe na main (o hook vive em `src/hooks/kit-builder/useCustomKitPersistence.ts`; não há `index.ts` (em src/hooks/ da branch, ausente do main) nem `src/hooks/use… |
| `useKitAutoSave.financial.test.tsx` (em recovery/src-legacy/tests/hooks/ da branch, ausente do main) | Arquivo é obsoleto e a função que ele exerce já está no main. 1) O teste não testa o hook vivo: ele importa `@/hooks/useKitAutoSave` (linha 19 do arquivo da branch) e mocka `supabase.from().insert()/update()` direto. No main, `@` → `./src` (vitest.config.ts:162) e `useKitAutoSave.ts` (em src/hooks/ da branch, ausente do main) NÃO … |
| `useKitAutoSave.legacy.test.tsx` (em recovery/src-legacy/tests/hooks/ da branch, ausente do main) | A alegação é factualmente falsa: o arquivo não roda 21 testes com 13 passando contra a main — ele roda ZERO testes, porque importa um módulo que não existe na main. Executei o arquivo da branch salvo contra a main atual e a suíte falha no import, antes de qualquer teste. Além disso, ele testa o con… |
| `useKitBuilderPageState.financial.test.tsx` (em recovery/src-legacy/tests/hooks/ da branch, ausente do main) | A alegação só compara com os 3 testes `useKitBuilderPageState.{quantity,route,snapshot}` e omite que o main TEM um arquivo dedicado ao ângulo financeiro: `tests/components/kit-builder/financial-availability.test.tsx` (9 testes), que cobre item/caixa sem preço selecionáveis, ausência de "R$ 0,00" fa… |
| `useKitBuilderQueries.legacy.test.tsx` (em recovery/src-legacy/tests/hooks/ da branch, ausente do main) | As 4 asserções verdes do arquivo legacy têm equivalente 1:1 na main (tests/hooks/useKitBuilderQueries.test.ts + .contract.test.ts + useKitBuilderTransformers.test.ts); as 2 vermelhas testam `itemQueryError`, campo que o hook da main nunca expôs (retorna `itemError: string|null`), logo são obsoletas… |
| `useLegacyCatalogContracts.test.ts` (em recovery/src-legacy/tests/hooks/ da branch, ausente do main) | A alegação central é falsa: o arquivo nao roda contra a main. Executado de fato (copiado para src/ e rodado com npx vitest run na main 5d46a2ce6), resultado: "0 test" / "Tests no tests", com "Failed to resolve import '@/hooks/useProductsLightweight'". Os 5 caminhos de hook que ele importa nao exist… |
| `useLegacyLintFilters.test.ts` (em recovery/src-legacy/tests/hooks/ da branch, ausente do main) | A premissa da alegação é falsa: o main JÁ tem teste dedicado para useProductsByColor (10 casos) e para useProductsByCategory (12 casos), ambos contra os hooks vivos em src/hooks/products/. Além disso, o arquivo da branch importa caminhos que não existem no main ('@/hooks/useProductsByCategory' e '@… |
| `useLegacyLintLifecycle.test.ts` (em recovery/src-legacy/tests/hooks/ da branch, ausente do main) | O arquivo é obsoleto: testa as cópias LEGADAS (layout plano pré-reorganização) que vivem em recovery/src-legacy, não os hooks vivos do main, e não é nem coletado pelo Vitest. (1) Todos os 5 imports apontam para caminhos que NÃO existem no main: `@/hooks/useAdvancedFilters`, `@/hooks/useProductBound… |
| `useLegacyLintMemoContracts.test.tsx` (em recovery/src-legacy/tests/hooks/ da branch, ausente do main) | Alegação inflada e arquivo obsoleto: os "~20 hooks" são 17 vi.mock de caminhos inexistentes no main (hooks migraram para @/hooks/common, @/hooks/products, @/hooks/favorites), o que explica 25/31 falhando; os 3 sujeitos reais (useSearch, useProductMatch, useCatalogState) já têm testes dedicados no m… |
| `useMockupDraft.legacy.test.ts` (em recovery/src-legacy/tests/hooks/ da branch, ausente do main) | Não é gap real: (1) o arquivo NÃO roda e nunca rodou — importa `@/hooks/useMockupDraft` (linha 13), e o alias `@` aponta para ./src (vitest.config.ts:162), mas `useMockupDraft.ts` (em src/hooks/ da branch, ausente do main) não existe nem no main nem na própria branch salvo (`git cat-file -e` falha nos dois); o hook vivo é `src/hoo… |
| `useQuoteTemplates.legacy.test.ts` (em recovery/src-legacy/tests/hooks/ da branch, ausente do main) | Não há "parte viva" no arquivo. (1) O sujeito do teste é o adaptador legacy `@/hooks/useQuoteTemplates` (linha 3), que em main não existe em src/ — `@` resolve para ./src (vitest.config.ts:162) e `useQuoteTemplates.ts` (em src/hooks/ da branch, ausente do main) não existe em origin/main; a única implementação é recovery/src-legacy… |
| `useQuoteTemplates.raw-fetch.test.ts` (em recovery/src-legacy/tests/hooks/ da branch, ausente do main) | Ângulo alegado (fetch cru: select/order/limit contra o Supabase) JÁ está coberto no main, de forma mais estrita que no legacy; e o restante do arquivo valida um DTO obsoleto (items_data/items_error) que não existe nem no hook do main nem na tabela de produção. O 0/3 vem de import quebrado (@/hooks/… |
| `useQuoteVersions.legacy.test.ts` (em recovery/src-legacy/tests/hooks/ da branch, ausente do main) | Não é gap real: o arquivo é teste do hook LEGACY deletado, e sua asserção central contradiz de propósito o contrato do código vivo. (1) Os "0 passando" vêm do import morto `@/hooks/useQuoteVersions` — caminho inexistente em src/; o hook vivo é src/hooks/quotes/useQuoteVersions.ts e o antigo só sobr… |
| `legacy-kit-price-source.test.ts` (em recovery/src-legacy/tests/lib/ da branch, ausente do main) | A regra financeira da fonte do preço do kit já está viva e testada no main, e o arquivo da branch testa um contrato rejeitado contra o caminho legado. (1) Fonte do preço: src/hooks/kit-builder/useKitBuilderTransformers.ts:27 resolveProductPrice = sale_price ?? base_price, só finito e >= 0; fail-clo… |
| `legacy-KitBuilder.partial-preservation.test.tsx` (em recovery/src-legacy/tests/pages/ da branch, ausente do main) | Os 5 comportamentos do teste legacy já estão cobertos no main por testes que rodam contra a página viva (src/pages/kit-builder/KitBuilderPage.tsx), e o mecanismo que o teste legacy afirma (PDF via downloadKitPDF de @/utils/kitPdfGenerator) foi substituído no main por window.print(), além de o impor… |
| `legacy-MagicUp.search-lifetime.test.tsx` (em recovery/src-legacy/tests/pages/ da branch, ausente do main) | O main já tem exatamente esses 2 testes, migrados para os caminhos vivos e PASSANDO: /home/user/Promo_Gifts_V4/tests/pages/MagicUp.search-lifetime.test.tsx. Os corpos dos dois `it(...)` são byte-a-byte idênticos ao arquivo alegado da branch salvo — mesmos nomes ("keeps the existing editor mounted w… |
| `legacy-QuoteBuilder.partial-preservation.test.tsx` (em recovery/src-legacy/tests/pages/ da branch, ausente do main) | A alegação está errada em três pontos. (1) O teste não aponta para a tela viva: ele importa `@/pages/QuoteBuilderPage` e mocka `@/hooks/useQuoteBuilderState`, `@/hooks/useUnsavedChangesGuard`, `@/components/quotes/DraggableQuoteItems` — nenhum desses caminhos existe em `src/` do main (a página viva… |

## Migrations: medidas contra o banco de produção

Das 35 migrations ausentes do `main`:

- **31** têm a MESMA versão (timestamp) já no `main`, com outro nome de arquivo. O ledger
  `supabase_migrations.schema_migrations` registra a versão, então o que rodou em produção foi o
  arquivo do `main`. Colisão de versão, não perda.
- **4** o `main` não tem de forma alguma e não constam aplicadas em produção:
  `20261101000001`, `20261101150000`, `20261108020000`, `20261110024530`.
  - `20261110024530_restore_device_trust_contract.sql`: substituída pela `20261114031000` do `main`;
    `user_known_devices.is_trusted` existe em produção.
  - `20261101000001_security_invoker_views_p06.sql` e seu rollback: **refutados** na segunda rodada —
    o efeito está vivo no catálogo de produção.

## Feature de templates de orçamento: decisão publicada, não perda

Os arquivos que no `main` só existem em `recovery/src-legacy/` incluem a feature inteira de templates
de orçamento. Não é trabalho perdido:

- `src/routes/quote-routes.tsx:17-26` — a rota `/orcamentos/templates` foi removida de propósito e
  virou redirect para `/orcamentos`;
- `recovery/src-legacy/README.md` — são cópias do layout pré-reorganização, inalcançáveis de
  `src/main.tsx`, postas em quarentena porque derrubavam o `Gate 1` com 360 erros de TS;
- produção: `public.quote_templates` com **0 linhas** e **0 vendedores** — ninguém usou, não há dado órfão.

Resíduo real: `src/hooks/quotes/useQuoteTemplates.ts` está vivo no `main` com **zero consumidores**
(só ele e o próprio teste). É código morto, não regressão. Reintroduzir a feature é decisão de produto.

## O que isto autoriza

Para os 167 arquivos com veredito **incorporado** ou **obsoleto**, e para os 33 gaps refutados, a
branch que os contém pode ser fechada sem perda — a prova está nas linhas acima.
Os 19 gaps confirmados precisam ser portados antes, ou aceitos como descarte consciente pelo dono.

