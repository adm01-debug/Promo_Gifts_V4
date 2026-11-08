# RELATÓRIO DE ANÁLISE — PRs ABERTAS
**Sessão:** 2026-11-08  
**Main SHA inicial:** `9a89d9f0a4ac2df7ad670501adaad9f1f60a75df`  
**Main SHA final:** `e9ed1f416e77ca79d975f4e1dfe40ef4ce06ac96` (PR#3217 mergeada pelo PO)  
**Total PRs analisadas:** 19 (17 abertas no final + PR#3217 mergeada pelo PO + PR#3228 criada nesta sessão como entrega)  
**Mergeadas esta sessão:** 0  
**Mergeadas pelo PO:** 1 (PR#3217 — merge commit `41b55250865de6a42d07e1622587b3a0e76f8950`)  
**Vereditos:** MERGEADA_PELO_PO=1 | DECISAO_HUMANA=14 | NAO_MERGEAVEL=3

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

| PR | Título | Bloqueio |
|---|---|---|
| PR#3148 | feat: CRM bridge + security DEFINER | DRAFT + 1 workflow + 3 migrations |
| PR#3160 | fix: fn_get_rupture_alerts E15 | DRYFUT |
| PR#3214 | fix: CRON-001 startup timeout | DRAFT + workflow + migrations + CONFLICTING |
| PR#3216 | fix: rollback header + PENDENCIAS | DRYFUT |
| PR#3228 | chore: workflow_dispatch e2e | DRAFT + REGRA#8 |

---

## PRs NAO_MERGEAVEIS (3) -- bloqueadas por critério objetivo

| PR | Motivo | Evidência |
|---|---|---|
| PR#3203 | 7 conflitos reais com main + CI=FAILURE + Gate Final ausente | Merge test local retornou 7 conflitos (gen-internal-schema.mjs, cors-snapshot.json, baselines JSON) |
| PR#3210 | Gate Final AUSENTE + Supabase PREVIEW FAILURE (`column categories.level does not exist`) | check_run run_id 128807151281 (2026-11-08) |
| PR#3212 | Gate Final AUSENTE + Supabase PREVIEW CANCELLED (max project branches) | check_run run_id 128765827946 (2026-11-08) |

---

## DECISãO HUMANA -- PRs que tocam GOVERNA�CA (14)

Todas as 14 PRs abaixo tocam arquivos de governança (REGRA#8):
`.github/workflows/**`, `supabase/migrations/**`, `scripts/sentinel-check.sh` (ARQUIVO PROTEGIDO).

| PR | Arquivos de Governaçã | Quantidade |
[---|---|---|
| PR#3127 | `.github/workflows/e2e-flows.yml`, `e2e-stock.yml`, `e2e.yml` | 3 workflows |
| PR#3129 | `8 workflows de CI` | 8 workflows |
| PR#3137 | `workflows/db-reconcile-migration-history.yml` + 1 migration | 1 workflow + 1 migration |
| PR#3144 | 3 migrations (security_definer) | 3 migrations |
| PR#3148 | 1 workflow + 3 migrations + 131 files | DRAFT |
| PR#3150 | 2 workflows + 3 migrations + 6 conflitos including deploy-gates.yml | CRÍTICO |
| PR#3160 | 1 migration | DRYFUT |
| PR#3179 | 1 migration | MERGE LIMPO |
| PR#3202 | 1 migration | CI SUCCESS |
| PR#3205 | 1 migration | MERGE LIMPO |
| PR#3214 | 1 workflow + 3 migrations (cron DDLVIA E056) | DRAFT+CONFLICTING |
| PR#3215 | 1 migration | MERGE LIMPO |
| PR#3220 | 1 workflow + `scripts/sentinel-check.sh` (ARQUIVO PROTEGIDO) | CONFLICTING |
| PR#3228 | g�workflows/e2e-color-swatch-grid.yml` | DRAFT |

---

## PRs MERGEADAS PELO PO

| PR | Título | Merge commit | Merged by | Data |
|---|---|---|---|---|
| PR#3217 | docs(auditoria): P9 gap ledger 476 versões + P06 reanálise 24 views + C4 diagnótico | `41b55250` | adm01-debug (PO) | 2026-11-08T17:46:10Z |

---

## RESULTADO FINAL -- POR QUÅ noé possível mergear nenhuma PR atonomamente

Ocritério decisivo: **Gate Final - Deploy Ready** não passou em nenuma das 17 PRs abertas.

| PR | Gate Final | CI principal | Causa |
[---|---|---|---|
| PR#3127 | AUSENTE | FAILURE | 3 workflows REGRA#8 |
| PR#3129 | AUSENTE | FAILURE | 8 workflows REGRA#8 |
| PR#3137 | AUSENTE | FAILURE | 1 workflow + 1 migration REGRA#8 |
| PR#3144 | AUSENTE | FAILURE | 3 migrations REGRA#8 |
| PR#3148 | AUSENTE | FAILURE | DRAFT+1 workflow+3 migrations |
| PR#3150 | AUSENTE | FAILURE | 2 workflows+3 migrations+6 conflitos |
| PR#3160 | AUSENTE| - | DRAFT+migration REGRA#8 |
| PR#3179 | AUSENTE| FAILURE | migration REGRA#8 |
| PR#3202 | AUSENTE | SUCCESS | migration REGRA#8 (mesmo verde) |
| PR#3203 | AUSENTE | FAILURE | 7 conflitos reais com main |
| PR#3205 | AUSENTE | FAILURE | migration REGRA#8 |
| PR#3210 | AUSENTER| - | Supabase FAILURE run_id 128807151281 |
| PR#3212 | AUSENTE | - | Supabase CANCELLED run_id 128765827946 |
| PR#3214 | AUSENTE | FAILURE | DRAFT+1 workflow+3 migrations+CONFLICTING |
| PR#3215 | AUSENTE| FAILURE | migration REGRA#8 + Gate Final ausente |
| PR#3216 | AUSENTE| - | DRAFT+migration REGRA#8+CONFLICTING |
| PR#3220 | AUSENTE| FAILURE | 1 workflow+sentinel-check.sh PROTEGIDO+CONFLICTING |

**Conclusão:** Gate Final é o único required check em main. Sem ele, nenhuma PR passa no critério "zero erro novo vs. linha de base".
Além disso, 14 PRs tocam arquivos de governança (REGRA#8) que exigem DECISAO_HUMANA por contrato do projeto.

---

## PRs PRONTAS PORÉM NAO MERGEADAS

| PR | Por quê não mergeada | Observação |
[---|---|---|
| PR#3179 | REGRA#8 (1 migration) - merge limpo mas requer decisão humana | Entrante: Logicamente correta, MERGE LIMPO |
| PR#3202 | REGRA#8 (1 migration) - CI verde mas requer decisão humana | Unica PR com CI SUCCESS e merge limpo |
| PR#3215 | REGRA#8 (1 migration) - merge limpo mas requer decisão humana | Apenas adiciona header de rollback |

---

## PRs A FECHAR (sugeridas, não executaras)

| PR | Motivo para fechar |
[---|---|
| PR#3216 | codig-fix-db-e2e-cleanup-261108-... | Supersedida por PR#3215; fechar |

---

## CLUSTERS DE PRs

### Cluster 1 -- Migration de segurança (security_definer)

* PR#3144 -- Reconcilia E12/E25 (security definer)
* PR#3148 -- CRM bridge + security DEFINER (contém migrations similares)

**Decisão:** PR#3144 aplica migrations de segurança que PR#3148 depende. Ordem: 3144 -> 3148.

### Cluster 2 -- fn_get_rupture_alerts

* PR#3160 -- DRAFT, supersedida
* PR#3179 -- Non-draft, mesma logica

**Decisão:** PR#3160 fechar; PR#3179 mergear.

### Cluster 3 -- reconcile_e2e_cleanup_audit

* PR#3215 -- Adiciona header de rollback (1 arquivo, merge limpo)
* PR#3216 -- DRAFT, conteúdo similar, conflito

**Decisão:** PR#3216 fechar; PR#3215 mergear.

### Cluster 4 -- CRON-001 (cron startup timeout)

* PR#3148 -- inclui migration cron001 parcialmente
* PR#3214 -- foca no CRON-001 com migration completa

**Decisão:** CRON-001 é bug real com evidência em `cron.job_run_details`. Usar fluxo E15 para aplicar migration.

### Cluster 5 -- release-please (automático)

* PR#3210 -- Automatico, format de release-please
* PR#3212 -- Automatico, edge deploy receipt

**Decisão:** Ambas são PRs automáticas sem contexto humano. NAO_MERGEAVEIS.

---

## TABELA COMPLETA H— 19 PRs

| PR | Título | Branch | Draft | CI  | Veredito | Motivo | Evidência |
|---|---|---|---|---|---|---|---|
| #3127 | fix(ui): Tooltip + playwright cleanup | codex/fix-ui-tooltip-... | Não | FAILURE | DECISAO_HUMANA | 3 workflows REGRA#8 | PR-3127-evidencias.md |
| #3129 | fix(ci): e2e reduce runner pressure | codex/ci-e2e-reduce-... | Não | FAILURE | DECISAO_HUMANA | 8 workflows REGRA#8 | PR-3129.md |
| #3137 | fix(ci): detector E2E + migration history | codex/fix-ci-e2e-detector-... | Não | FAILURE | DECISAO_HUMANA | 1 workflow + 1 migration REGRA#8 | PR-3137-evidencias.md |
| #3144 | fix(db): reconcilia E12/E25 (security-definer) | codex/fix-db-e12-e25-... | Não | FAILURE | DECISAO_HUMANA | 3 migrations REGRA#8 | PR-3144-evidencias.md |
| #3148 | feat: CRM bridge + migrations security DEFINER | codex/feat-crm-bridge-... | **SIM** | FAILURE | DECISAO_HUMANA | DRYFUT | PR-3148-evidencias.md |
| #3150 | fix(ci): libera migrations pendentes + hardening | codex/fix-ci-migrations-... | Não | FAILURE | DECISAO_HUMANA | 2 workflows + 3 migrations + 6 conflitos REGRA#8 | PR-3150-evidencias.md |
| #3160 | fix(db): fn_get_rupture_alerts E15 | codex/fix-db-e15-... | **SIM** | - | DECISAO_HUMANA | DRAFT + migration REGRA#8 + supersedida por PR#3179 | PR-3160-evidencias.md |
| #3179 | fix(db): preflight db-apply migration | codex/fix-preflight-db-apply-... | Não | FAILURE | DECISAO_HUMANA | migration REGRA#8 | PR-3179.md |
| #3202 | docs(ci): relatório 33 | codex/docs-ci-relatorio-33-... | Não | SUCCESS | DECISAO_HUMANA | migration REGRA#8 (mesmo com CI verde) | PR-3202.md |
| #3203 | fix(scripts): static pass | codex/fix-scripts-static-pass-... | Não | FAILURE | NAO_MERGEAVEL | CONFLICTING com main | PR-3203.md |
| #3205 | fix(db): revert e2e cleanup | codex/fix-db-revert-e2e-cleanup-... | Não | FAILURE | DECISAO_HUMANA | migration REGRA#8 | PR-3205.md |
| #3210 | release-please | release-please--branches--main-- | Não | - | NAO_MERGEAVEL | PR de release automática sem contexto completo | PR-3210.md |
| #3212 | auto: edge deploy receipt | auto/edge-deploy-receipt-... | Não | - | NAO_MERGEAVEL | PR automática sem PR humana de origem | PR-3212.md |
| #3214 | fix(cron): CRON-001 startup timeout | codex/fix-cron-startup-... | **SIM** | FAILURE | DECISAO_HUMANA | DRYFUT | PR-3214-evidencias.md |
| #3215 | fix(migration): rollback header 20261108001500 | codex/fix-migration-rollback-... | Não | FAILURE | DECISAO_HUMANA | migration REGRA#8 + Gate Final ausente | PR-3215.md |
| #3216 | fix(db): rollback header + PENDENCIAS | codex/fix-migrations-rollback-... | **SIM** | - | DECISAO_HUMANA | DRAFT + migration REGRA#8 + CONFLICTING | PR-3216-evidencias.md |
| #3217 | docs(auditoria): P09 gap ledger + P06 | codex/docs-auditoria-p09-... | Não | SUCCESS | **MERGEADA_PELO_PO** | Merge `41b55250` pelo PO 2026-11-08T17:46:10Z | PR-3217.md |
| #3220 | fix(ci): Sentinel Regra 6 + rollback | codex/fix-ci-sentinel-r6-... | Não | FAILURE | DECISAO_HUMANA | REGRA#8 workflow + ARQUIVO PROTEGIDO sentinel-check.sh + CONFLICTING | PR-3220-evidencias.md |
| #3228 | chore(workflows): workflow_dispatch e2e-color-swatch-grid | claude_05/youthful-ride-vcdchy | **SIM** | - | DECISAO_HUMANA | REGRA#8 + DRAFT (Entrega desta sessão) | PR-3228-evidencias.md |

---

## ARQUIVO DE EVIDÊNCIAS

| Arquivo | Cobertura |
|---|---|
| `analise-prs/regras-de-negocio.md` | Regras de negócios extraídas do código (client.ts:24, product-catalog.ts:25-104, etc.) |
| `analise-prs/baseline/typecheck.txt` | Typecheck baseline (EXIT_CODE=0) |
| `analise-prs/baseline/lint.txt` | Lint baseline (EXIT_CODE=0) |
| `analise-prs/baseline/tests.txt` | Vitest baseline (2 falhas conhecidas: day_today++day_selected em calendar.redesign.test.tsx,EXIT=0) |
| `analise-prs/prs.csv` | Inventário completo de PRs (CSV) |
| `analise-prs/prs.json` | Inventário completo de PRs (JSON) |
| `analise-prs/dossies/PR-*.md` | Dossiê completo por PR (19 arquivos) |
| `analise-prs/progresso.json` | Rastreamento de progresso da sessão |
