# Veredito — grupo02 (13 branches apagadas do GitHub, commits ainda no clone)

Método: `merge-base` + `git diff` real de cada arquivo de produção; cada bloco relevante
procurado na `origin/main` (inclusive implementação equivalente com outro nome), com
arquivo:linha. Banco canônico `doufsxqlfjyuvxuezpln` consultado em leitura para provar
estado de migration. Ruído (lockfile, snapshot de schema, dossiê .md, graphify-out) não
conta como trabalho.

Resumo: 8 INCORPORADA · 2 DESCARTAR · 3 DECISAO_HUMANA · 0 APROVEITAR.

---

## 1. claude_05/amazing-brahmagupta-0xhdur — `cfc23c5cd6` — DECISAO_HUMANA
Arquivos: `.github/workflows/ci-security-drift.yml`, `.github/workflows/deploy-gates.yml`,
`vitest.config.ts`, `PENDENCIAS.md`+`RELATORIO_CI.md` (ruído).

Já na main:
- exclusão de `tests/scripts/check-file-size-baseline.test.mjs` do Vitest → `vitest.config.ts:96-97`
- step `node --test .../check-file-size-baseline.test.mjs` → `.github/workflows/ci-security-drift.yml:126`

**Falta na main (só CI, nenhum código de app):**
1. Gate 1.8 — em `deploy-gates.yml` a main ainda usa `git ls-files` no `else`
   (`workflows/deploy-gates.yml:300-301`); a branch unifica `push` + `workflow_dispatch` em
   `git diff HEAD~1 HEAD`, para o dispatch manual não varrer o repo inteiro.
2. o mesmo step `node --test` no `deploy-gates.yml` (hoje existe só no ci-security-drift).

Decisão do dono porque é workflow de CI (Git 7). Risco de perder: baixo (ruído de gate em
dispatch manual), mas é a única coisa não incorporada desta branch.

## 2. importado/backup-20261028/codex/reconcile-local-github-supabase-20260922 — `4ddf017501` — INCORPORADA
37 arquivos; o grosso é ruído (`supabase/migrations-snapshot/*`, `docs/plans/*`, `types.ts`
de set/2026). Tudo o que era produção está na main:
- migration do signup: branch tinha `docs/db/proposals/20260922170000_signup_identity_safe_default.sql`
  (marcada "PROPOSTA, NAO APLICADA"); a main tem `supabase/migrations/20260922170000_signup_identity_safe_default.sql:1`
  ("APROVADA pelo PO em 2026-09-22").
- `scripts/simulate-signup-migration.mjs` e `scripts/validate-migration-target.mjs`: main é
  superconjunto (8 funções na cadeia vs 2; `validateLiveMigrationPooler` em
  `scripts/validate-migration-target.mjs:27-73`, ausente na branch).
- `db-apply-migration.yml`: `env MIGRATION_VERSION`/`SUPABASE_PROJECT_REF` → main `:53-54`;
  `validate-migration-target --version-only` → `:112`; `PGSSLMODE: require` → `:171,214`.
  O gate de `required_reviewers` da branch foi **substituído de propósito** na main pelo
  input obrigatório `approved_by` (E35) — ver `db-apply-migration.yml:10` e `:100-109`.
- base64 em snapshot concatenado: a exclusão de `ALL_IN_ONE.sql` está em
  `.github/workflows/deploy-gates.yml:304` (o `detect-base64-content.yml` que a branch
  editava não existe mais na main).
- cabeçalhos `-- Rollback:` das 11 migrations: presentes na main (checado 1 por arquivo).
- `types:generate:supabase` com `public,graphql_public` → `package.json:247`;
  `supabase.rpc('set_custom_kit_pinned')` sem cast → `src/hooks/kit-builder/useCustomKitPersistence.ts:183`;
  teste sem contagem fixa de 241 scripts → `scripts/__tests__/check-package-duplicate-scripts.test.ts:77`.

## 3. importado/vps-fabrica/v2/n33-2610082246 — `1f8ae6277e` — INCORPORADA
Branch criava `supabase/functions/generate-mockup/cors.ts` com lista própria de origens
porque `_shared/cors.ts` refletia **qualquer** `*.vercel.app`/`*.lovable.app`.
A main corrigiu a causa raiz no helper compartilhado (E093):
`supabase/functions/_shared/cors.ts:41-55` restringe o padrão a
`/^https:\/\/[\w-]+-juca1\.vercel\.app$/i` e ao UUID do projeto Lovable. O arquivo por
função deixou de fazer sentido (a main ainda tem o gate `scripts/check-no-inline-cors.mjs`,
que proíbe CORS inline em edge). Teste `generate-mockup.cors.test.ts` sem equivalente, mas
cobria só o helper descartado.

