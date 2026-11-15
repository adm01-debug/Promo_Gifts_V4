# Veredito — grupo 03 (13 branches apagadas do GitHub, commits ainda no clone)

Método: `merge-base..sha` para isolar o que a branch adicionou; depois busca do
equivalente em `origin/main` (`git show origin/main:<arq>`, `git grep … origin/main`).
ATENÇÃO: a árvore de trabalho deste clone está na branch `claude_05/admiring-newton-5o3ztw`,
não em `main` — toda prova abaixo foi lida de `origin/main` por `git show`/`git grep`, nunca do
working tree.

Resultado: **1 APROVEITAR**, **11 INCORPORADA**, **1 DESCARTAR**, 0 DECISAO_HUMANA.

---

## 1. claude/fix-e2e-mock-auth-261104-1700 — `d5be7cd2a4` — INCORPORADA
20 commits de estabilização dos smokes E2E com auth real. Tudo em `origin/main`:
- `e2e/flows/magazine-publish-smoke.spec.ts:183` (espera `rpc/magazine_add_items_v2`), `:249` e `:275` (`edgeResponseReady` antes do `goto`), `:156-200` timeouts 60s.
- `e2e/flows/magazine-preview-sticky-smoke.spec.ts:39` e `:94` (seleção do elemento `position === "sticky"`), `:74` (`scrollTo top: 520`), `:51` (timeout 60s).
- `e2e/flows/20-all-features-smoke.spec.ts:345` (`test.setTimeout(240_000)`), `:382` (`[401,403,404,500,503]`).
- `e2e/flows/magazine-smoke.spec.ts:40` (60s).
- `e2e/helpers/auth.ts:64` — main é mais generosa que a branch (150_000 vs 90_000).
- `.github/workflows/deploy-gates.yml` da main já não define `E2E_MOCK_AUTH: '1'` (só lê, linha 619) — era a única mudança real de workflow da branch (o resto do diff de 1864 linhas é troca de CRLF/LF: `diff` após `tr -d '\r'` mostra apenas essas 2 linhas).

## 2. codex/infra-e2e-ci-pressure-261107-1040 — `1cd14bd9f7` — INCORPORADA
Redução de pressão nos runners de E2E. Main implementa o mesmo com nome diferente:
o job inline `e2e_relevant` virou workflow reusável `.github/workflows/_e2e-relevance.yml`,
consumido em `deploy-gates.yml:112-113`, `:570`, `:581-604` (inclusive o passo de bypass do
Gate 3 em `:601`). Demais itens: `e2e-flows.yml:94` (`needs: [e2e-error-boundaries]`),
`:125,139,153,171,185` (`--no-deps`), `:200` (`min: '9'`); `e2e-swatch-quickview.yml:63`
(`max-parallel: 1`), `:92`; `e2e-focused.yml:56`; filtros `'!src/**/__tests__/**'` em
`e2e-flows.yml:13`, `e2e.yml:14`, `e2e-personalization.yml:9`, `e2e-swatch-quickview.yml:13`,
`delivery-quality.yml:8-11`.

## 3. gifts-pr2719-wip — `63985031f2` — INCORPORADA
Tooling graphify (mapas SQL, enriquecimento TypeScript, métricas). Todos os arquivos existem
em `origin/main` (`git cat-file -e` OK): `scripts/graphify/build-sql-graph.py`,
`enrich-typescript-references.mjs`, `graph-metrics.mjs`, `postprocess-report.mjs`,
`tests/scripts/graphify-metrics.test.mjs`, `graphify-typescript-references.test.mjs`,
`.graphifyignore` (blob idêntico). Scripts npm em `package.json:66-69`. Main evoluiu depois
(digest sha256 em build-sql-graph, `isStructuralFileNode` em graph-metrics, guarda de arquivo
ausente em postprocess-report) — é superconjunto, não perda.
`PENDENCIAS.md`, `RELATORIO_CI.md` e `docs/graphify/AUDITORIA_*.md` = ruído (dossiê/histórico).

## 4. claude_05/vibrant-johnson-brx1kg — `eab73c0de6` — INCORPORADA
Único conteúdo de produção: cabeçalho de rollback na migration
`20261108001500_reconcile_e2e_cleanup_audit.sql`. Main tem o cabeçalho na **linha 2**
(`-- Rollback: DROP TABLE IF EXISTS public.e2e_cleanup_audit;`) e o registro em
`supabase/MIGRATIONS_SYNC_LOG.md:1187`; a migration **já foi aplicada em produção**
(sync log linha 1135, run 43322428599, 2026-11-13). Resto = ruído de docs.

