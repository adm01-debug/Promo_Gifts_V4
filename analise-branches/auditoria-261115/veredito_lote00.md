# Veredito — lote00 (11 branches)

Contexto que explica quase todo o lote (duas decisões recentes da `main`):

1. **`5dd9b949d` (2026-11-11)** — "chore(repo): move 316 arquivos obsoletos da #3361 de `src/` para `recovery/src-legacy`".
   521 arquivos vivem hoje em `recovery/src-legacy/` na `main`. Qualquer branch que edite
   `src/hooks/useX.ts`, `src/pages/X.tsx` (raiz) está editando código que a `main` arquivou de propósito.
2. **`e998b0956` / PR #3631 (2026-11-14)** — "resgate cirúrgico da #3390", documentado em
   `docs/coordenacao/conflitos-semanticos.md:31`: 38 arquivos trazidos um a um de
   `claude/resgate-3390-261113`, com **13 grupos excluídos e motivo de cada um**.

---

## 1. `bot/schema-snapshot` — DESCARTAR

Snapshot semanal do schema gerado por robô; nada escrito por humano.

Provas:
- Único commit de conteúdo: `a71524e99 chore(schema-snapshot): snapshot semanal 2026-W45 (run 42319487374)`,
  autor `github-actions[bot]`, corpo "Auto-gerado por `schema-snapshot-export.yml` (E84)".
- Arquivos: `supabase/baseline/20261101232022_baseline_schema.sql` (+86.453),
  `..._ledger_versions.json` (+2.582), `supabase/migrations-snapshot/{ALL_IN_ONE.sql,SCHEMA_LIVE.sql,SNAPSHOT_META.json}`.
  Tudo é snapshot de schema = ruído gerado.
- A `main` tem baseline mais antigo (`supabase/baseline/20261015140000_baseline_schema.sql`,
  `SNAPSHOT_META.json` `generated_at: 2026-10-18`). Se o dono quiser o snapshot novo, basta
  re-disparar `schema-snapshot-export.yml` — não precisa da branch.

Nada a resgatar.

---

## 2. `importado/backup-20261028/claude/audit-gaps-20260915` — INCORPORADA

Auditoria de banco de 50 etapas (E08–E49): migrations, gates de CI e scripts. **Tudo o que é código já está na `main`**; o que falta é relatório e arquivo gerado.

Provas:
- Dos 141 arquivos da branch, só 44 não existem na `main` por caminho, e **42 deles são
  `docs/E*.md` / `docs/*.json` de relatório** + `supabase/migrations-snapshot/SCHEMA_DRIFT.sql` (gerado)
  + `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` (124.910 linhas de dump) e
  `docs/db/LEDGER_DATA_2026-09-16.sql` (165.023) — é daí que vêm os 83.314 "linhas faltando".
- As 13 migrations E17–E47 estão na `main` com conteúdo idêntico. Verificado byte a byte:
  `supabase/migrations/20260917160000_e33_ops_wraparound_monitor.sql` e
  `scripts/wraparound-monitor-check.mjs` → hash igual ao da `main`.
- `scripts/check-ddl-out-of-band.mjs`, `scripts/preflight-migration-apply.mjs` e
  `.github/workflows/db-apply-migration.yml`: a `main` está **à frente** (+128, +277 e +248 linhas
  respectivamente sobre a versão da branch).
- `.github/workflows/migrations-sync-log-gate.yml` (único workflow realmente ausente) foi absorvido
  como step dentro de outro workflow: `origin/main:.github/workflows/static-checks.yml:183`
  (`node scripts/check-migrations-sync-log-gate.mjs`), com paths filter em `static-checks.yml:71` e
  script `check:migrations-sync-log-gate` em `package.json:294`.
- `.github/workflows/stock-module-quality.yml`: o diff da branch é **1 linha** (`+ 'tests/components/inventory/**'`
  no filtro de paths) e a `main` **apagou o workflow de propósito** em
  `6a6abc035 chore(ci): E77-E80 fase 2 — remove 30 workflows individuais substituídos por matrizes (#2595)`.
  A `main` cobre estoque por `e2e-stock.yml` e `stock-rupture-fuzz.yml`.
