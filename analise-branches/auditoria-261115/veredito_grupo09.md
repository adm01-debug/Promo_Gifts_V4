# Veredito — grupo 09 (13 branches)

Método: para cada branch, `git diff <merge-base> <sha>` (trabalho real da branch) e depois
comparação blob-a-blob do arquivo da branch contra `origin/main`. Para cada linha que a branch
adicionou, busca literal dessa linha no arquivo correspondente da `main`; as sobras foram lidas
uma a uma. Nenhuma branch apagou ou renomeou arquivo; todo arquivo novo criado pelas branches
existe na `main`.

**Resultado: 13 de 13 INCORPORADA. Nenhum trabalho de produção se perde ao apagar essas branches.**

---

## 1. claude/fix-mockup-seletor-cliente-cetico-261114-2310 — `2d5d7afc11` — INCORPORADA
Logo do cliente do CRM + combobox acessível no seletor de empresa do mockup (5 arquivos, 775 linhas).
- `clientLogoFile.ts` e `MockupClientSelector.logo.test.tsx`: **blob idêntico** ao da `main`.
- `MockupClientSelector.tsx` e `MockupConfigPanel.tsx`: **nenhuma** linha adicionada pela branch falta na `main`.
  Evidência: `origin/main:src/components/mockup/MockupClientSelector.tsx:21` (`import { CompanyAvatar }`),
  `:271` (`aria-controls`), `:188` e `:420` (uso do avatar). A `main` foi além: extraiu `CompanyAvatar`
  para arquivo próprio e trocou a remoção direta da empresa por `ConfirmDialog`.
- `MockupClientSelector.a11y.test.tsx`: as 2 únicas linhas fora da `main` são a assinatura antiga do
  helper de teste (`function renderSelector() {`), que a `main` generalizou em
  `origin/main:src/components/mockup/__tests__/MockupClientSelector.a11y.test.tsx:60` e `:69`.

## 2. claude/fix-perf002-brecha-261112 — `f0480ee4fd` — INCORPORADA
Fecha a brecha PERF002: remove de produção a função `SECURITY DEFINER` que dropava índices.
- `supabase/migrations/20261108223100_drop_perf002_incident_ddl_survivor.sql` e
  `supabase/rollbacks/20261108223100_rollback.sql`: **blob idêntico** ao da `main`
  (commit da `main`: `492f63d2d`).
- Único conteúdo exclusivo: 2 linhas de recibo em `supabase/MIGRATIONS_SYNC_LOG.md` (escrituração,
  não código). A `main` tem uma versão mais recente e mais completa desse log.

## 3. claude/fix-sentinel-push-range-261106-1517 — `1da7d2ebce` — INCORPORADA
Sentinel passa a auditar todo o intervalo first-parent do push (squash não esconde commit sem PR).
- `scripts/sentinel-push-range.sh`: **blob idêntico** ao da `main`.
- `tests/scripts/sentinel-push-range.test.mjs`: idêntico, só falta a quebra de linha final.
- Chamada e wiring na `main`: `origin/main:.github/workflows/branch-protection-sentinel.yml:123-124`
  e `origin/main:.github/workflows/sentinel-self-test.yml:10-11,193`. Changelog em
  `origin/main:.github/SENTINEL_CHANGELOG.md:3` e `:120`.
- A única linha exclusiva da branch é uma **regressão**: ela trocou
  `Authorization: Bearer $GH_TOKEN` por `Authorization: ******` no job `check-protection-config`,
  job que a `main` removeu (consolidado em `required-checks-guard.yml`, v2.2.0). Não é trabalho a preservar.

## 4. claude/fix-stock-notes-soft-delete-261101-1240 — `6f9dfb269d` — INCORPORADA
Soft-delete em `stock_notes` (Gate 1.12): coluna `deleted_at` + índice parcial de linhas ativas.
Evidência na `main`: `origin/main:supabase/migrations/20261031000000_create_stock_notes.sql:20`
(`deleted_at timestamptz DEFAULT NULL`) e `:27-29` (`stock_notes_active_idx ... WHERE deleted_at IS NULL`,
só reformatado em 3 linhas).

## 5. claude/fix-ts-unused-rupture-20261101-2300 — `54b3cf2d9c` — INCORPORADA
Corrige TS2339 em `useRuptureAlerts` (precedência de `as`/`await` no RPC de alertas de ruptura).
A `main` corrigiu o **mesmo bug de outra forma** no commit `68d809ccb`
("fix(stock): TS2339 em useRuptureAlerts — precedência do cast as/await (SB-0003)", ancestral de `main`):
`origin/main:src/hooks/stock/useRuptureAlerts.ts:73` (`await ((supabase as any)`) e `:79`
(`.limit(MAX_ROWS) as Promise<{...}>);`). A branch move o parêntese para o outro lado — equivalente.

## 6. claude/fix-unit-tests-261027-0113 — `9bfead1417` — INCORPORADA
4 falhas de unit test + 1 threshold E2E.
- `chunk-recovery.shared-reload-budget.test.ts` e `replenishment-resilience.test.ts`: **blob idêntico** à `main`.
- Snapshot do `NegotiationMarkupCard`: chaves sem aspas já na `main` —
  `origin/main:src/components/quotes/__tests__/__snapshots__/NegotiationMarkupCard.visualA11y.test.tsx.snap:3` e `:314`.