## 5. importado/vps-fabrica/v2/refazer-0d1e3601 — `8a36be8e47` — **APROVEITAR (parcial pequeno)**
3 commits. Os dois primeiros (restaurar variante + foto exatas ao reabrir rascunho/histórico)
estão **na main**: `src/hooks/mockup/mockupSelectionSnapshot.ts`,
`src/hooks/mockup/useMockupGenerator.ts:284,337,496,651,707-708`,
`src/hooks/mockup/useMockupDraft.ts:70,379,387-388`.

**O que falta na main** (commit `95ca28d34`):
1. **Aviso na tela ao vendedor quando o navegador não consegue guardar/ler a variante e a foto
   escolhidas** (modo privado ou cota cheia). Hoje a main só escreve no log
   (`mockupSelectionSnapshot.ts:184` e `:204`, `grep -c toast` = **0** no arquivo em origin/main);
   a escolha do vendedor desaparece sem nenhum sinal e reaparece errada no próximo
   "abrir do histórico". A branch adiciona 2 `toast.error` (gravação e leitura).
   Observação honesta: a main já melhorou o caminho da cota (descarta snapshots antigos e tenta
   de novo uma vez, `evictHistory` em `:178-188`), então o buraco restante é só a falha final
   silenciosa — defeito real, de baixo alcance.
2. `tests/setup.ts` — shim de `localStorage` em memória global (`git show origin/main:tests/setup.ts
   | grep -c globalThis.localStorage` = **0**). Sem ele, sob Node 22+/26 todo teste que toca
   localStorage quebra. Main resolve o mesmo problema arquivo por arquivo (ex.
   `tests/components/mockup/acceptance/grupo5.acceptance.test.tsx:18`) — é infra de teste, não produção.

Completo ou pela metade: **completo** (3 trechos pequenos e autocontidos, com teste de caminho
de falha em `src/hooks/mockup/__tests__/mockupRestore.selection.test.ts`).

