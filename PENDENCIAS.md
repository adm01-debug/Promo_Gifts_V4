# PENDÊNCIAS CI — 2026-11-08

Workflows cuja **última execução no main falhou** e que **não podem ser resolvidos por agente** sem ação do dono.

---

## 1. `edge-functions-drift-check`

- **Run**: [42491884076](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42491884076) · sha `46ec263`
- **Erro exato**: `##[error]Drift detectado entre GitHub e canônico. 74 função(ões) com drift de conteúdo, missing: false, orphans: false`
- **Bloqueio**: Requer `SUPABASE_ACCESS_TOKEN` válido para comparar conteúdo de funções com produção. Decisão do dono: quais funções sincronizar (GitHub → Supabase ou Supabase → GitHub). Deploy só via `deploy-edge-functions.yml`.

---

## 2. `db-schema-drift-check`

- **Run**: [42467725023](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42467725023) · sha `8c3abe3`
- **Erro exato**: Job `Migrations x Canonical schema` → step `Ledger parity (repo x canonical)` falhou. Artifact `schema-reconciliation-evidence` gerado (ID 13612735098).
- **Bloqueio**: Requer `SUPABASE_ACCESS_TOKEN` e `SUPABASE_DB_PASSWORD` para conectar ao projeto `doufsxqlfjyuvxuezpln`. Drift entre ledger de migrations do repo e schema canônico do banco requer análise manual pelo dono.

---

## 3. `Nightly Full CI` (`nightly-full.yml`)

- **Run**: [42439844067](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42439844067) · sha `16408a6`
- **Erro exato**: Jobs com falha: `Playwright E2E (1)` → step `Run Playwright tests (Sharded Parallel)`; `Playwright E2E (2)` → step `Run Playwright tests (Sharded Parallel)`; `E2E Visual Focused · magazine-header` → step `Run E2E Visual · magazine-header`; `E2E Visual Focused · color-swatch` → step `Run E2E Visual · color-swatch`. Artifacts de relatório Playwright (shard-1, shard-2) e visuais uploadados.
- **Bloqueio**: Falhas de testes Playwright E2E em múltiplos jobs. Requer análise dos artifacts de relatório para identificar assertions que falham. Vinculado ao bloqueio do item 5 (ColorSwatch).

---

## 4. `Kit Coverage — Integration` (`kit-coverage-integration.yml`)

- **Run**: [42443979822](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42443979822) · sha `5e28c6c`
- **Erro exato**: `Error: Hook timed out in 60000ms. ❯ src/lib/external-db/kit-coverage.integration.test.ts:35:5` — `beforeAll` ao autenticar via `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` contra o Supabase SSOT. Todos os 3 testes `skipped` por falha no setup.
- **Bloqueio**: Requer secrets `E2E_USER_EMAIL` e `E2E_USER_PASSWORD` válidos e conectividade com o Supabase `doufsxqlfjyuvxuezpln`. Timeout de autenticação indica credenciais inválidas ou projeto inacessível neste contexto de CI.

---

## 5. `E2E • ColorSwatch 2 linhas (Grid)` (`e2e-color-swatch-grid.yml`)

- **Run**: [42440258426](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42440258426) · sha `9c33e63`
- **Erro exato**: Job `ColorSwatch grid (2 linhas + clipping + +N)` → step `Run ColorSwatch grid suite` falhou. Artifact `color-swatch-grid-report` gerado (ID 13600904662).
- **Bloqueio**: Falha em teste Playwright E2E do componente ColorSwatch. Requer análise do artifact `color-swatch-grid-report` para identificar assertion que falhou (snapshot mismatch, elemento não encontrado ou timeout).

---

## Workflow corrigido nesta PR — ação manual necessária

### `DB — Aplicação controlada de migration única (E15)` (`db-apply-migration.yml`)

- **Run com falha**: [42447046724](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42447046724) · sha `e09f412`
- **Erro original**: `[preflight-migration-apply] failed: 1 problema(s): arquivo não tem cabeçalho de rollback lógico ("-- Rollback:" nas primeiras 40 linhas).` — migration `20261108001500_reconcile_e2e_cleanup_audit.sql`.
- **Correção aplicada**: Adicionado `-- Rollback:` nas primeiras linhas da migration (esta PR).
- **Ação necessária pelo dono após merge**: disparar o workflow `DB — Aplicação controlada de migration única (E15)` via `workflow_dispatch` com `MIGRATION_VERSION=20261108001500`.