- `scripts/check-public-views-columns.mjs`: a branch apaga (−75) e a `main` também já não tem — mesma decisão.
- Único toque em `src/`: `src/hooks/kit-builder/useKitBuilderPageState.ts` (+5), tipagem da função `text()`
  dentro de `readDraftClient`. A `main` **refatorou a função para fora** — `readDraftClient` não existe mais
  em `origin/main:src/hooks/kit-builder/useKitBuilderPageState.ts` (grep sem resultado); a leitura de
  rascunho vive em `src/lib/kit-builder/snapshot/read-draft.ts`. Patch obsoleto.

---

## 3. `importado/local/projetos__Promo_Gifts_V4.backup-20261028` — INCORPORADA

Backup de um checkout local de 28/10. Um único commit de importação; o conteúdo útil já está na `main`.

Provas:
- 6 arquivos. `graphify-out/GRAPH_REPORT.md` (+8.244) e `graphify-out/manifest.json` (+33.664) = grafo
  gerado (ruído, regerável com `graphify update .`).
- `docs/TYPES_INVENTORY_REMOVAL_ALLOWLIST.json`: a entrada `supplier_products_raw_history_p2026_06`
  **já está na `main`** — `origin/main:docs/TYPES_INVENTORY_REMOVAL_ALLOWLIST.json:144`.
- `src/integrations/supabase/types.ts` é arquivo **auto-gerado** e a `main` está à frente: diff
  branch→main = +450 linhas. Os 3 blocos da branch estão lá: `magazine_public_view_events_2027_01`
  em `origin/main:src/integrations/supabase/types.ts:12078`, e `version: number` aparece 42×.
- `supabase/MIGRATIONS_SYNC_LOG.md`: os recibos das migrations `20261005124500`–`20261005130000` estão
  na `main` em outro formato de tabela — `origin/main:supabase/MIGRATIONS_SYNC_LOG.md:1316` e `:1320`
  ("aplicada (ledger de produção); recibo retroativo").
- Só `docs/AUDITORIA_CANDIDATAS_FORA_BASELINE_E06_2026-10-07.md` (+64) falta — relatório de análise = ruído.

---

## 4. `codex/fix-gate1-kit-pdf-types-261109-2252` — DECISAO_HUMANA

**O que precisa ser decidido:** a branch traz uma migration que **recria a tabela `quote_comments`** (comentários em orçamento) — feature que a `main` removeu de propósito e hoje **proíbe por guarda de CI**.

Provas do conflito:
- `origin/main:scripts/check-no-quote-comments.mjs` — "Gate: garante que `QuoteCommentsSection`,
  `useQuoteComments` e queries em `quote_comments` foram totalmente removidas do código de aplicação.
  Falha o CI se qualquer referência residual reaparecer".
- `origin/main:supabase/migrations-snapshot/ALL_IN_ONE.sql:207551` e `:208000` —
  `DROP TABLE IF EXISTS public.quote_comments CASCADE;`.
- Arquivo em questão: `supabase/migrations/20261110022404_restore_quote_comments_scoped_threads.sql`
  (+ `supabase/rollbacks/20261110022404_rollback.sql`), cabeçalho: "Status: prepared for review;
  not applied to production" e uma exceção explícita ao soft-delete ("REVIEW REQUIRED… intentional hard DELETE").

