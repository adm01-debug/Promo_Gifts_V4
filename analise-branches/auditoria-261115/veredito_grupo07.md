# Veredito — grupo 07 (13 branches apagadas do GitHub, commits ainda no clone local)

Método: `merge-base` → `git log`/`git diff --stat` → leitura do diff real de cada arquivo de
produção → busca do símbolo equivalente em `origin/main` (`git show origin/main:<arquivo>`,
`git grep <símbolo> origin/main`). Byte a byte via `diff <(git show main:f) <(git show sha:f)`
onde o arquivo existia nos dois lados.

**Resultado: 12 INCORPORADA, 1 DESCARTAR, 0 APROVEITAR, 0 DECISAO_HUMANA.**
Nenhuma das 13 branches contém código de produção ausente da `main`. Em 8 casos a `main` está
numa versão **mais evoluída** que a branch (listado abaixo caso a caso).

---

## 1. `importado/vps-fabrica/v2/n44-2610082249` (f735f856d5) — INCORPORADA
Remoção do componente morto `KeyboardShortcutsHint` (painelzinho de ajuda de teclado sem nenhum
importador) + teste de guarda.
- `origin/main:src/components/mockup/KeyboardShortcuts.tsx` tem 44 linhas e um único export,
  `useKeyboardShortcuts` (linha 17) — o `KeyboardShortcutsHint` já não existe lá.
- `origin/main:src/components/mockup/__tests__/KeyboardShortcuts.dead.test.tsx:70`
  (`expect(exported).not.toContain('KeyboardShortcutsHint')`) — a `main` tem o teste e **mais**
  um `describe` inteiro ("atalhos destrutivos removidos (Esc, Ctrl+R, Ctrl+D)") que a branch
  não tem.

## 2. `claude/feat-ft088-front-fits-261108-2300` (25fe2ed1dd) — INCORPORADA
FT-088: valida pela RPC `fn_check_item_fits` se os itens cabem na embalagem antes de criar o
orçamento do kit.
- `origin/main:src/pages/kit-builder/useKitBuilderQuote.ts:23` (import) e `:409-415`
  (`validateKitFitsForQuote` + `KitQuoteValidationError`) — bloco **idêntico** ao da branch.
- `origin/main:src/hooks/kit-builder/useKitFitsValidation.ts` é **superset**: acumula volume por
  quantidade (`qty`, `lineVolume`) e preserva o fail-open de `fits === null`
  (`row.fits === false || (qty > 1 && row.fits !== null && ...)`). A branch só tem
  `if (row.fits === false)`. O "fix: null-fits não deve violar fail-open" da branch está coberto.
- Migration da função já na `main`: `supabase/migrations/20261108030200_ft088_fn_check_item_fits.sql`.

## 3. `claude/fix-calculadora-inline-add-orcamento-261112-1303` (34aa1ea781) — INCORPORADA
O botão "Adicionar N un ao Orçamento" da calculadora de preços do produto não fazia nada; passa a
levar quantidade e preço unitário para `/orcamentos/novo`.
- `origin/main:src/components/products/inline-price/QuantityCalculator.tsx:19,32,86,90,148,152`
  (prop `onAddToQuote` + `onClick`), `InlinePriceCalculator.tsx:46,99,199,243`,
  `ProductQuickActions.tsx:45,105,234`.
- `origin/main:src/pages/products/product-detail/ProductDetailHero.tsx:668-687` — handler
  byte-idêntico ao da branch (monta `URLSearchParams` e navega para `/orcamentos/novo`).
- Testes na `main`: `src/components/products/inline-price/__tests__/QuantityCalculator.addToQuote.test.tsx`
  e `src/tests/B2BProductDetailFlow.test.tsx`.
- `.file-size-baseline.json` = baseline gerado (ruído).

## 4. `claude_pink/compassionate-keller-om34uo` (7d2a142d0d) — INCORPORADA
Adaptação do calendário ao `react-day-picker` v8→v10 (classNames, `Chevron`, `initialFocus`→`autoFocus`).
- `origin/main:package.json:381` já está em `"react-day-picker": "^10.0.2"`.
- `autoFocus` na `main` em todos os 6 arquivos da branch, nas linhas correspondentes:
  `McpKeysFilters.tsx:182,209`; `WidgetFiltersBar.tsx:123`; `NotificationDrawer.tsx:617`;
  `date-picker-field.tsx:204`; `AdminTelemetriaPage.tsx:515,543`; `QuoteBuilderPage.tsx:574`.