## 4. claude/chore-migration-supplier-rls-261108-2230 — `3ddfd97c65` — INCORPORADA
Branch: `supabase/migrations/20261027200000_supplier_stricker_rls_deny_all.sql` + rollback.
A main tem a versão **que a substitui**:
`supabase/migrations/20261027195959_supplier_stricker_rls_deny_all.sql:9` — "Esta versão
substitui 20261027200000, ainda pendente e nunca aplicada" — e é mais forte (policy
`AS RESTRICTIVE`), com `supabase/rollbacks/20261027195959_rollback.sql`.
Prova extra no banco de produção: `supplier_stricker` tem exatamente as 17 tabelas da lista
da main (`stg_colors`, `stg_customizations`, `stg_images`, `stg_product_types`); as 4 tabelas
que a branch listava (`config`, `failed_products`, `images`, `price_rules`) **não existem** —
a migration da branch falharia na própria pré-condição. Nenhuma das duas está aplicada ainda
(`relrowsecurity=false` nas 17), o que é pendência da main, não trabalho desta branch.

## 5. dependabot/npm_and_yarn/production-minor-patch-834f485c93 — `438ecd1d63` — DESCARTAR
Só `package.json` + `package-lock.json` (lockfile = ruído). Os 8 bumps estão **superados**
na main: `@elevenlabs/react ^1.21.1` (:323), `@tanstack/react-query ^5.106.1` (:356),
`@tanstack/react-virtual ^3.14.26` (:357), `hls.js ^1.7.4` (:367), `lucide-react 1.70.0`
(:374), `react-hook-form ^7.91.0` (:384), `react-router-dom ^7.18.5` (:387),
`rollup ^4.67.5` (:390) — todas ≥ às da branch.

## 6. importado/vps-fabrica/v2/n50-2610082250 — `0d4c726126` — INCORPORADA
Alvos de toque de 44px e texto ≥12px no histórico de mockups. Na main:
`src/components/ui/button.tsx:40` (`size="icon"` = `h-11 w-11 min-h-[44px] min-w-[44px]`),
`src/components/mockup/MockupHistoryPanel.tsx:183` (quebra de linha com `gap-2`),
`:634` e `:796` (`h-11 min-h-11 w-11 min-w-11`), `:511` e `:704` (checkbox chega a 44px por
`after:-inset-2.5`/`-inset-3` sem inflar os 24px visuais). Nenhum `text-[10px]`/`text-[9px]`
restou no arquivo. O teste `tests/components/mockup/MockupHistoryPanel.targets.test.tsx`
existe na main e, no seu próprio cabeçalho, registra que as ações do item e o checkbox são
cobertos por `MockupHistoryPanel.actions.test.tsx`.

## 7. claude/perf-catalogo-primeiro-load-261113-2350 — `c242653b89` — DECISAO_HUMANA
Já na main: `CATALOG_BATCH_PAGES = 1` (`src/hooks/products/useProductsLightweight.ts:149`) e
a remoção do re-split em timeout (`fetchPageResilient` não existe mais em
`src/lib/external-db/products-lightweight.ts`).

**Falta na main:** `CATALOG_FIRST_PAGE_SIZE = 96` — só a 1ª página (offset 0) viria com 96
produtos, as seguintes continuam 500; mais o teste
`src/hooks/products/__tests__/useProductsCatalog.pagination.test.tsx` (113 linhas).

Por que é decisão do dono e não APROVEITAR: a main **decidiu o contrário, por escrito, no
mesmo lugar** — `useProductsLightweight.ts:133-148`: "`CATALOG_PAGE_SIZE` segue em 500 de
propósito: baixá-lo multiplicaria o número de chamadas por sessão (…) Reduzir a página só faz
sentido junto com filtros no servidor, que é trabalho separado." Em negócio: primeiro paint
mais rápido vs. mais chamadas ao banco por sessão. O código está completo e testado; é
trade-off, não bug.

## 8. claude/fix-ci-failures-261109-2000 — `1c8a660398` — INCORPORADA
Correções reais, todas na main:
- `vitest` no import map do Deno → `supabase/functions/deno.json:10` (main fixa `npm:vitest@5.0.5`)
- `withTimeout<T>(p: PromiseLike<T>…)` → `supabase/functions/health-check/index.ts:69`
- logger estruturado com objeto → `supabase/functions/quote-sync-promo-champions/index.ts:13`
- símbolos legados do bridge (`HEAVY_PRODUCT_COLUMNS`, `resolveProductsSelect`, …): a branch
  criava **stubs vazios** dentro da edge; a main tem a implementação real em
  `supabase/functions/tests/external-db-bridge/legacy-select.ts:24,66,94`.

O resto da branch é regressão, não trabalho: baixa pisos de cobertura
(`scripts/check-cloud-status-coverage.mjs:27` da main mantém `functions: 90`;
`scripts/check-price-freshness-coverage.mjs:53` mantém `branches: 75`), troca o lint baseline
de `full` para `incremental` (`.eslint-baseline-scope.json` da main segue `"mode": "full"`),
minifica JSON, remove comentários e esvazia `supabase/functions/e2e-cleanup/index.ts`
(550 linhas na main, com `timingSafeEqual`/`getClientIp`; 145 na branch).

