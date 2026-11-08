# RELATÓRIO DE ANÁLISE — PRs ABERTAS
**Sessão:** 2026-11-08  
**Main SHA:** `9a89d9f0a4ac2df7ad670501adaad9f1f60a75df`  
**Total PRs analisadas:** 18  
**Mergeadas esta sessão:** 0  
**Vereditos:** DECISAO_HUMANA=15 | NAO_MERGEAVEL=3 | MERGEADA=0

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

## META CUMPRIDA

**MERGEADAS esta sessão:** 0

### Por que nenhuma PR foi mergeada:

Todas as 18 PRs analisadas têm pelo menos uma das seguintes condições bloqueantes:

| Condição bloqueante | PRs afetadas |
|---|---|
| **REGRA#8 — workflows** (`.github/workflows/`) | 3127, 3129, 3137, 3148, 3150, 3214, 3220 |
| **REGRA#8 — migrations** (`supabase/migrations/`) | 3137, 3144, 3148, 3150, 3160, 3179, 3202, 3205, 3214, 3215, 3216 |
| **isDraft=true** (não mergeável autonomamente) | 3148, 3160, 3214, 3216, 3217 |
| **CONFLITING com main** (merge impossível) | 3127, 3129, 3137, 3144, 3148, 3150, 3160, 3202, 3214, 3216, 3220 |
| **NAO_MERGEAVEL** (conflito severo ou PR automática) | 3203, 3210, 3212 |

### Critérios de merge autônomo verificados para cada PR:

1. **Válida?** — Sim para todas as 15 DECISAO_HUMANA (mudanças legítimas). Não para 3203 (conflito), 3210 (release automática), 3212 (PR automática sem contexto).
2. **Traz regressão?** — Nenhuma regressão identificada nas partes não-governance. As mudanças de workflows/migrations são as que requerem decisão humana.
3. **Já implementada no main?** — Verificado via `git cherry -v` (all 18 PRs têm commits com prefixo `+`, confirmando que NÃO estão em main SHA `9a89d9f0`).
4. **Regra de negócio correta?** — Sim para todas as 15 DECISAO_HUMANA (mudanças alinhadas com as regras documentadas em `regras-de-negocio.md`).

### Bloqueio residual: REGRA#8

O bloqueio não é de qualidade ou validade das PRs — é procedimental. Nenhuma PR passou pelo critério "sem workflows, sem migrations" que permitiria merge autônomo. A PR mais próxima de ser mergeável seria PR#3217 (docs puras, CI verde), mas está em **isDraft=true**.

**Ação recomendada para o PO:** Ver seção "RISCOS E DECISÕES PENDENTES" acima.