- Threshold `replGap`: a branch subiu 64→96; a `main` está em 100 (superconjunto) —
  `origin/main:e2e/catalog/novidades-reposicao-card-parity.spec.ts:344`.
- `PromoFlixPlayer`: a `main` extraiu a lógica para hook; o mesmo fix (manter o flag ativo quando o
  mute foi forçado pelo autoplay) está em
  `/home/user/Promo_Gifts_V4/src/components/products/gallery/usePromoFlixPlayer.ts:406-411`.

## 7. claude/infra-e2e-fora-dos-prs-261114-1708 — `9e959a701e` — INCORPORADA
Tira o E2E dos PRs em 25 workflows (os PRs apontavam o E2E para o Supabase de produção).
23 dos 25 arquivos têm **blob idêntico** ao da `main`. Os 2 restantes a `main` levou adiante:
- `origin/main:.github/workflows/global-search-gate.yml:4` tem a mesma linha de comentário e **nenhum**
  gatilho `pull_request` (a `main` só removeu também o webkit do job).
- `e2e-stock.yml`: a `main` removeu `pull_request` **e** `push`, passando a `schedule` + `dispatch`
  (`origin/main:.github/workflows/e2e-stock.yml:8,25-26`) — superconjunto do que a branch fez.

## 8. claude/infra-e2e-fora-dos-prs-261115-1210 — `0137dedead` — INCORPORADA
Mesmo commit do item 7 em outra base (duplicata). Mesma prova, arquivo por arquivo.

## 9. claude/infra-trem-edge-bom-recibo-e66-workflows-261115-1230 — `96ebcf3f80` — INCORPORADA
Trem com 4 commits: BOM/CRLF da edge `asia-ingestion`, recibo de deploy, E2E fora dos PRs e
`update-snapshots` com baselines autenticados nos 3 navegadores.
- `supabase/functions/asia-ingestion/index.ts`: **blob idêntico** à `main` (BOM já removido).
- `supabase/EDGE_FUNCTIONS_DEPLOY_LOG.md`: **blob idêntico**.
- `.github/workflows/update-snapshots.yml`: **blob idêntico**; opção `all-authed` em
  `origin/main:.github/workflows/update-snapshots.yml:21,63,71`.
- Os 2 workflows de E2E: mesma prova do item 7 (a `main` foi além).

## 10. importado/vps-fabrica/v2/fix-arraste-e-ajuste-da-logo-com-teclado-2610081919 — `3437a03e97` — INCORPORADA
Arraste da logo pelo teclado, limites por tamanho/rotação e `pointercancel` no editor de mockup.
- `logo-editor/useLogoDrag.ts` e seu teste: **blob idêntico** à `main`.
- Wiring na `main`: `origin/main:src/components/mockup/LogoPositionEditor.tsx:143` (`handleKeyDown` do hook)
  e `:190` (`onKeyDown={handleKeyDown}`); `origin/main:src/components/mockup/logo-editor/LogoPreviewCanvas.tsx:234,259,318-322`
  (`role="group"`, `tabIndex`, `onKeyDown`) e `:267,325` (texto `sr-only` das instruções de teclado,
  só reescrito: "Use setas do teclado…").

## 11. importado/vps-fabrica/v2/fix-busca-de-cliente-do-mockup-consulta--2610081917 — `0f9c51d5e6` — INCORPORADA
Busca de cliente do mockup consulta o CRM com debounce e separa "indisponível" de "não encontrado".
- `origin/main:src/components/mockup/MockupClientSelector.tsx:33-34` (`SEARCH_SELECT`), `:41-42`
  (duas consultas ao CRM), `:47` (dedupe + filtro, na `main` mais estrito: `!c.is_customer` em vez de
  `c.is_customer === false`), `:89` (`useDebounce`).
- `MockupClientSelector.test.tsx`: igual linha a linha à da `main`
  (`origin/main:src/components/mockup/__tests__/MockupClientSelector.test.tsx:70,86,102,110`), só sem o
  `async` que a `main` tirou do helper.

## 12. importado/vps-fabrica/v2/m21-2610082248 — `67b7c01e78` — INCORPORADA
Edge `word-magic` com limite de uso, quota e registro de consumo (F-08).
- `tests/edge-functions/word-magic.limits.test.ts`: **blob idêntico** à `main`.
- `index.ts`: **nenhuma** linha adicionada pela branch falta na `main` —
  `origin/main:supabase/functions/word-magic/index.ts:10-11` (imports de `rate-limiter` e `ai-usage`),
  `:15` (`AI_FUNCTION_NAME`), `:105` (registro de consumo), `:185-196` (`acquireAiQuota` → 429).
- `index.limits.test.ts`: só 2 linhas fora da `main`, ambas obsoletas — o `PRODUCT_ID` de teste
  (a `main` usa um UUID v4 válido em `:20`) e o mock do especificador `https://esm.sh/...`, que a `main`
  trocou por `npm:@supabase/supabase-js@2.49.4` em `:67`, acompanhando o import real
  (`origin/main:supabase/functions/word-magic/index.ts:1`).

## 13. importado/vps-fabrica/v2/refazer-6b861386 — `edbf194c6f` — INCORPORADA
Mesmo commit do item 12 em outra base (duplicata). Mesma prova, arquivo por arquivo.