## 9. importado/backup-20261028/codex/magazine-dbdeploy-20260909 — `c26e883c8e` — DESCARTAR
Único arquivo: job `deploy-magazine-rpcs` em `.github/workflows/supabase-linter-gate.yml` —
executor avulso que aplicava DDL pela Management API com checkout fixado em SHA, fora do
`db-apply-migration.yml` (proibido pelo AGENTS.md). Serviço já cumprido: a migration que ele
aplicaria, `20260909190400_magazine_page_order_numeric_version`, está em
`supabase/migrations/` na main **e registrada em produção** (`supabase_migrations.schema_migrations`
retorna `20260909190400 / magazine_page_order_numeric_version`). Nada a perder.

## 10. claude/crm-vendedor-sem-dono-261113 — `dbcb22a4e0` — DECISAO_HUMANA
Já na main (mesma função, outro nome e lugar — `supabase/functions/crm-db-bridge/query-policy.ts`):
- erro de entrada vira 400/409/403/504 em vez de 500 → `mapPostgrestErrorStatus` (`:590-607`)
- disjuntor só conta indisponibilidade → `isTransientCrmFailure` (`:609-622`)

**Conflito de regra de negócio, não resolvido:** a branch implementa "vendedor vê os dele
**+ os sem dono**" (`supabase/functions/crm-db-bridge/ownership.ts`, `ownerOrExpression` →
`coluna.eq.<uuid>,coluna.is.null`; commit `c6a715487` cita "regra do dono, 13/11", com o
argumento de que 94% das empresas do CRM não têm dono e só 6 de 77 vendedores têm vínculo).
A main faz o oposto: escopo estrito por `!inner` + `query.eq(scopeFilter.column, sellerId ?? -1)`
(`supabase/functions/crm-db-bridge/index.ts:449-450`, regras em `query-policy.ts:345-384`) —
vendedor sem vínculo não vê nada, e registro sem dono não aparece para ninguém. O guard da
main é datado "decisão do dono, 2026-11-14" (`query-policy.ts:338-343`), um dia **depois** da
regra citada pela branch. Duas decisões do dono em conflito: só ele resolve.
`ownership.ts` não existe mais na main (foi substituído por `query-policy.ts`).

## 11. claude/fix-ci-workflows-261107-1540 — `6499f1c95b` — INCORPORADA
Quase tudo é dossiê (`PENDENCIAS.md` +258, `RELATORIO_CI.md` +288 = ruído). O código era 1
linha: `SET search_path` da `fn_get_rupture_alerts`. A main tem a mesma correção em
`supabase/migrations/20261112011000_fix_sb0003_fn_get_rupture_alerts.sql:11`
(`SET search_path = public, pg_catalog, pg_temp`) e **já aplicada em produção**
(`pg_proc.proconfig = {"search_path=public, pg_catalog, pg_temp"}`). O rollback equivalente
existe em `supabase/rollbacks/20261101150000_rollback.sql` da main. Única diferença: a branch
punha `pg_catalog` antes de `public` (marginalmente mais estrito) — já superado em produção.

## 12. claude_pink/busy-heisenberg-nrrcva — `7205ad9ee0` — INCORPORADA
Ajuste dos seletores de teste para `react-day-picker` v10. A main tem os três arquivos
corrigidos, com os mesmos comentários:
`src/components/ui/__tests__/calendar.dimensions.test.tsx:73-74` e `:107-109`;
`calendar.redesign.test.tsx:57-63` e `:68-69`; `date-picker-field.test.tsx:60-62`.
A cópia da branch está **corrompida** e não compilaria: `HTMLB<U+FFFD>ement` em
`calendar.dimensions.test.tsx:76,91` e em `calendar.redesign.test.tsx:41`, `cay15Btn` em
`date-picker-field.test.tsx:63`, e `PENDENCIAS.md` aparece como binário no diff.

## 13. codex/fix-vitest-regressions-261109 — `6f8930b49b` — INCORPORADA
Só testes, e a main é superconjunto de todos:
- `tests/components/pages/KitBuilderPage.test.tsx`: os 8 `it(...)` da branch estão na main em
  `:171,183,192,201,210,220,230,240`, mais 18 casos que a branch não tem.
- `tests/pages/kit-builder/useKitBuilderQuote.test.ts`: main acrescenta
  `validateKitFitsForQuote` (`:14-16,20`) e `toast.warning` (`:24-30`).
- `src/tests/MockupDeletion.test.tsx`: main acrescenta `clearForArea` (`:98,704`) e o contrato
  de limpeza por área (`:612-620`).
- `tests/hooks/useKitBuilder-flow.test.tsx` e `tests/scripts/append-edge-deploy-receipt.test.mjs`:
  byte a byte **idênticos** à main.
- `tests/ssot/ssot-report-bump.test.ts`: diferença só de formatação (prettier).