- `src/components/ui/calendar.tsx`: a `main` tem a versão **mais evoluída** — usa seletores de
  filho `[&>button]:` (com comentário explicando que no v10 as classes de modificador caem no
  `<td>` externo), enquanto a branch ainda usa `aria-selected:`. Nada da branch falta.
- `bundle-size-baseline.json` = baseline gerado (ruído); os 7 commits "re-trigger Deploy Gates"
  não têm conteúdo próprio.

## 5. `claude/fix-pr3283-beforeunload-restore-261109-0400` (020a401eaf) — INCORPORADA
FT-119: ao fechar a aba com alterações pendentes, o kit inteiro vai para o `localStorage` e é
restaurado de verdade na volta (antes só havia um snapshot sem estado completo).
- `origin/main:src/hooks/kit-builder/useKitAutoSave.ts:31` (`export interface BackupFullState`),
  `:354` (monta `fullState` no `beforeunload`), `:371`, `:395-419` (`consumeUnloadBackup` com
  `fullState?`). A `main` tem **a mais** um `rePersistBackup` (`:64`) para navegação entre kits.
- `origin/main:src/hooks/kit-builder/useKitBuilderPageState.ts:448-466` (`restoreFromBackup`) e
  `:18` (`type BackupFullState`).
- `origin/main:src/pages/kit-builder/KitBuilderPage.tsx:67,74,95,110,112,146` — fluxo de restore
  com `fullState`, inclusive o ramo de backup legado sem `fullState`.

## 6. `claude/infra-e2e-seller-secrets-261112-0215` (011a410dd3) — INCORPORADA
Repassar `E2E_SELLER_EMAIL`/`E2E_SELLER_PASSWORD` aos specs de vendedor nos workflows E2E.
(O indicador "0% de linhas na main" é falso-positivo de reescrita: a `main` escreve a mesma
variável com fallback, logo nenhuma linha bate textualmente.)
- `origin/main:.github/workflows/e2e-cart.yml:106-107` e
  `origin/main:.github/workflows/e2e.yml:81-82,92-93,118-119,147-148,171-172,225-226` —
  a `main` repassa os dois segredos em **7 pontos** (a branch, em 2) e ainda com fallback
  `|| secrets.E2E_USER_EMAIL` / `|| secrets.E2E_USER_PASSWORD`.
- Documentado em `origin/main:docs/ci/SEGREDOS.md:46-47`.
- Toca workflow/segredos, mas não vira DECISAO_HUMANA: nada se perde, a `main` já tem a versão
  mais ampla.

## 7. `importado/vps-fabrica/v2/fix-upload-de-logo-e-arte-com-mesmas-reg-2610081917` (59b02f2512) — INCORPORADA
Mesma regra de upload no seletor de arquivo e no arraste (JPG/PNG/WebP até 10 MB para logo),
dropzone acessível por teclado e trava contra envio concorrente.
- `origin/main:src/components/mockup/AreaCard.tsx:11-13` (`LOGO_ALLOWED_TYPES`,
  `LOGO_ALLOWED_EXTENSIONS`, `LOGO_MAX_BYTES`), `:18-23` (`validateLogoFile`), `:57` (uso no
  `handleFileChange`), `:166` e `:212` (`accept="image/png,image/jpeg,image/webp"`).
- `origin/main:src/components/mockup/ArtFileUpload.tsx:26` (`validateArtFile`), `:42-46`
  (`hasValidSignature`, assinatura `%PDF`), `:92,187,191,196` (`uploadingRef` — trava síncrona),
  `:108,113`, `:241-243` (`role="button"`, `aria-busy`).
- Teste na `main`: `src/components/mockup/__tests__/ArtFileUpload.test.tsx`.

## 8. `fix/kit-coverage-auth-20261031` (f92a16d336) — INCORPORADA
Autenticar o teste de integração de cobertura de kits com o usuário E2E (sem isso a bridge
responde como `anon` e o job falha).
- `origin/main:src/lib/external-db/kit-coverage.integration.test.ts:36-56` — exige
  `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` e faz `supabase.auth.signInWithPassword`; a `main` é
  **mais estrita** (checa também `authData.session`).
- `origin/main:.github/workflows/kit-coverage-integration.yml:47-48` — os dois env vars.
- Único resíduo não trazido: o `afterAll(() => supabase.auth.signOut({ scope: 'local' }))`
  (4 linhas de limpeza de um teste `describe.skipIf` que roda só em job dedicado). Não é código
  de produção e não muda comportamento do app — não justifica resgate.