## 6. claude/fix-cores-por-area-e-ledger-261115-0310 — `0e48887ac7` — INCORPORADA
Análise de cores limpa só a área dona da logo. Main fez o mesmo extraindo um hook dedicado:
`src/hooks/simulation/useLogoColorAnalysisByArea.ts` (com o **mesmo comentário** "GUARD
(2026-11-15)" da branch, e `clearForArea`/`restoreFor` no lugar de `clearColorAnalysisForArea`),
usado em `src/hooks/mockup/useMockupGenerator.ts:127,459,745` e
`src/pages/mockups/MockupGenerator.tsx:353-355`. Teste em
`src/hooks/mockup/__tests__/colorAnalysisPorArea.test.ts` (main). Ledger
`docs/coordenacao/conflitos-semanticos.md` = doc de coordenação, main tem os próprios registros.

## 7. claude/feat-indices-fk-estoque-261112-0140 — `3f00528e2f` — INCORPORADA
Índices faltando em produção (FKs de `stock_snapshots`/`stock_notes` + 6 de desempenho).
Main tem `supabase/migrations/20261114014100_idx_fk_stock_and_missing_perf_indexes.sql`, que
declara no cabeçalho "Supersede da PR #3412 (versão original 20261112014000, nunca aplicada)",
com rollback em `supabase/rollbacks/20261114014100_rollback.sql`, e está **aplicada em
produção** (`supabase/MIGRATIONS_SYNC_LOG.md:1166`, run 43634622250, 2026-11-14).
Nada a resgatar: a versão da main é mais forte (`SET lock_timeout`, guarda final que falha se
algum índice ficar INVÁLIDO). **Nota de escopo deliberada:** a main deixou de fora
`idx_stock_snapshots_supplier_id` e `idx_stock_snapshots_supplier_branch_id` (eram FKs NO ACTION
para tabelas de 5 e 7 linhas), com justificativa escrita no cabeçalho — decisão tomada, não perda.

## 8. claude/fix-ft088-check-item-fits-261108-2215 — `c52f600ae5` — INCORPORADA
Versionamento da função `fn_check_item_fits` (FT-088). Main tem
`supabase/migrations/20261108030200_ft088_fn_check_item_fits.sql` + rollback
`supabase/rollbacks/20261108030200_rollback.sql`; `diff` mostra corpo SQL logicamente idêntico
(só espaçamento e comentários). A única linha extra da branch
(`GRANT EXECUTE … TO authenticated`) é dispensável: `CREATE OR REPLACE FUNCTION` preserva
grants e o grant já existe em produção — `supabase/baseline/20261015140000_baseline_schema.sql:111036`
—, além do grant amplo em `supabase/migrations/20260528102501_restore_authenticated_rpc_grants.sql:8`.
Registro em `supabase/MIGRATIONS_SYNC_LOG.md:1271`.

## 9. codex/p200-e008-live-rls-20261030 — `e09f1b68de` — INCORPORADA
Gate de RLS passa a exigir evidência ao vivo. Main: `deploy-gates.yml:352-356`
(`check-policies-baseline.mjs --require-live` + `if` de repo interno) e **:360-364** (passo
estático só em PR de fork, que a branch não tinha); `supabase-security-gate.yml:97-98,107-108,
117-118,130-131`. O teste `tests/scripts/p200-e008-live-rls-gates.test.mjs` não existe na main,
mas a cobertura equivalente existe e é maior: `tests/scripts/deploy-gates-live-audit.test.mjs:52-59`
(Gate 1.13 live + fallback de fork) e `:103-104`, mais
`tests/scripts/rpc-live-evidence-contract.test.mjs:48` (o script nunca passa estaticamente com
`--require-live`).

## 10. fix/crm-db-bridge-auth-before-breaker-20261031 — `8c813a2f11` — INCORPORADA
Autenticar antes de recusar por indisponibilidade do CRM (chamada anônima tem de receber 401,
não 503). Main: `supabase/functions/crm-db-bridge/index.ts:882-883` (auth) **antes** de `:1029`
(`if (!breaker.canRequest())`), e o teste de ordem `tests/security/crm-db-bridge-auth-before-breaker.test.ts`
existe na main. `PENDENCIAS.md`/`RELATORIO_CI.md` = ruído.

## 11. fix/reconcile-canonical-pending-migrations — `bc8038dbb5` — INCORPORADA
Reconciliação das migrations pendentes + anti-drift de materialized views. Main:
`scripts/drift-baseline.mjs:542,553-576` (`materializedViewPopulation`, cláusula `WITH NO DATA`)
e `tests/scripts/drift-baseline.test.mjs:633-643`; `scripts/check-migrations-sync-log-gate.mjs`
e `tests/scripts/check-migrations-sync-log-gate.test.mjs` com blob **idêntico**;
migrations `20261027195959_supplier_stricker_rls_deny_all.sql` (main ainda **acrescenta**
`DROP POLICY IF EXISTS deny_all` antes do CREATE POLICY), `20261027233000_add_xbz_image_uploader_secret_to_allowlist.sql`
e `20261027234500_reactivate_xbz_image_uploader_cron.sql` (blobs idênticos), com
`supabase/rollbacks/20261027195959_rollback.sql` idêntico. A `20261027200000` foi substituída
pela `20261027195959` — por isso não existe na main.

## 12. gifts-pr2714-wip — `bc8038dbb5` — DESCARTAR
**Mesmo SHA** da branch 11 (`bc8038dbb5`): duplicata exata, mesmas provas, nada exclusivo.

## 13. importado/vps-fabrica/v2/n15-2610082245 — `63346f59a9` — INCORPORADA
`clearDraft` não ser desfeito por gravação já em voo (rascunho reaparecia depois de limpo).
Main resolve o mesmo defeito, com a **mesma etiqueta** "B F-10 FIX", por mecanismo mais forte
(`saveSeqRef` + `upsertChainRef` em vez do `inFlightSavesRef: Set<Promise>` da branch):
`src/hooks/mockup/useMockupDraft.ts:92,226,402-422`. Teste
`src/hooks/mockup/__tests__/useMockupDraft.race.test.ts` existe na main.

---

### Ruído identificado (não conta como trabalho)
`PENDENCIAS.md`, `RELATORIO_CI.md`, `docs/graphify/AUDITORIA_*.md`,
`docs/plans/PLANO_MELHORIAS_*.md`, `docs/coordenacao/conflitos-semanticos.md`, `graphify-out/`,
`supabase/migrations-snapshot/`. Em `eab73c0de6` as remoções de ~2.250 linhas em
PENDENCIAS/RELATORIO são rebase de histórico, não exclusão de código.