Todo o resto da branch é obsoleto ou já está na `main`:
- A 2ª migration, `20261110024530_restore_device_trust_contract.sql` (coluna `user_known_devices.is_trusted`),
  **já entrou na `main`**: `origin/main:supabase/migrations/20261114031000_fix_user_known_devices_is_trusted.sql`
  (PR #3618, commit `ee13f748c`).
- `scripts/check-select-columns.mjs` (corrige falso positivo da janela de 600 chars em `.from()` seguido):
  **idêntico à `main`** (diff branch↔main vazio).
- ~200 caminhos "ausentes na main" (`src/hooks/useX.ts`, `src/pages/X.tsx`, `src/utils/kitPdfGenerator.ts`,
  `src/utils/templateExport.ts`…) são os arquivos que a `main` moveu para `recovery/src-legacy/` em
  `5dd9b949d`. Confirmado: `origin/main:recovery/src-legacy/src/utils/kitPdfGenerator.ts`,
  `…/src/hooks/useQuoteComments.ts`, `…/src/components/quotes/QuoteCommentsSection.tsx`,
  `…/src/pages/Auth.tsx` todos existem.
- ~60 testes novos (`tests/hooks/*.legacy.test.*`, `tests/pages/legacy-*.test.*`,
  `tests/components/QuoteTemplatePreservation.test.tsx`, `tests/hooks/device-and-supplier-trust.contract.test.ts`)
  importam justamente esses caminhos arquivados (`@/hooks/useQuoteTemplates`, `@/hooks/useDeviceDetection`,
  `@/pages/quote-view/QuoteActionHandlers`, `@/pages/quoteDraftRecovery`) — não compilam contra a `main`.
- `supabase/sql-legacy/` (mover as 5 migrations `001_`–`005_notification*` fora da pasta canônica):
  **já está na `main`** — `origin/main:supabase/sql-legacy/001_notification_system.sql` … `005_push_subscriptions.sql`.
- Os 10 `*-baseline.json` do Gate 1: a `main` tem baselines **menores** (ex.: `.toast-leaks-baseline.json`
  −384 entradas, `.as-assertions-baseline.json` −148). Trazer a branch **ampliaria** baseline, o que é proibido.
- `package.json`: `+@radix-ui/react-toast@1.3.1` serve ao `src/hooks/use-toast.ts` / `src/components/ui/toaster.tsx`
  arquivados; a `main` usa `sonner` (`package.json:392`, `origin/main:src/components/ui/sonner.tsx`).

---

## 5. `claude/resgate-3390-261113` — INCORPORADA

O conserto dos rascunhos de kit (15 de 21 kits que não abriam) **já está em produção**; a sobra foi descartada com motivo registrado.

Provas:
- `docs/coordenacao/conflitos-semanticos.md:31` na `main` descreve exatamente esta branch:
  "`claude/fix-rascunhos-kit-261114-2130` — resgate cirúrgico de `claude/resgate-3390-261113` … **Não foi
  feito merge da branch**: os 38 arquivos foram trazidos um a um com `git checkout <ref> -- <caminho>` …
  **13 grupos ficaram de fora**, cada um com motivo".
- Conserto em produção: `origin/main:src/lib/kit-builder/snapshot/read-draft.ts:187-189`
  (`row.personalization_data ?? { box: { enabled: false }, items: {} }`), schema em `:101-107`,
  chamado em `origin/main:src/hooks/kit-builder/useKitBuilderPageState.ts:231`. Commit
  `e998b0956 … (resgate cirúrgico da #3390) (#3631)`.
- Idênticos à `main` (diff vazio): `src/lib/kit-builder/snapshot/read-draft.ts`,
  `src/lib/kit-builder/validate-composition.ts`, `src/lib/json-value.ts`,
  `src/lib/kit-builder/pricing-availability.ts`, `src/lib/kit-builder/persistence.ts`,
  `src/lib/kit-library/buildCustomKitInsert.ts`, `src/hooks/kit-builder/useKitBuilderPageState.ts`,
  `src/hooks/kit-builder/useKitAutoSave.ts`, `src/hooks/kit-builder/useKitBuilder.ts`,
  `src/hooks/quotes/useQuoteTemplates.ts`, `src/components/kit-library/KitCard.tsx`,
  `src/components/kit-builder/KitSummary.tsx`, `src/hooks/admin/useDeviceDetection.ts`,
  `src/hooks/intelligence/useSalesHistoryMacro.ts`, `src/utils/product-sorting.ts`.
- Sobra 1 — recuperação de rascunho de orçamento (`src/lib/quotes/quoteDraftRecovery.ts` +111 em
  `QuoteAutoSave.tsx`): **a `main` tem a mesma funcionalidade em outra forma** —
  `origin/main:src/hooks/quotes/useAutoSaveQuote.ts` usado em
  `origin/main:src/hooks/quotes/useQuoteBuilderState.ts:255-300` (`restoreEnabled`, `onRestore`),
  com `draftRestoredAt` em `:117`/`:952` e consumo em
  `origin/main:src/pages/quotes/QuoteBuilderPage.tsx:126`. O item (6) da nota de conflito exclui
  nominalmente "os shims órfãos `voiceFilterPatch`/`quoteDraftRecovery` e seus testes".
- Sobra 2 — `src/components/cart/LegacyCartInsights.tsx` (281 linhas) + teste (319): **código morto**.
  O único consumidor na própria branch é o teste dele
  (`git grep -ln LegacyCartInsights` → só `LegacyCartInsights.tsx` e `__tests__/LegacyCartInsights.test.tsx`).
  Cabeçalho do arquivo: "Compatibility features preserved from CartUtilComponents before commit 5e2221cfa".
  Cai no item (13) da nota ("~35 arquivos sem relação com rascunhos de kit").
- Sobra 3 — `recovery/src-legacy/**` (~230 arquivos) é o item (4) da nota: "código morto, fora de
  `tsconfig.app.json` e do `vitest.config.ts`".

---

## 6. `claude/fix-pr3517-gate1-baseline-261113-2336` — INCORPORADA

Variante menor da branch 5, pelo próprio commit "supersede #3517"; já coberta pelo mesmo resgate.

Provas:
- Compartilha a história com a branch 5 a partir de `06eb41a22`; commit de topo
  `480e5bc72 fix(kit): resgate da #3390 com Gate 1 verde e sem código morto (supersede #3517)`.
  A branch 5 tem 3 merges de `main` mais recentes.
- Fora de `recovery/`, toca 66 arquivos e só **11** não existem na `main`, todos no grupo excluído
  pela nota `docs/coordenacao/conflitos-semanticos.md:31`:
  `src/components/{cart/SortableCartItem,loading/ModernSkeletons,mockup/MockupHistoryPanel,quotes/QuoteAutoSave,quotes/quoteList}.types.ts`
  (extração de tipos para baixar o baseline de tamanho → item (11), "ampliação de baseline é proibida"),
  `src/lib/filters/voiceFilterPatch.ts` e `src/lib/quotes/quoteDraftRecovery.ts` (item (6), shims órfãos;
  equivalente na `main` em `src/hooks/quotes/useAutoSaveQuote.ts`), e 4 testes desses mesmos arquivos.
- O conserto de verdade (kit-builder) é idêntico ao da branch 5, já na `main` via #3631.

---

## 7. `claude_pink/lucid-franklin-mjhkyc` — DESCARTAR

Dossiês de PRs e dumps de evidência de prontidão para produção. Zero código.

Provas:
- `git diff --name-only` por diretório: 36 em `analise-prs/`, 18 em `docs/`, 2 em `inventario/`.
  `git diff --stat -- src supabase scripts .github package.json` = **vazio**.
- Os 18 de `docs/` são `docs/prod-readiness-evidencias/*` (`cron_fail.json`, `rls.json`, `probes.tsv`,
  `tests.json`, `latest-main-runs.json`…) = despejo de evidência + `docs/prod-readiness.md`.
- Os 2 de `inventario/` são `inventario/estado/edges.json` e `rotas.json` = inventário gerado.
- Os 36 de `analise-prs/` são `dossies/pr-3333.md`, `pr-3390.md`, `baseline/main.json` etc. = relatório de outro agente.

---

## 8. `claude/analise-merge-prs-abertas-shh8ez` — DESCARTAR

Relatório de análise de 28 PRs abertas de 30/10. Zero código.

Provas:
- 40 arquivos, **todos** sob `analise-prs/` (`git diff --name-only | sed 's#/.*##' | sort | uniq -c` → `40 analise-prs`).
  `git diff --stat -- src supabase scripts .github package.json` = **vazio**.
- Inclui `analise-prs/baseline/vitest.txt` (+6.743) = log de teste colado; é a origem das 8.863 "linhas faltando".
- Commits são todos `docs(analise-prs)` / `docs(audit)`.

---

## 9. `claude_pink/peaceful-planck-q4ee1i` — INCORPORADA

Auditoria do Supabase (33 achados) em markdown, mais um conserto de 7 linhas num gate — e esse conserto já está na `main`.

Provas:
- 18 dos 19 arquivos são `auditoria-supabase/**` (relatório, `inventario/baseline_antes.json` +5.651, propostas `.sql` não aplicadas) = ruído de relatório.
- Único código: `scripts/check-eslint-baseline.mjs` (+7). Está na `main` **palavra por palavra** —
  `origin/main:scripts/check-eslint-baseline.mjs:88-98`:
  `console.error(\`❌ eslint falhou com status ${res.status} (sinal: ${res.signal ?? 'nenhum'})\`)` e
  `// Guarda contra crash antes de escrever o output (OOM, sem espaço em disco, permissão)` +
  `if (!existsSync(out))`. A `main` ainda acrescentou `NODE_OPTIONS: '--max-old-space-size=4096'`.
- As propostas SQL (`auditoria-supabase/propostas/P01_rls_restrictive_correcao.sql` etc.) são rascunhos
  dentro da pasta de relatório, não migrations em `supabase/migrations/` — não aplicáveis como estão.

---

## 10. `claude_05/youthful-ride-vcdchy` — APROVEITAR (pouco; o resto da branch é ruído e regressão)

**O que resgatar (≈210 linhas, pela metade — nenhum dos dois tem tela que os use):**

1. **Conferência de total de pedido** — `src/services/orderService.ts` (86 linhas) +
   `src/services/__tests__/orderService.test.ts` (93 linhas). Busca o pedido e seus itens respeitando RLS,
   recalcula subtotal e total esperado de checkout e devolve `checkoutConsistent` (flag de divergência entre
   o total gravado e o total recalculado). Módulo completo e testado; **sem consumidor** —
   `git grep -ln orderService` na branch só acha o próprio arquivo e o teste.
   Na `main` não existe nada equivalente: `src/services/` não tem `orderService` nem leitura de
   `order_items` orientada a conferência (`src/hooks/bi/useClientOrdersHistory.ts` é histórico de cliente).
2. **`src/lib/auth/auth-audit.ts` (27 linhas)** — chamada à RPC `check_auth_config_status` com degradação
   graciosa. Vale porque a própria `main` **documenta este arquivo como o call site**:
   `origin/main:supabase/migrations-snapshot/ALL_IN_ONE.sql:176802` — "DELIBERATELY NOT RESTORED /
   check_auth_config_status — intentionally absent from public; the call site (`src/lib/auth/auth-audit.ts`)
   documents this and degrades gracefully" — e o arquivo **não existe** na `main`. Ou se restaura o arquivo,
   ou se corrige a nota. Também sem consumidor hoje.

**Não aproveitar (e não mergear a branch inteira):**
- `src/services/notificationService.ts` (240 linhas): duplica o que a `main` já faz no hook —
  `origin/main:src/hooks/ui/useWorkspaceNotifications.tsx:213` (query em `workspace_notifications`),
  `:224` (`unreadOnly`), `:434-444` (`markAsRead`), `:371-377` (realtime). Sem consumidor na branch.
- `supabase/migrations/20261101220000_cron001_stagger_schedules.sql`: **idêntico à `main`**.
- Regressões: a branch **apaga** `src/components/layout/UserMenuShortcutItems.tsx` (que a `main` tem) e
  reinlina o menu em `Header.tsx`; em `src/components/kit-builder/SelectedItemsBadges.tsx` **remove** o
  `<input data-testid="kit-item-quantity">` e o `data-testid="remove-kit-item"`, trocando por texto estático;
  e **apaga** `supabase/rollbacks/20261022195616_rollback.sql` e `20261022203935_rollback.sql`.
  A `main` está à frente em `KitBuilderHeader.tsx` (+48).
- `supabase/functions/categories-api/index.ts` (+52): fallback para a tabela `product_categories`, que o
  próprio comentário do código admite não existir ("esta tabela nao existe no banco atual — a query falha
  silenciosamente"). Código morto; e deploy de edge só pelo `deploy-edge-functions.yml`.
- 153 arquivos em `analise-prs/` + `RELATORIO_CI.md` = relatório.
- `src/components/quotes/__tests__/__snapshots__/NegotiationMarkupCard.visualA11y.test.tsx.snap`: snapshot gerado.

---

## 11. `claude_04/optimistic-bohr-qplx94` — DESCARTAR

Dossiês de PRs (rev90–rev93b) mais um snapshot de teste gerado. Zero código de produção.

Provas:
- 142 dos 143 arquivos estão em `analise-prs/` (`uniq -c` → `142 analise-prs`, `1 src`).
- O único arquivo em `src/` é
  `src/components/quotes/__tests__/__snapshots__/NegotiationMarkupCard.visualA11y.test.tsx.snap` (+620),
  **artefato gerado pelo vitest** (`// Vitest Snapshot v1`). A `main` tem o arquivo com 623 linhas
  (1 snapshot); a branch tem 1.241 (2 snapshots). Regerável com `vitest -u` — não é trabalho a resgatar.
- Nenhum toque em `supabase/`, `scripts/` ou `.github/`.

---

## Tabela final

| branch | veredito | o que resgatar |
|---|---|---|
| `bot/schema-snapshot` | DESCARTAR | Nada — snapshot semanal auto-gerado por `schema-snapshot-export.yml` (commit do `github-actions[bot]`); re-disparar o workflow produz igual. |
| `importado/backup-20261028/claude/audit-gaps-20260915` | INCORPORADA | Nada — 13 migrations e os scripts E17–E47 idênticos na `main`; gate de sync-log virou step em `static-checks.yml:183`; `stock-module-quality.yml` foi removido de propósito em `6a6abc035`. Resto é relatório/dump. |
| `importado/local/projetos__Promo_Gifts_V4.backup-20261028` | INCORPORADA | Nada — `types.ts` é gerado e a `main` está +450 linhas à frente; allowlist em `main:docs/TYPES_INVENTORY_REMOVAL_ALLOWLIST.json:144`; recibos em `main:supabase/MIGRATIONS_SYNC_LOG.md:1316,1320`. |
| `codex/fix-gate1-kit-pdf-types-261109-2252` | DECISAO_HUMANA | Decidir se a tabela `quote_comments` volta: `supabase/migrations/20261110022404_restore_quote_comments_scoped_threads.sql` recria o que a `main` dropou (`ALL_IN_ONE.sql:207551`) e proíbe por gate (`scripts/check-no-quote-comments.mjs`). Todo o resto é obsoleto. |
| `claude/resgate-3390-261113` | INCORPORADA | Nada — resgate cirúrgico já feito no PR #3631 (`main:src/lib/kit-builder/snapshot/read-draft.ts:187-189`), com as 13 exclusões registradas em `main:docs/coordenacao/conflitos-semanticos.md:31`. |
| `claude/fix-pr3517-gate1-baseline-261113-2336` | INCORPORADA | Nada — subconjunto da branch acima; os 11 arquivos exclusivos são os `*.types.ts` de baseline e os shims `voiceFilterPatch`/`quoteDraftRecovery`, excluídos por decisão registrada. |
| `claude_pink/lucid-franklin-mjhkyc` | DESCARTAR | Nada — 56 arquivos de dossiê de PR, dumps em `docs/prod-readiness-evidencias/` e inventário gerado; zero diff em `src/`, `supabase/`, `scripts/`, `.github/`. |
| `claude/analise-merge-prs-abertas-shh8ez` | DESCARTAR | Nada — 40 arquivos, todos em `analise-prs/` (inclui `baseline/vitest.txt` com 6.743 linhas de log). |
| `claude_pink/peaceful-planck-q4ee1i` | INCORPORADA | Nada — a guarda de `check-eslint-baseline.mjs` está palavra por palavra em `main:scripts/check-eslint-baseline.mjs:88-98`; resto é relatório de auditoria. |
| `claude_05/youthful-ride-vcdchy` | APROVEITAR | `src/services/orderService.ts` + `src/services/__tests__/orderService.test.ts` (≈180 linhas): conferência do total do pedido contra a soma dos itens (`checkoutConsistent`), completo e testado mas **sem tela que o chame**. E `src/lib/auth/auth-audit.ts` (27 linhas), que a `main` cita como call site em `ALL_IN_ONE.sql:176802` sem ter o arquivo. **Não** mergear a branch: ela apaga `UserMenuShortcutItems.tsx`, remove os `data-testid` de quantidade/remover item em `SelectedItemsBadges.tsx` e apaga 2 rollbacks. |
| `claude_04/optimistic-bohr-qplx94` | DESCARTAR | Nada — 142 dossiês em `analise-prs/` + 1 snapshot de vitest gerado (`NegotiationMarkupCard.visualA11y.test.tsx.snap`), regerável com `vitest -u`. |