## 9. `chore/e2e-calendar-baselines-261028-0016` (8e7212203a) — DESCARTAR
Mesma adaptação de calendário da branch #4 (código já incorporado e superado na `main`, mesmas
evidências do item 4) **mais** 8 PNGs de baseline visual do Playwright.
- Os PNGs são artefato gerado (`e2e/ui/calendar-visual.spec.ts-snapshots/*.png`) e a `main` já
  tem os seus próprios, regerados para a versão dela do `calendar.tsx`: dos 8, 2 são idênticos
  ao da branch (`calendar-mobile...png` blob `1321d511`, `calendar-scenario-feb-2025-28d...png`
  blob `90159d31`) e os outros 6 têm blob diferente tanto da base quanto da branch.
- Restaurar esta branch não devolve nenhum comportamento: só código já superado + snapshots
  obsoletos.

## 10. `claude/fix-health-view-backup-check-261101-2012` (3d001b07d9) — INCORPORADA
Arquivo de rollback da migration que tirou a tabela de backup apagada da view de saúde
`vw_system_health_quick`.
- Migration na `main`: `supabase/migrations/20261101201000_fix_health_view_backup_check.sql`.
- `origin/main:supabase/rollbacks/20261101201000_rollback.sql` existe e é **muito melhor**: traz
  o `CREATE OR REPLACE VIEW public.vw_system_health_quick` completo. O da branch é só um
  placeholder (`SELECT 'sem reversão automática: recriar a view a partir do SCHEMA_LIVE.sql'`).
- Não vira DECISAO_HUMANA: é arquivo de rollback versionado, não DDL aplicada, e a `main` já tem
  a versão boa.

## 11. `claude/fix-logo-remove-area-261114-2300` (e3dd35e657) — INCORPORADA
Remover o logo de uma área não deve apagar a análise de cores da área que está aberta.
A branch condiciona com `if (mg.activeArea?.id === areaId) mg.logoColorAnalysis.clearAnalysis()`.
- A `main` resolve o **mesmo bug com outra implementação, melhor**:
  `origin/main:src/pages/mockups/MockupGenerator.tsx:321-323` chama
  `mg.logoColorAnalysis.clearForArea(areaId)` (análise por área, via
  `useLogoColorAnalysisByArea`), em vez de testar a área ativa.
- `origin/main:src/tests/MockupDeletion.test.tsx:743-748` e `:777-784` documentam exatamente essa
  troca ("Desde 2026-11-15 a página… reintroduziria o bug") e guardam que a página **nunca**
  chame `clearAnalysis` direto — a abordagem da branch é a que foi deliberadamente substituída.

## 12. `claude/refuta-logo-remove-area-261115-0100` (7a62806ce6) — INCORPORADA
Duplicata exata da #11 (mesmo diff, mesmo blob `a038d7c7b` em `MockupGenerator.tsx`, só outro
merge-base). Mesmas evidências: `origin/main:src/pages/mockups/MockupGenerator.tsx:321-323`.

## 13. `claude/trem6-resgates-261115-0035` (a286138165) — INCORPORADA
Trem de 3 correções + entrada no ledger de coordenação. As três estão na `main`:
- Aviso ao salvar orçamento de kit sem cliente definido:
  `origin/main:src/pages/kit-builder/useKitBuilderQuote.ts:452-458` (`toast.warning('Orçamento
  salvo sem cliente definido…')`), com o placeholder em `:213`; teste
  `origin/main:src/pages/kit-builder/__tests__/useKitBuilderQuote.sem-cliente.test.tsx`; mock
  `warning` em `origin/main:tests/pages/kit-builder/useKitBuilderQuote.test.ts:24-29`.
- Export PDF do painel de orçamentos desabilitado em loading/erro:
  `origin/main:src/pages/quotes/QuotesDashboardPage.tsx:118-124`
  (`disabled={s.isLoading || Boolean(s.error)}`); teste
  `origin/main:src/pages/quotes/__tests__/QuotesDashboardPage.pdfDisabled.test.tsx`.
- Logo/área: a mesma correção das #11/#12, superada por `clearForArea` na `main`
  (`MockupGenerator.tsx:321-323`).
- `docs/coordenacao/conflitos-semanticos.md`: a entrada `claude/trem6-resgates-261115-0035` está
  na `main` (1 ocorrência).

---

### Ruído identificado (não conta como trabalho)
`.file-size-baseline.json`, `bundle-size-baseline.json`, os 8 PNGs de
`e2e/ui/calendar-visual.spec.ts-snapshots/`, e os commits de "re-trigger CI" / merge de `main`
sem conteúdo próprio.

### O que não foi verificado
Nada. Todos os 13 SHAs existem no clone e todos os arquivos de produção de cada diff foram lidos
e confrontados com `origin/main`.
