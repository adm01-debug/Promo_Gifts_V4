# Veredito — grupo01 (13 branches apagadas, commits ainda no clone)

Repo: /home/user/Promo_Gifts_V4 · base de comparação: `origin/main` · somente leitura (nenhuma escrita, push, PR ou checkout).

## Resumo

| # | branch | sha | veredito |
|---|---|---|---|
| 1 | claude/fix-sync-reconcile-migrations-261030-1430 | 39cc57b578 | INCORPORADA |
| 2 | importado/vps-fabrica/v2/refazer-64fc7ecf | 46ae4276c3 | **APROVEITAR** |
| 3 | importado/vps-fabrica/v2/refazer-791002a2 | 3837ee36e0 | DESCARTAR (duplicata byte-a-byte da #2) |
| 4 | importado/vps-fabrica/v2/fix-edge-generate-mockup-validar-redirec-2610081910 | df47d95c37 | INCORPORADA |
| 5 | fix/alignment-fuzz-test-e128-split | 159a5d0ebf | INCORPORADA |
| 6 | claude/chore-ci-report33-261108-0407 | dab66d278f | INCORPORADA |
| 7 | gifts-pr2717-wip | 0850ef9905 | INCORPORADA |
| 8 | importado/vps-fabrica/v2/refazer-3cedf88f | 67e6be891c | **APROVEITAR** |
| 9 | importado/vps-fabrica/v2/refazer-9d7ee7e0 | 9c8e028341 | DESCARTAR (duplicata byte-a-byte da #8) |
| 10 | importado/vps-fabrica/v2/refazer-1ba38463 | c11b02acb6 | **APROVEITAR** |
| 11 | importado/vps-fabrica/v2/refazer-a76f3b50 | 44bf48be22 | DESCARTAR (duplicata byte-a-byte da #10) |
| 12 | claude_pink/focused-lamport-qyupp8 | e314d1cba2 | INCORPORADA |
| 13 | gifts-pr2688-wip | e314d1cba2 | INCORPORADA (mesmo SHA da #12) |

Prova de duplicata (sha256 do diff `merge-base..sha`):
- 46ae4276c3 = 3837ee36e0 → `ca298caf9b485d147b666535a872600cc4fc85eb56380ef9b3f5a743f5bfc74a`
- 67e6be891c = 9c8e028341 → `0e171f247ea0c90d1dbce00331e150ae63f4e1cbcad815c55439c26cdb39cb08`
- c11b02acb6 = 44bf48be22 → `7a4d5585b8aa5861e09827ba99b2205fe492ac2faa8af0d55d17a61ae496a991`
- claude_pink/focused-lamport-qyupp8 e gifts-pr2688-wip apontam para o MESMO commit `e314d1cba2`.

Ruído desconsiderado em todas as branches (não conta como trabalho): `PENDENCIAS.md`, `RELATORIO_CI.md`, `supabase/MIGRATIONS_SYNC_LOG.md`, `graphify-out/`.

---

## 1. claude/fix-sync-reconcile-migrations-261030-1430 — 39cc57b578 — INCORPORADA

Arquivos de produção e estado na main (comparação arquivo a arquivo, branch × `origin/main`):

- `supabase/rollbacks/20261027195959_rollback.sql` — IDÊNTICO na main
- `supabase/migrations/20261027233000_add_xbz_image_uploader_secret_to_allowlist.sql` — IDÊNTICO
- `supabase/migrations/20261027234500_reactivate_xbz_image_uploader_cron.sql` — IDÊNTICO
- `scripts/check-migrations-sync-log-gate.mjs` — IDÊNTICO
- `tests/scripts/check-migrations-sync-log-gate.test.mjs` — IDÊNTICO
- `supabase/migrations/20261027195959_supplier_stricker_rls_deny_all.sql` — main é SUPERCONJUNTO: tem as mesmas 81 linhas mais `DROP POLICY IF EXISTS deny_all` (main linhas 52-55) antes do `CREATE POLICY`, tornando-a idempotente. A renomeação `20261027200000` → `20261027195959` que a branch fazia já está feita na main (arquivo `20261027200000...` não existe mais lá).
- `scripts/drift-baseline.mjs` e `tests/scripts/drift-baseline.test.mjs` — main é SUPERCONJUNTO. Todo o conteúdo da branch está lá, mais: `sanitizeReplayMigration` (main `scripts/drift-baseline.mjs:345-379`), semente de `cron.job` com IDs fixos 114/224/235/241/243/276/292/303, job `generate-blurhashes`, restauração de `auth.users` na publication `supabase_realtime`, e os testes correspondentes (`tests/scripts/drift-baseline.test.mjs:78-167`).

O único conteúdo exclusivo da branch é no `MIGRATIONS_SYNC_LOG.md`: 9 linhas de recibo com status `pendente`/`previsto` para 20261027120000…234500. A main já registra essas mesmas versões como **aplicadas** (ex.: `supabase/MIGRATIONS_SYNC_LOG.md:1135`). Restaurar a branch reintroduziria recibos obsoletos — regressão, não trabalho perdido.

## 2. importado/vps-fabrica/v2/refazer-64fc7ecf — 46ae4276c3 — APROVEITAR

**O que é, em linguagem de negócio:** o serviço que lista os mockups já salvos de um cliente do CRM, para o módulo de orçamentos poder anexá-los a um item. Busca por `client_id` do CRM, descarta os da lixeira, ordena do mais novo, devolve o caminho no bucket `mockup-assets` (que é o que vai em `quote_items.mockup_urls`) e uma miniatura assinada de 1h; sem cliente devolve lista vazia sem bater no banco.

**Arquivos (ambos AUSENTES na main):**
- `src/hooks/mockup/useClientMockups.ts` (138 linhas)
- `src/hooks/mockup/__tests__/useClientMockups.test.ts` (239 linhas)

**Prova de ausência na main:** `git grep -n -e useClientMockups -e extractMockupStoragePath -e MOCKUP_THUMBNAIL_TTL_SECONDS origin/main -- src supabase scripts tests e2e` → **zero resultados**. `git ls-tree origin/main -- src/hooks/mockup/` lista 12 entradas, nenhuma delas `useClientMockups.ts`.

**Não há equivalente com outro nome.** O que mais perto existe na main é `fetchMockupHistory` / `fetchRecentMockupHistory` (`src/hooks/mockup/mockupHistoryAdapter.ts:27-32`), que filtra por **`user_id`**, não por `client_id`, e não produz nem o `path` do bucket nem a miniatura assinada. `mockupHistoryClients.ts:8-10` só agrupa clientes de uma lista já carregada.

**Completo ou pela metade:** **pela metade** — hook + testes prontos, mas nenhum consumidor. `git grep -ln useClientMockups 46ae4276c3 -- src e2e tests` só encontra o próprio hook e seu teste. Falta a tela/painel de orçamento que chama o hook. Dependências já existem na main (`src/lib/supabase-untyped.ts` PRESENTE).

## 3. importado/vps-fabrica/v2/refazer-791002a2 — 3837ee36e0 — DESCARTAR

Diff byte-a-byte idêntico à #2 (sha256 do diff igual, acima). Mesma mensagem de commit. Só o merge-base difere (`a9c8bd9c4e` em vez de `a3d86a725b`). Preservar a #2 preserva 100% deste trabalho.

## 4. importado/vps-fabrica/v2/fix-edge-generate-mockup-validar-redirec-2610081910 — df47d95c37 — INCORPORADA

Correção de SSRF na edge function `generate-mockup` (valida cada hop de redirect e exige allowlist de egresso). **Está na main**, repartida entre dois arquivos em vez de um:

- allowlist obrigatória com default no host do projeto: `supabase/functions/generate-mockup/fetch-guard.ts:25` (`allowedFetchHosts`), `fetch-guard.ts:12` (`DEFAULT_MOCKUP_FETCH_HOSTS`), derivação de `SUPABASE_URL` em `fetch-guard.ts:28-33`
- bloqueio de alvos internos/reservados (IPv4, IPv6, IPv4-mapped, ofuscação decimal/hex): `supabase/functions/generate-mockup/index.ts:95` (`isBlockedV4`), `index.ts:111` (`v4FromMapped`), `index.ts:121` (`isBlockedHost`), `index.ts:144` (`isFetchableUrl`)
- revalidação por hop com `redirect: "manual"`, falha fechada em redirect opaco, teto de bytes: `fetch-guard.ts` (`fetchBytes`), ligados em `index.ts:183` (`guardedFetchBytes(url, ms, isFetchableUrl)`) e usados em `index.ts:378` e `index.ts:386`
- testes: `supabase/functions/generate-mockup/index.test.ts:38,46,53,63,71` cobrem os mesmos cenários, inclusive o redirect para `169.254.169.254` (`index.test.ts:56`)

Diferença residual: a branch tinha dois testes extras (derivação de `SUPABASE_URL`; `isFetchableUrl` bloqueando alvos internos) cujo **comportamento** está na main, mas sem asserção dedicada no `index.test.ts` da main. É lacuna de cobertura de teste, não código de produção ausente.

## 5. fix/alignment-fuzz-test-e128-split — 159a5d0ebf — INCORPORADA

Dois itens de produção/teste:

- `src/hooks/common/useListUrlState.ts`: sync-on-mount que limpa da URL params iguais ao default, e normalização de `q=` vazio ≡ param ausente. **Na main**: o efeito sync-on-mount está em `src/hooks/common/useListUrlState.ts:139-158` (com o mesmo comentário, inclusive a referência `E2E list-url-state-restore.spec.ts:49`, e deps `[keyList, setSearchParams]` em vez de `[]`); a normalização está em `useListUrlState.ts:162-176` — a main usa duas guardas (`if (target === null && (!current || current === defaultValue)) return;` e `if (current === target) return;`) no lugar da variável `effectiveUrl` da branch, com a mesma semântica; a main ainda adiciona a canonicalização por `locationKey` (`useListUrlState.ts:116-129`) e o resync em POP, que a branch não tinha.
- `src/components/quotes/__tests__/QuoteBuilderSummaryAlignment.fuzz.test.ts`: apontar os tokens para o arquivo pós-split E128. **Na main**: `QuoteBuilderSummaryAlignment.fuzz.test.ts:19` já lê `../QuoteBuilderSummaryItems.tsx` (a main renomeou a própria constante `SRC`, em vez de criar `SRC_ITEMS`), e os comentários E128 estão em `:143` e `:149`.

`PENDENCIAS.md`/`RELATORIO_CI.md` nesta branch são quase só remoções de dossiê — ruído.

## 6. claude/chore-ci-report33-261108-0407 — dab66d278f — INCORPORADA

Único conteúdo de produção: 1 linha de header `-- Rollback: DROP TABLE IF EXISTS public.e2e_cleanup_audit;` em `supabase/migrations/20261108001500_reconcile_e2e_cleanup_audit.sql`. **Na main** a mesma linha existe, no topo canônico do arquivo (linha 2, junto com `-- Migration: 20261108001500_reconcile_e2e_cleanup_audit`), em vez da linha 8 da branch.

A migration, além disso, **já está aplicada em produção** segundo a main: `supabase/MIGRATIONS_SYNC_LOG.md:1135` — run 43322428599, 2026-11-13 02:30:43 UTC, status `aplicada`. A mudança de status `pendente` → `aguardando_merge` que a branch fazia no log está obsoleta. Resto da branch: 166 linhas de PENDENCIAS + 323 de RELATORIO_CI = ruído.

## 7. gifts-pr2717-wip — 0850ef9905 — INCORPORADA

Arquivo por arquivo contra a main:

- `src/pages/dev/UndoToastHarness.tsx` — IDÊNTICO na main
- `e2e/flows/26-catalog-to-kit-flow.spec.ts` — IDÊNTICO na main
- `e2e/flows/magazine-header-align.spec.ts` e `magazine-header-responsive.spec.ts` — o **código** é idêntico; o diff contra a main é só a redação do comentário nas linhas 40-42/41-43. Mesma correção (acionar o link acessível do card em vez do centro do `<article>`).
- `e2e/flows/04r-undo-toast-a11y-keyboard.spec.ts` — main é mais forte: cobre o clique **após** a expiração (`data-expired="true"`, guarda dupla `disabled` + `undone`, main `:148-188`), enquanto a branch simplificou o cenário E para só verificar o dismiss.
- `e2e/catalog/novidades-reposicao-card-parity.spec.ts` — main é superconjunto: tem o helper de diagnóstico `captureRouteReadinessDiagnostics` e `expectRouteTitle` com timeout 45s (`:15-88`, `:68`, `:72`, usado em `:179`), que engloba o guard de URL da branch.
- `e2e/flows/04p-quotes-expiration-column.spec.ts` — a main foi por outro caminho, deliberado e mais completo: `requireLiveDatabaseAuth` + `assertPublicSupabaseKey` do helper `quotes-status-seed` (main `:16`, `:20`, `:268`), em vez do `installMockAuth` + mock de rota `QUOTES_REST` da branch.
- `playwright.config.ts` — main é superconjunto: mantém `forceStartServer`/`localServerPort`/reporter JSON da branch e adiciona `E2E_SERVER_MODE=preview` (`useProductionPreview`) com timeout de 240s.
- `.github/workflows/replenishment-quality.yml` — main é superconjunto: gate de relevância (`uses: ./.github/workflows/_e2e-relevance.yml`), `E2E_MOCK_AUTH`, `--workers=1`, `E2E_SERVER_MODE: preview`, `if-no-files-found: error`. O **único** item da branch ausente na main é o gatilho `pull_request:`, **removido de propósito** na main com justificativa registrada no próprio arquivo: "E2E fora dos PRs (14/11): os PRs apontavam o E2E para o Supabase de produção e sobrecarregavam o banco." Decisão da main, não trabalho perdido.

## 8. importado/vps-fabrica/v2/refazer-3cedf88f — 67e6be891c — APROVEITAR

**O que é, em linguagem de negócio:** o cabeçalho de trabalho do gerador de mockups. Numa linha mostra o cliente selecionado e o nome do projeto, oferece "Trocar cliente" (que, se já há marca do cliente aplicada na peça, **pergunta antes** o que fazer com ela — manter ou remover — em vez de trocar em silêncio) e um atalho "Meus mockups" para o histórico. Soma-se um botão "Voltar" no topo do wizard que recua uma etapa **sem** resetar as escolhas já feitas.

**Arquivos:**
- `src/pages/mockups/mockup-generator/MockupToolbar.tsx` (+104/-16) — cabeçalho, tipo `ClientBrandDisposition`, `ConfirmDialog` de troca de cliente, link do histórico
- `src/components/mockup/MockupWizard.tsx` (+30) — botão "Voltar"
- `src/pages/mockups/mockup-generator/__tests__/MockupToolbar.header.test.tsx` (169 linhas, AUSENTE na main)
- `src/pages/mockups/mockup-generator/__tests__/MockupToolbar.test.tsx` (+27/-...)

**Prova de ausência na main:** `git grep -n -e ClientBrandDisposition -e "Trocar cliente" -e "Meus mockups" -e mockup-toolbar-client -e change-client-dialog -e hasAppliedBrand -e "Voltar para a etapa anterior" origin/main -- src e2e tests` → **zero resultados**. A `MockupToolbar.tsx` da main continua com o header antigo: comentário `MockupToolbar — Extracted undo/redo/save status bar from MockupGenerator` e `interface MockupToolbarProps` com exatamente 7 props (`canUndo, canRedo, onUndo, onRedo, isDraftSaving, lastSaved, draftError`), sem `client`, `projectName`, `hasAppliedBrand`, `onChangeClient` nem `historyHref`.

**Completo ou pela metade:** **pela metade.** O componente e os testes estão prontos, mas a página não alimenta o cabeçalho: em `67e6be891c:src/pages/mockups/MockupGenerator.tsx:307` o `<MockupToolbar>` continua recebendo só os 7 props antigos. Como os novos são opcionais, na prática a tela mostraria "Sem cliente" e o botão "Trocar cliente" desabilitado. Falta ligar cliente/projeto/marca aplicada do estado da página. A rota de destino do atalho já existe na main (`src/routes/tools-routes.tsx:83`, `/mockups/historico`) e o `ConfirmDialog` também (`src/components/ui/ConfirmDialog.tsx` PRESENTE).

## 9. importado/vps-fabrica/v2/refazer-9d7ee7e0 — 9c8e028341 — DESCARTAR

Diff byte-a-byte idêntico à #8 (sha256 igual, e `git rev-parse` das duas árvores dá o mesmo `0cc9d3d53585b051a92ca82a0c28c0eb44039eac`). Preservar a #8 preserva 100% deste trabalho.

## 10. importado/vps-fabrica/v2/refazer-1ba38463 — c11b02acb6 — APROVEITAR

**O que é, em linguagem de negócio:** quando o carregamento das **técnicas de personalização** ou do **catálogo de produtos** falha, o painel de configuração do mockup passa a avisar no próprio bloco ("Não foi possível carregar técnicas/produtos" + botão "Tentar novamente"), em vez de a tela mentir — hoje a técnica cai no vazio "Selecione um produto primeiro" e o catálogo aparece como "Nenhum resultado", como se não houvesse nada, e o usuário não tem como repetir a carga.

**Arquivos:**
- `src/components/mockup/MockupConfigPanelLoadError.tsx` (53 linhas, AUSENTE na main) — o aviso compacto `LoadErrorBlock`
- `src/components/mockup/MockupConfigPanel.tsx` (+34) — props `techniquesError`/`onRetryTechniques`/`productsError`/`onRetryProducts` e os dois avisos no lugar certo
- `tests/components/mockup/MockupConfigPanel.errors.test.tsx` (191 linhas, AUSENTE na main)

**Prova de ausência na main:** `git grep -n -e LoadErrorBlock -e mockup-techniques-error -e mockup-products-error -e techniquesError -e onRetryTechniques -e "Não foi possível carregar técnicas" origin/main -- src tests e2e` → os **únicos** 4 resultados são um `productsError` sem relação nenhuma, em `src/pages/system/ExternalDatabaseTest.tsx:37,162,178,180` (tela de teste de banco externo). Nenhum equivalente no painel de mockup, com qualquer nome.

**Completo ou pela metade:** **pela metade.** Componente + props do painel + testes prontos, mas na própria branch nenhuma página passa `techniquesError`/`productsError` (grep em `c11b02acb6 -- src/pages src/components` só devolve o `ExternalDatabaseTest.tsx` alheio). Falta ligar o estado de erro de quem carrega técnicas e produtos. Dependência `src/components/ui/alert.tsx` já existe na main.

## 11. importado/vps-fabrica/v2/refazer-a76f3b50 — 44bf48be22 — DESCARTAR

Diff byte-a-byte idêntico à #10 (sha256 igual). Preservar a #10 preserva 100% deste trabalho.

## 12 e 13. claude_pink/focused-lamport-qyupp8 e gifts-pr2688-wip — e314d1cba2 — INCORPORADA

As duas branches apontam para o **mesmo commit**. Arquivo por arquivo contra a main:

- `src/components/ui/__tests__/calendar.redesign.test.tsx` — IDÊNTICO na main
- `src/components/ui/__tests__/date-picker-field.test.tsx` — IDÊNTICO na main
- `supabase/migrations/20261027220000_deactivate_xbz_image_uploader_cron.sql` — IDÊNTICO
- `supabase/migrations/20261027230000_cleanup_get_edge_function_secret_allowlist.sql` — IDÊNTICO
- `supabase/migrations/20261027160000_deactivate_image_dimensions_backfill_cron.sql` — IDÊNTICO
- `src/components/ui/__tests__/calendar.dimensions.test.tsx` — mesma adaptação ao react-day-picker v10, resolvida de forma equivalente na main: `[aria-selected="true"] button` (main `:73-74`) e `td[role="gridcell"] button` (main `:107-110`) contra `[aria-selected="true"]` e `td > button` na branch. A da main é mais precisa (desce até o `<button>` e exige o `role`).
- `supabase/migrations/20261027120000_fix_connections_auto_test_cron_secret.sql` — comportamento equivalente; a guarda replay-safe da main (`to_regclass('cron.job') IS NULL OR NOT EXISTS (... jobname = 'connections-auto-test')`) cobre os dois casos que a branch tratava em blocos separados (pg_cron ausente e job ausente). Diferença restante é acentuação e a variável intermediária `v_job_id`.
- `scripts/migration-ledger-remote-only-allowlist.json` — main é SUPERCONJUNTO exato: **0** versões presentes só na branch, **31** presentes só na main (ex.: 20261027160000, 20261027180000, 20261029160339, 20261031000000, 20261101140001, 20261101140002).
- `e2e/catalog/novidades-reposicao-card-parity.spec.ts` — main é superconjunto (mesmo helper `expectRouteTitle` + diagnósticos descrito no item 7).
- `.github/workflows/db-schema-drift-check.yml` — main é superconjunto: tem o pre-pull ghcr.io com `docker login`, o `concurrency` e a guarda de credenciais da branch, e adiciona as PG* do pooler IPv4 (`:110-118`), `validate-migration-target.mjs --require-live-pooler` (`:157-160`), o detector E12 de índices out-of-band (`:179-228`) e `concurrency.group` separando standalone de E40. O gatilho `pull_request:` foi removido de propósito, com justificativa no arquivo (duplicava o detector `check-schema-paths` do E40 e abria uma 2ª sessão no banco canônico por PR).

**Único hunk da branch que não está na main:** o fallback anônimo no pre-pull do ghcr.io (`elif docker pull "$POSGRES_IMAGE"`). Não vale resgatar: tem erro de digitação na variável — `$POSGRES_IMAGE` em vez de `$POSTGRES_IMAGE`, que no `set -euo pipefail` do step expandiria vazio — além de indentação quebrada no `break`. É código defeituoso, não trabalho perdido.

---

## Conclusão operacional

Só **3 branches** carregam código de produção ausente da main, e as três são do mesmo trem de mockup:

1. `importado/vps-fabrica/v2/refazer-64fc7ecf` (46ae4276c3) — listagem de mockups do cliente para anexar em orçamento
2. `importado/vps-fabrica/v2/refazer-3cedf88f` (67e6be891c) — cabeçalho de trabalho do gerador + "Voltar" sem reset
3. `importado/vps-fabrica/v2/refazer-1ba38463` (c11b02acb6) — avisos de falha de carga no painel de configuração

As três estão **pela metade** no mesmo sentido: componente/hook + testes completos, sem a ligação na página que os consome. As outras 10 estão provadamente incorporadas (ou são duplicata exata de uma das três acima) e não perdem trabalho se ficarem apagadas.
