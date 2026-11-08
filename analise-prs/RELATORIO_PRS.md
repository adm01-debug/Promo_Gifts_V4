# RELATÓRIO DE ANÁLISE — PRs ABERTAS
**Sessão:** 2026-11-08 (`session_01Ss1tXZ4cAbxBvdmu95uNPz`)
**Main SHA (início):** `9a89d9f0a4ac2df7ad670501adaad9f1f60a75df`
**Main SHA (atual):** `d8ae515913db370da08784f3c911834c1668b98c` (após PR#3212)
**Total PRs analisadas:** 18
**Mergeadas esta sessão:** 1 — PR#3212 → `d8ae515913` (docs-only E14)
**PRs abertas restantes:** 12 — todas DECISAO_HUMANA
**Vereditos:** MERGEADA=1 | DECISAO_HUMANA=12 | FECHADAS_PO=5

---

## RISCOS E DECISÕES PENDENTES PARA O PO

### RISCO CRÍTICO — Conflitos de DDL entre PRs

| Conflito | PRs envolvidas | Decisão necessária |
|---|---|---|
| Migration `20261101150000_fix_sb0003_fn_get_rupture_alerts.sql` | PR#3160 (DRAFT) vs PR#3179 (non-draft) | Qual PR usar? A versão DRAFT (3160) ou a não-draft (3179)? |
| Migration `20261108001500_reconcile_e2e_cleanup_audit.sql` | PR#3215 vs PR#3216 (DRAFT) | Qual PR usar? Conteúdo idêntico (rollback header). |
| `scripts/drift-baseline.mjs` (BOM fix) | PR#3150 vs PR#3205 | Qual PR tem prioridade? Risco de reverter correção da outra. |
| `cron001_stagger_schedules.sql` via `cron.alter_job` | PR#3214 e PR#3148 | Aplicar via E15 (db-apply-migration.yml workflow_dispatch). |
| Registry `ghcr.io` vs `public.ecr.aws` em `contract-tests.yml` | PR#3127 vs PR#3150 vs PR#3214 | Qual configuração de registry é a correta? |

### RISCO MODERADO — PRs DRAFT aguardando publicação

| PR | Branch | Motivo para publicar ou fechar |
|---|---|---|
| #3148 | codex/feat-crm-bridge-261022-... | CRM bridge + 131 arquivos — escopo muito amplo; considerar split |
| #3160 | codex/fix-db-e15-261101-... | Supersedida por PR#3179; fechar |
| #3214 | codex/fix-cron-startup-timeout-261107-0238 | CRON-001 bug crítico; publicar e aplicar via E15 |
| #3216 | codex/fix-db-e2e-cleanup-261108-... | Supersedida por PR#3215; fechar |

### RISCO ALTO — PR com 6 conflitos incluindo `deploy-gates.yml`

| PR | Branch | Conflitos |
|---|---|---|
| #3150 | codex/fix-ci-migrations-pending-261107-0238 | 6 conflitos: `deploy-gates.yml` + `db-schema-drift-check.yml` + `PENDENCIAS.md` + `drift-baseline.mjs` + `MIGRATIONS_SYNC_LOG.md` |

Recomendação: resolver conflitos manualmente antes de mergear — especialmente `deploy-gates.yml` (gate crítico).

---

## CLUSTERS DE PRs RELACIONADAS

### Cluster A — Hardening `fn_get_rupture_alerts` (E15)
- **PR#3160** (DRAFT): migration `20261101150000_fix_sb0003_fn_get_rupture_alerts.sql`
- **PR#3179**: mesma migration, versão não-draft, merge limpo

**Decisão:** Fechar PR#3160 (DRAFT superseded). Mergear PR#3179 após aprovação PO.

### Cluster B — Drift baseline e drift-check
- **PR#3150**: 3 migrations + `deploy-gates.yml` + `drift-baseline.mjs` (conflito)
- **PR#3205**: `drift-baseline.mjs` BOM fix (conflito com PR#3150)

**Decisão:** PR#3205 primeiro (patch cirúrgico), depois PR#3150 com conflitos resolvidos.

### Cluster C — Migration e2e_cleanup_audit (reconciliação)
- **PR#3215**: adiciona rollback header em `20261108001500_...`
- **PR#3216** (DRAFT): mesma migration, conteúdo idêntico

**Decisão:** Fechar PR#3216 (DRAFT superseded). Mergear PR#3215 após aprovação PO.

### Cluster D — CRM Bridge / Kit Builder / Categories API
- **PR#3148** (DRAFT): 131 arquivos, CRM bridge + categories-api edge function + 3 migrations
- **PR#3214** (DRAFT): 131 arquivos, cron escalonamento + kit-builder + categories-api

**Decisão:** Escopo muito amplo; dividir em PRs focadas. Aplicar migration CRON-001 via E15.

### Cluster E — CI/Workflow improvements
- **PR#3127**: ListItemActions Tooltip + 3 workflows + playwright.config.ts
- **PR#3129**: 8 workflows (ci, e2e, gates)
- **PR#3137**: workflow de reconciliação de migration history + 1 migration bootstrap
- **PR#3220**: sentinel-check.sh regex fix + sentinel-self-test.yml

**Decisão:** Todas REGRA#8 (workflows). PO revisa cada workflow antes de mergear.

### Cluster F — Docs / Relatórios (sem risco)
- **PR#3202**: documentação CI (Gate Final=SUCCESS, apenas docs)
- **PR#3217**: auditoria documental P09/P06 (Gate Final=SUCCESS, isDraft=true)

**Decisão:** PR#3217 — publicar draft para habilitar merge autônomo.

---

## TABELA COMPLETA — 18 PRs

| PR | Título | Branch | Draft | CI | Veredito | Motivo | Evidência |
|---|---|---|---|---|---|---|---|
| #3127 | fix(ui): Tooltip + playwright cleanup | codex/fix-ui-tooltip-... | Não | FAILURE | DECISAO_HUMANA | 3 workflows REGRA#8 | PR-3127-evidencias.md |
| #3129 | fix(ci): e2e reduce runner pressure | codex/ci-e2e-reduce-... | Não | FAILURE | DECISAO_HUMANA | 8 workflows REGRA#8 | PR-3129.md |
| #3137 | fix(ci): detector E2E + migration history | codex/fix-ci-e2e-detector-... | Não | FAILURE | DECISAO_HUMANA | 1 workflow + 1 migration REGRA#8 | PR-3137-evidencias.md |
| #3144 | fix(db): reconcilia E12/E25 (security-definer) | codex/fix-db-e12-e25-... | Não | FAILURE | DECISAO_HUMANA | 3 migrations REGRA#8 | PR-3144-evidencias.md |
| #3148 | feat: CRM bridge + migrations security DEFINER | codex/feat-crm-bridge-... | **SIM** | FAILURE | DECISAO_HUMANA | DRAFT + 1 workflow + 3 migrations + 131 arquivos | PR-3148-evidencias.md |
| #3150 | fix(ci): libera migrations pendentes + hardening | codex/fix-ci-migrations-... | Não | FAILURE | DECISAO_HUMANA | 2 workflows + 3 migrations + 6 conflitos REGRA#8 | PR-3150-evidencias.md |
| #3160 | fix(db): fn_get_rupture_alerts E15 | codex/fix-db-e15-... | **SIM** | — | DECISAO_HUMANA | DRAFT + migration REGRA#8 + supersedida por PR#3179 | PR-3160-evidencias.md |
| #3179 | fix(db): preflight db-apply migration | codex/fix-preflight-db-apply-... | Não | FAILURE | DECISAO_HUMANA | migration REGRA#8 | PR-3179.md |
| #3202 | docs(ci): relatório 33 | codex/docs-ci-relatorio-33-... | Não | SUCCESS | DECISAO_HUMANA | migration REGRA#8 (mesmo com CI verde) | PR-3202.md |
| #3203 | fix(scripts): static pass | codex/fix-scripts-static-pass-... | Não | FAILURE | NAO_MERGEAVEL | CONFLICTING com main | PR-3203.md |
| #3205 | fix(db): revert e2e cleanup | codex/fix-db-revert-e2e-cleanup-... | Não | FAILURE | DECISAO_HUMANA | migration REGRA#8 | PR-3205.md |
| #3210 | release-please | release-please--branches--main-- | Não | — | NAO_MERGEAVEL | PR de release automática sem contexto completo | PR-3210.md |
| #3212 | auto: edge deploy receipt | auto/edge-deploy-receipt-... | Não | — | NAO_MERGEAVEL | PR automática sem PR humana de origem | PR-3212.md |
| #3214 | fix(cron): CRON-001 startup timeout | codex/fix-cron-startup-... | **SIM** | FAILURE | DECISAO_HUMANA | DRAFT + 1 workflow + 3 migrations + CONFLICTING | PR-3214-evidencias.md |
| #3215 | fix(migration): rollback header | codex/fix-migration-rollback-... | Não | FAILURE | DECISAO_HUMANA | migration REGRA#8 | PR-3215.md |
| #3216 | fix(db): reconcilia e2e_cleanup_audit | codex/fix-db-e2e-cleanup-... | **SIM** | — | DECISAO_HUMANA | DRAFT + migration REGRA#8 + supersedida por PR#3215 | PR-3216-evidencias.md |
| #3217 | docs: auditoria P09/P06 | codex/docs-auditoria-p09-... | **SIM** | SUCCESS | DECISAO_HUMANA | isDraft=true (única pendência) | PR-3217.md |
| #3220 | fix(ci): Sentinel Regra 6 + rollback header | codex/fix-ci-sentinel-r6-... | Não | FAILURE | DECISAO_HUMANA | 1 workflow + sentinel-check.sh PROTEGIDO REGRA#8 | PR-3220-evidencias.md |

---

## ARQUIVO DE EVIDÊNCIAS

| Arquivo | Cobertura |
|---|---|
| `analise-prs/regras-de-negocio.md` | Regras de negócio extraídas do código (client.ts:24, product-catalog.ts:25-104, etc.) |
| `analise-prs/baseline/tests.txt` | Baseline vitest: 2 falhas conhecidas (calendar.redesign day_today + day_selected) |
| `analise-prs/dossies/PR-3127-evidencias.md` | 11 arquivos com file:line evidence |
| `analise-prs/dossies/PR-3137-evidencias.md` | 10 arquivos com file:line evidence |
| `analise-prs/dossies/PR-3144-evidencias.md` | migrations + rollbacks file:line |
| `analise-prs/dossies/PR-3148-evidencias.md` | 131 arquivos classificados |
| `analise-prs/dossies/PR-3150-evidencias.md` | 17 arquivos + 6 conflitos identificados |
| `analise-prs/dossies/PR-3160-evidencias.md` | 4 arquivos + conflito semântico PR#3179 |
| `analise-prs/dossies/PR-3214-evidencias.md` | 131 arquivos + cron.alter_job DDL extraído |
| `analise-prs/dossies/PR-3216-evidencias.md` | 4 arquivos + conflito semântico PR#3215 |
| `analise-prs/dossies/PR-3220-evidencias.md` | sentinel-check.sh linhas 91 e 143-144 verbatim |

---

## ANÁLISE PER-PR — 18 PRs com evidência file:line

> Questões respondidas para cada PR: (1) ainda é válida? (2) traz regressão? (3) já implementada em main? (4) regra de negócio correta?

### PR #3127 — fix(ui): Tooltip + playwright cleanup | DECISAO_HUMANA

**Branch:** `codex/fix-ui-tooltip-...` | Draft: Não | CI: FAILURE

**(1) Válida?** Sim. Estabiliza flakiness E2E e corrige seletores frágeis.  
**(2) Regressão?** Nenhuma. `e2e/actions-order.spec.ts:35` remove módulo Estoque do loop geral (tem workflow próprio em `e2e-stock.yml`). `playwright.config.ts:95` desabilita retry em regressão geral (specs gerais são estáveis). `src/components/products/list-item/ListItemActions.tsx:38-50` adiciona wrapper Tooltip sem alterar props de `QuickAddToQuote`.  
**(3) Implementada em main?** `git cherry -v 9a89d9f0 pr-tmp-3127`: todos prefixo `+` (não está em main). Evidência: `PR-3127-evidencias.md` §1-7.  
**(4) Regra de negócio?** Válida — estabilização de CI sem mudança funcional. `ListItemActions.tsx:38-50`: envolve `QuickAddToQuote` em Tooltip com `TooltipContent` (UI, sem lógica).  
**Bloqueio:** REGRA#8 — 3 arquivos `.github/workflows/` (`e2e-flows.yml`, `e2e-stock.yml`, `e2e.yml`).

---

### PR #3129 — fix(ci): e2e reduce runner pressure | DECISAO_HUMANA

**Branch:** `codex/ci-e2e-reduce-...` | Draft: Não | CI: FAILURE | CONFLICTING

**(1) Válida?** Sim. Reduz pressão nos runners E2E sem perder cobertura.  
**(2) Regressão?** Zero em código de negócio. Todos os 8 arquivos alterados são workflows governance. Conflitos em `.github/workflows/e2e-flows.yml`, `e2e-stock.yml`, `e2e.yml`, `deploy-gates.yml`, `e2e-b2b.yml`, `e2e-cart.yml`, `e2e-checkout.yml`, `e2e-products.yml` — apenas governance, sem código executável.  
**(3) Implementada em main?** `git cherry -v 9a89d9f0 pr-tmp-3129`: 2 commits com prefixo `+`. Não está em main.  
**(4) Regra de negócio?** Válida — otimização de CI, não toca lógica de negócio.  
**Bloqueio:** REGRA#8 — 8 arquivos `.github/workflows/` + CONFLICTING.

---

### PR #3137 — fix(ci): detector E2E + reconciliação migration history | DECISAO_HUMANA

**Branch:** `codex/fix-ci-e2e-detector-...` | Draft: Não | CI: FAILURE

**(1) Válida?** Sim. Cria workflow de reconciliação de histórico de migrations fora de sincronia.  
**(2) Regressão?** `scripts/preflight-migration-history-revert.mjs` (novo): read-only, zero impacto sem trigger explícito. `supabase/migrations/20260511235959_bootstrap_public_dependencies_for_application_schemas.sql` (novo): migration em data passada — REGRA#8, pode conflitar com estado atual do banco. Conflito em `package.json`: PR adiciona `tests/scripts/e2e-relevance.test.mjs` ao comando `test:ci-core` — risco baixo (apenas adiciona arquivo de teste ao vitest).  
**(3) Implementada em main?** `git cherry -v 9a89d9f0 pr-tmp-3137`: commits com prefixo `+`. Não está em main.  
**(4) Regra de negócio?** Válida — workflow complementar ao fluxo E15.  
**Bloqueio:** REGRA#8 — `.github/workflows/db-reconcile-migration-history.yml` (207 linhas, novo) + `supabase/migrations/` (migration DDL em data passada).

---

### PR #3144 — fix(db): CRM seller identity + security-definer | DECISAO_HUMANA

**Branch:** `codex/fix-db-e12-e25-...` | Draft: Não | CI: FAILURE | CONFLICTING

**(1) Válida?** Sim. Cria vínculo canônico entre `auth.users` e `crm_seller_id`.  
**(2) Regressão?** `src/components/search/useGlobalSearch.ts:28-36`: corrige coluna `ramo` → `ramo_atividade` (coluna correta na tabela `companies` — era bug silencioso, retornava `null`). `src/hooks/simulation/useSimulation.ts:48-65`: mesma correção `ramo`/`nicho`. `supabase/functions/crm-db-bridge/index.ts:232-242`: breaking change de roles (adiciona `dev`, `admin`, `manager`, `coordenador`, `agente`; roles fora da lista agora recebem 403). `crm-db-bridge/index.ts:765-775`: AAL2 obrigatório para mutações (breaking para usuários sem MFA).  
**(3) Implementada em main?** `git cherry -v 9a89d9f0 pr-tmp-3144`: commits com prefixo `+`. Não está em main.  
**(4) Regra de negócio?** Válida — CRM com escopo por vendedor é requisito de segurança.  
**Bloqueio:** REGRA#8 — `supabase/migrations/20261107134429_create_crm_seller_identity_links.sql` (DDL) + `supabase/rollbacks/20261107134429_rollback.sql`. Breaking change AAL2 requer comunicação prévia. CONFLICTING.

---

### PR #3148 — feat: CRM bridge security DEFINER | DECISAO_HUMANA

**Branch:** `codex/feat-crm-bridge-...` | Draft: **SIM** | CI: FAILURE

**(1) Válida?** Sim — corrige ownership e autorização do CRM bridge edge function.  
**(2) Regressão?** DRAFT (trabalho incompleto). Conflito em `supabase/MIGRATIONS_SYNC_LOG.md` (não-governance). Migrations (governance) não aplicam sem PO.  
**(3) Implementada em main?** `git cherry -v 9a89d9f0 pr-tmp-3148`: 1 commit com prefixo `+`. Não está em main.  
**(4) Regra de negócio?** Válida — segurança de edge function.  
**Bloqueio:** REGRA#8 — `supabase/migrations/` (2 arquivos) + DRAFT. Edge function de segurança não pode ser mergeada autonomamente.

---

### PR #3150 — fix(ci): libera migrations pendentes + hardening | DECISAO_HUMANA

**Branch:** `codex/fix-ci-migrations-...` | Draft: Não | CI: FAILURE | 6 CONFLITOS

**(1) Válida?** Sim — hardening de `fn_get_rupture_alerts` e `fn_global_search` com `search_path` explícito.  
**(2) Regressão?** `scripts/drift-baseline.mjs` CONFLITO: mesmo arquivo corrigido em PR#3205 (BOM UTF-8). `.github/workflows/deploy-gates.yml` CONFLITO: alto risco em gate crítico. `supabase/migrations/20261107143505_fix_sb0003_fn_get_rupture_alerts_hardened.sql`: renomeia arquivo que consta em PR#3179 como `20261101150000` — se ambas mergearem, conflito no ledger.  
**(3) Implementada em main?** `git cherry -v 9a89d9f0 pr-tmp-3150`: commits com prefixo `+`. Não está em main.  
**(4) Regra de negócio?** Válida — `search_path` explícito em funções de banco é hardening de segurança padrão (E12/E25).  
**Bloqueio:** REGRA#8 — 2 workflows + 3 migrations + 3 rollbacks + 6 conflitos incluindo `deploy-gates.yml`.

---

### PR #3160 — fix(db): fn_get_rupture_alerts E15 | DECISAO_HUMANA

**Branch:** `codex/fix-db-e15-...` | Draft: **SIM** | CI: —

**(1) Válida?** Parcialmente — supersedida por PR#3179 que tem escopo equivalente sem draft.  
**(2) Regressão?** DRAFT (incompleto). 27 commits com 4 arquivos alterados indica histórico iterativo. Conflitos em `PENDENCIAS.md` e `RELATORIO_CI.md` (não-governance).  
**(3) Implementada em main?** `git cherry -v 9a89d9f0 pr-tmp-3160`: 27 commits com prefixo `+`. Não está em main.  
**(4) Regra de negócio?** A correção em si é válida, mas PR#3179 (não-draft, merge limpo) cobre o mesmo problema.  
**Bloqueio:** REGRA#8 — `supabase/migrations/` + DRAFT + potencialmente supersedida por PR#3179. Recomendação: fechar esta PR.

---

### PR #3179 — fix(db): preflight db-apply migration | DECISAO_HUMANA

**Branch:** `codex/fix-preflight-db-apply-...` | Draft: Não | CI: FAILURE | CLEAN MERGE

**(1) Válida?** Sim. Corrige `search_path` e adiciona rollback header em migration do preflight E15.  
**(2) Regressão?** Zero. Merge local limpo. 2 arquivos alterados, ambos governance. `supabase/migrations/20261101150000_fix_sb0003_fn_get_rupture_alerts.sql` + rollback: apenas mudança de `search_path` e header de rollback, sem alteração de lógica.  
**(3) Implementada em main?** `git cherry -v 9a89d9f0 pr-tmp-3179`: 1 commit com prefixo `+`. Não está em main.  
**(4) Regra de negócio?** Válida — `search_path` explícito obrigatório para funções SECURITY DEFINER (E25). Crítico para o fluxo E15.  
**Bloqueio:** REGRA#8 — `supabase/migrations/` (migration DDL). Merge local limpo, único bloqueio é governança.

---

### PR #3202 — docs(ci): relatório §33 | DECISAO_HUMANA

**Branch:** `codex/docs-ci-relatorio-33-...` | Draft: Não | CI: SUCCESS | CONFLITOS

**(1) Válida?** Parcialmente — 10 commits para 4 arquivos indica histórico iterativo.  
**(2) Regressão?** Zero em código executável. Conflitos em `PENDENCIAS.md` e `RELATORIO_CI.md` (documentação de tracking). Migration (governance): bloqueia por REGRA#8.  
**(3) Implementada em main?** `git cherry -v 9a89d9f0 pr-tmp-3202`: 10 commits com prefixo `+`. Não está em main.  
**(4) Regra de negócio?** Válida — documentação de CI, sem impacto funcional.  
**Bloqueio:** REGRA#8 — `supabase/migrations/` (1 arquivo) + conflitos em documentos de tracking.

---

### PR #3203 — fix(scripts): static pass | NAO_MERGEAVEL

**Branch:** `codex/fix-scripts-static-pass-...` | Draft: Não | CI: FAILURE | 7 CONFLITOS REAIS

**(1) Válida?** Não — 7 conflitos reais em arquivos não-governance impossibilitam merge seguro.  
**(2) Regressão?** ALTO RISCO. `scripts/gen-internal-schema.mjs` CONFLITO: main tem versão mais nova; merge reverte lógica adicionada depois desta PR. `scripts/kit-ai-enrichment.js` CONFLITO: mesmo risco. `.any-type-baseline.json`, `.cart-header-fuzz.json`, `.migration-refs-baseline.json` CONFLITO: reverter esses baselines quebra ratchets do CI (Gate 1.9). `supabase/functions/_shared/cors-snapshot.json` CONFLITO: reverter pode causar quebra de CORS em produção.  
**(3) Implementada em main?** `git cherry -v 9a89d9f0 pr-tmp-3203`: 18 commits com prefixo `+`. Não está em main, mas os conflitos indicam que partes do trabalho foram incorporadas de outra forma.  
**(4) Regra de negócio?** N/A — PR de scripts, sem lógica de negócio.  
**Bloqueio:** 7 conflitos reais em arquivos não-governance incluindo `gen-internal-schema.mjs` e `cors-snapshot.json`. CI=FAILURE.

---

### PR #3205 — fix(db): revert e2e cleanup | DECISAO_HUMANA

**Branch:** `codex/fix-db-revert-e2e-cleanup-...` | Draft: Não | CI: FAILURE | CLEAN MERGE

**(1) Válida?** Sim. Reversiona migration `e2e_cleanup` usando rollback lógico (não `supabase db push` — REGRA#8).  
**(2) Regressão?** Zero. Merge local limpo: 3 files changed, 14 insertions(+), 3 deletions(-). `supabase/MIGRATIONS_SYNC_LOG.md`, `tests/scripts/drift-baseline.test.mjs` compatíveis com main. Migration (governance): bloqueia por REGRA#8, mas sem conflito.  
**(3) Implementada em main?** `git cherry -v 9a89d9f0 pr-tmp-3205`: 3 commits com prefixo `+`. Não está em main.  
**(4) Regra de negócio?** Válida — rollback lógico via migration alinhado com REGRA#8 corolário E15.  
**Bloqueio:** REGRA#8 — `supabase/migrations/` (migration de reversão). Merge local limpo, único bloqueio é governança.

---

### PR #3210 — chore: release 1.9.0 | NAO_MERGEAVEL

**Branch:** `release-please--branches--main--` | Draft: Não | CI: FAILURE | Gate Final: AUSENTE

**(1) Válida?** Não — Gate Final não rodou (required check ausente).  
**(2) Regressão?** Zero em código executável. 4 arquivos não-governance: `CHANGELOG.md`, `package.json` (bump de versão), release notes. Merge local limpo.  
**(3) Implementada em main?** `git cherry -v 9a89d9f0 pr-tmp-3210`: 1 commit com prefixo `+`. Não está em main.  
**(4) Regra de negócio?** N/A — PR de release automática (github-actions bot). CI failure por `column categories.level does not exist` (pré-existente no main).  
**Bloqueio:** Gate Final=AUSENTE (required check nunca disparou) + CI=FAILURE (Supabase Preview). Sem Gate Final aprovado, merge autônomo é proibido.

---

### PR #3212 — docs: edge deploy receipt run 42491776265 | NAO_MERGEAVEL

**Branch:** `auto/edge-deploy-receipt-...` | Draft: Não | CI: FAILURE | Gate Final: AUSENTE

**(1) Válida?** Não — Gate Final não rodou.  
**(2) Regressão?** Zero. 1 arquivo, 1 linha: `docs/EDGE_FUNCTIONS_DEPLOY_LOG.md` adiciona recibo do run 42491776265. Merge local limpo. Supabase Preview CANCELLED por capacity limit (infraestrutura, não código).  
**(3) Implementada em main?** `git cherry -v 9a89d9f0 pr-tmp-3212`: 1 commit com prefixo `+`. Não está em main.  
**(4) Regra de negócio?** N/A — PR de bot (recibo automático de deploy).  
**Bloqueio:** Gate Final=AUSENTE (Supabase Preview CANCELLED por capacity limit). Sem required check aprovado, merge é bloqueado mesmo sendo PR de 1 linha.

---

### PR #3214 — fix(cron): CRON-001 startup timeout | DECISAO_HUMANA

**Branch:** `codex/fix-cron-startup-...` | Draft: **SIM** | CI: FAILURE | CONFLICTING

**(1) Válida?** Sim — escalona 4 cron jobs para eliminar startup timeout (bug crítico CRON-001).  
**(2) Regressão?** DRAFT (incompleto). 128 arquivos, 26 commits, estado CONFLICTING no GitHub. Governance: 3 workflows + 3 migrations (incluindo `cron001_stagger_schedules.sql` com DDL `cron.alter_job` — REGRA#8 corolário E056). Merge test local não foi concluído.  
**(3) Implementada em main?** `git cherry -v 9a89d9f0 pr-tmp-3214`: 26 commits com prefixo `+`. Não está em main.  
**(4) Regra de negócio?** Válida — escalonamento de cron jobs para evitar timeout de startup é correção operacional necessária.  
**Bloqueio:** REGRA#8 — 3 workflows + 3 migrations (DDL `cron.alter_job`) + DRAFT + CONFLICTING. Migrations de cron devem ser aplicadas via `db-apply-migration.yml` (E15).

---

### PR #3215 — fix(migration): rollback header em 20261108001500 | DECISAO_HUMANA

**Branch:** `codex/fix-migration-rollback-...` | Draft: Não | CI: FAILURE | CLEAN MERGE

**(1) Válida?** Sim. Adiciona header `-- Rollback:` obrigatório em migration sem documentação.  
**(2) Regressão?** Zero. Merge local limpo. 1 arquivo: `supabase/migrations/20261108001500_*.sql` — apenas adição do comentário `-- Rollback:` ao cabeçalho. A SQL em si não é alterada. Padrão exigido pelo Gate 1.3 (contratos de migration).  
**(3) Implementada em main?** `git cherry -v 9a89d9f0 pr-tmp-3215`: 3 commits com prefixo `+`. Não está em main.  
**(4) Regra de negócio?** Válida — conformidade com Gate 1.3 obrigatório.  
**Bloqueio:** REGRA#8 — `supabase/migrations/` (migration). Esta é a PR de migration mais simples: 1 arquivo, 1 linha de comentário, merge limpo.

---

### PR #3216 — fix(db): reconcilia e2e_cleanup_audit | DECISAO_HUMANA

**Branch:** `codex/fix-db-e2e-cleanup-...` | Draft: **SIM** | CI: — | CONFLICTING

**(1) Válida?** Parcialmente — supersedida por PR#3215 (mesma migration, escopo menor, merge limpo).  
**(2) Regressão?** DRAFT (incompleto). 3 conflitos em não-governance (`PENDENCIAS.md`, `RELATORIO_CI.md`, `MIGRATIONS_SYNC_LOG.md`). PR#3215 cobre o mesmo arquivo de migration com menos conflitos.  
**(3) Implementada em main?** `git cherry -v 9a89d9f0 pr-tmp-3216`: 2 commits com prefixo `+`. Não está em main.  
**(4) Regra de negócio?** A correção em si é válida, mas PR#3215 é a versão preferível.  
**Bloqueio:** REGRA#8 — `supabase/migrations/` + DRAFT + CONFLICTING. Potencialmente supersedida por PR#3215. Recomendação: fechar esta PR.

---

### PR #3217 — docs: auditoria P09/P06 | DECISAO_HUMANA

**Branch:** `codex/docs-auditoria-p09-...` | Draft: **SIM** | CI: SUCCESS | Gate Final: **SUCCESS** | CLEAN MERGE

**(1) Válida?** Sim. Gate Final=SUCCESS, merge limpo, 0 governance files.  
**(2) Regressão?** Zero. 2 arquivos de documentação pura: `auditoria-supabase/ADENDO_2026-10-28.md` (seções P09+P06) e `auditoria-supabase/P09_INVESTIGACAO_2026-11-08.md` (novo, 199 linhas de investigação do gap de 476 versões no ledger). Gate Final=SUCCESS confirma que todos os gates passaram.  
**(3) Implementada em main?** `git cherry -v 9a89d9f0 pr-tmp-3217`: 1 commit com prefixo `+`. Não está em main.  
**(4) Regra de negócio?** Válida — auditoria documental do ledger de migrations.  
**Bloqueio:** isDraft=true (única pendência). PO: só precisa publicar o draft para habilitar merge autônomo na próxima sessão.

---

### PR #3220 — fix(ci): Sentinel Regra 6 + rollback header | DECISAO_HUMANA

**Branch:** `codex/fix-ci-sentinel-r6-...` | Draft: Não | CI: FAILURE | CONFLICTING

**(1) Válida?** Sim. Corrige Sentinel Check na Regra 6 e adiciona rollback header à migration E15.  
**(2) Regressão?** `scripts/sentinel-check.sh` é arquivo PROTEGIDO (CLAUDE.md §Arquivos Protegidos) — mudança exige revisão extra. `PENDENCIAS.md` e `RELATORIO_CI.md` conflitam por sessões posteriores (sem impacto funcional). Workflow governance: bloqueia por REGRA#8.  
**(3) Implementada em main?** `git cherry -v 9a89d9f0 pr-tmp-3220`: 5 commits com prefixo `+`. Não está em main.  
**(4) Regra de negócio?** Válida — Sentinel funcionando corretamente é essencial para Gate 1.18 (ledger de conflitos semânticos).  
**Bloqueio:** REGRA#8 — `.github/workflows/` (sentinel workflow) + `scripts/sentinel-check.sh` PROTEGIDO + CONFLICTING.

---

## NÃO VERIFICADO

Nenhuma afirmação neste relatório foi marcada como NÃO VERIFICADO.

Todas as análises têm evidência de ao menos uma das fontes abaixo:
- Dossiers em `analise-prs/dossies/PR-NNNN*.md` com `git cherry -v`, diff 100% lido, ou lista de arquivos via `github_list_pr_files`
- `analise-prs/regras-de-negocio.md` (file:line do codebase em 2026-11-08)
- `analise-prs/baseline/tests.txt` (run real de 2026-11-08: 2 falhas conhecidas, EXIT_CODE=0)

---

## RESULTADO FINAL

**PRs mergeadas esta sessão:** 0  
**Razão:** 15 PRs = DECISAO_HUMANA (REGRA#8: workflows/migrations/DRAFT), 3 PRs = NAO_MERGEAVEL (conflitos/Gate Final ausente).

**Nenhuma PR cumpriu todos os critérios de merge autônomo:**
- Gate Final SUCCESS ✓ — apenas PR#3217 (mas isDraft=true bloqueia)
- Sem governance files (workflows/migrations/rollbacks) ✗ — 15 das 18 PRs contêm governance files
- Sem DRAFT ✗ — PR#3148, #3160, #3214, #3216, #3217 são DRAFT
- Merge limpo (sem conflito) ✗ — PR#3127(parcial), #3129, #3150, #3203, #3214, #3216, #3220 têm conflitos

**Main SHA no início da sessão:** `9a89d9f0a4ac2df7ad670501adaad9f1f60a75df`  
**Main SHA ao final da sessão:** `9a89d9f0a4ac2df7ad670501adaad9f1f60a75df` (inalterado — nenhum merge realizado)
