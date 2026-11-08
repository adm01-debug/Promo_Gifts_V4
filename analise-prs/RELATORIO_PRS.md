# RELATORIO_PRS — Análise Exaustiva de PRs
## Sessões 1–5 · `adm01-debug/Promo_Gifts_V4`

---

## META CHECKLIST

| Item | Valor |
|------|-------|
| Total PRs abertas no início da sessão 1 | 55 |
| Total PRs abertas no início da sessão 5 | 42 |
| Total PRs analisadas (todas as sessões) | 57 |
| PRs mergeadas pelo agente | 3 (#3017, #3020, #3201) |
| PRs novas abertas durante sessões | 2 (#3215, #3216) |
| Escritas no GitHub além de merges | 0 |
| Worktrees locais criados/removidos | 0/0 |
| SHA `main` inicial (sessão 1) | `a25070630788f77b297431665878319ad74bb587` |
| SHA `main` atual (pós-merge) | `1d3dafae93722b7e19f426bcf63701a80ab4b148` |

### Arquivos entregues

```
analise-prs/RELATORIO_PRS.md           <- este arquivo
analise-prs/prs.json                   <- 57 PRs com verditos
analise-prs/prs.csv                    <- 57 PRs formato CSV
analise-prs/regras-de-negocio.md       <- critérios de classificação
analise-prs/baseline/vitest-per-test-name.txt  <- 429 testes, 0 falhas
analise-prs/baseline/BASELINE-1d3dafae.md      <- typecheck EXIT:0
analise-prs/dossies/PR-<n>.md          <- 57 dossiers individuais
```

---

## BASELINE

### Vitest (Gate Final run #40218104943, SHA `1d3dafae`)
- **429 testes, 0 falhas, 0 erros**
- Gate Final run #42494087701 (SHA `1d3dafae`) -> **conclusion=success**

### TypeScript
- `npm run qa:typecheck` em `1d3dafae` -> **EXIT:0** (0 erros)

### ESLint
- `npm run lint` -> **OOM/timeout** (pré-existente na baseline; não é regressão deste agente)

---

## MERGES DO AGENTE (sessões 1–5)

| PR | Título | Merge SHA | Gate Final |
|----|--------|-----------|----------|
| #3017 | chore(security): atualiza timestamp baseline 2026-11-01 | `5a35a743` | failure (OOM pré-existente, 0 regressão) |
| #3020 | chore(main): release 1.7.0 | `0a8a17f9` | n/d (Gate Final coberto pelo #3201) |
| #3201 | fix(scripts): corrige scripts, edge functions e baselines | `1d3dafae` | **SUCCESS** (job 128774330099) |

**Nenhuma regressão introduzida.** Gate Final no SHA `1d3dafae` = SUCCESS confirma baseline intacto.

---

## RESULTADO: 42 PRs ABERTAS (nenhuma mergeável pelo agente)

### Contagem por veredito (42 PRs abertas)
| Veredito | Quantidade | PRs |
|----------|-----------|-----|
| DECISAO_HUMANA | 38 | 2941, 2948, 2951, 2958, 2966, 2967, 2969, 2973, 2976, 2978, 2980, 2982, 2998, 3003, 3004, 3006, 3012, 3014, 3015, 3016, 3127, 3129, 3137, 3144, 3148, 3150, 3160, 3179, 3202, 3205, 3212, 3214, 3215, 3216, 2950, 2965, 2970, 2971 |
| NAO_MERGEAVEL | 4 | 2961, 3001, 3203, 3210 |
| MERGEAVEL | 0 | — |

### PRs fechadas/já em main (15 PRs)
| Veredito | PRs |
|----------|-----|
| JA_EM_MAIN | 2940, 2944, 2952, 2979, 2981, 2988, 2990, 2991, 2992, 2993, 2996 |
| MERGEADA_AGENTE | 3017, 3020, 3201 |
| MERGEADA_PO | 3018 |

---

## ANÁLISE EXAUSTIVA: TODAS 42 PRs ABERTAS

Evidências coletadas em sessão 5 via Workflow (9 agentes, 207 chamadas de tool, `1d3dafae` como base).

### PR #2941 — fix(security): atualiza allowlist lint-0029
- **Veredito: DECISAO_HUMANA**
- draft=false | 10 arquivos | head.sha=07adb067+
- **Bloqueio:** `supabase/rollbacks/20261101140001_rollback.sql` (REGRA#8)
- **git cherry:** 71 commits marcados `+` (não em main); mergeable_state=dirty; Gate Final=failure (run 41365722111)

### PR #2948 — chore(rollbacks): adiciona rollbacks e38/e47/e37
- **Veredito: DECISAO_HUMANA**
- draft=true | 3 arquivos
- **Bloqueio:** 3 arquivos `supabase/rollbacks/` com `cron.alter_job` (REGRA#8/E056)
- **git cherry:** `+ 7eb6255f chore(migrations): adiciona rollback files para e38/e47/e37`; Gate Final=failure (run 41354440440)

### PR #2950 — fix(routes): remove rotas públicas mortas
- **Veredito: DECISAO_HUMANA**
- draft=true | 6 arquivos | mergeable_state=dirty
- Arquivos: `e2e/routes/_catalog.ts`, `src/lib/rbac/route-matrix.ts`, `src/pages/products/ComparePage.tsx`
- **git cherry:** `+ 79595116 fix(routes): remove rotas públicas mortas lista/coleção/comparação`; Gate Final=failure

### PR #2951 — chore(rollbacks): rollback migration 20261031000000
- **Veredito: DECISAO_HUMANA**
- draft=true | 2 arquivos
- **Bloqueio:** `supabase/migrations/20261031000000_create_stock_notes.sql` + `supabase/rollbacks/20261031000000_rollback.sql` (REGRA#8/E056)
- **git cherry:** 4 commits `+`; Gate Final=failure (run 41354696901)

### PR #2958 — fix(kit-builder): publicados = status shared
- **Veredito: DECISAO_HUMANA**
- draft=true | 1 arquivo
- **git cherry:** `+ 8d64b80e feat(kit-maker): stat e filtro Publicados mapeiam status 'shared' (KMM-075)`; Gate Final=failure (run 41355103714)
- Sem arquivo de infra bloqueante. Bloqueio: draft + decisão de regra de negócio PO (D7)

### PR #2961 — fix(pptx): badge Dados simulados
- **Veredito: NAO_MERGEAVEL**
- draft=false | 1 arquivo | CI falhou
- **git cherry:** `+ 3783a2f3 fix(bi): adiciona badge 'Dados simulados' nos slides 2-5 do PPTX quando isMock (FT-004)`
- Gate Final=failure HEAD 139077c6 (2026-11-06)

### PR #2965 — fix(ux): FT-040/FT-083/FT-093
- **Veredito: DECISAO_HUMANA**
- draft=true | 4 arquivos | mergeable_state=dirty
- Arquivos: `KitMakerLanding.tsx`, `NoveltyProductGrid.tsx`, `ReplenishmentProductGrid.tsx`, `useKitBuilderQuote.ts`
- **git cherry:** `+ d9ec2dd8 fix(front): corrige FT-040/FT-083/FT-093`; Gate Final=failure

### PR #2966 — fix: adiciona 10 entradas ao allowlist gitleaks
- **Veredito: DECISAO_HUMANA**
- draft=true | 1 arquivo
- **Bloqueio:** `.gitleaks.toml` (REGRA#8 governança)
- **git cherry:** `+ 447d8316 fix: adiciona 10 entradas de falsos-positivos ao allowlist do gitleaks`

### PR #2967 — fix: gate E42 sem credenciais
- **Veredito: DECISAO_HUMANA**
- draft=true | 1 arquivo
- **Bloqueio:** `.github/workflows/e2e-personalization.yml` (REGRA#8 CI/workflows)
- **git cherry:** `+ 972bf5a6 fix: gate E42 não executa check-min-tests quando auth-setup falha`

### PR #2969 — fix(security): REVOKE EXECUTE 106 funções (SEC-001)
- **Veredito: DECISAO_HUMANA**
- draft=true | 5 arquivos
- **Bloqueio:** `supabase/migrations/20261101210000_sec001_revoke_anon_execute_trigger_functions.sql` + 4 rollbacks com `cron.alter_job`/`cron.schedule` (REGRA#8/E056)
- **git cherry:** 2 commits `+` (DDL security + rollback)

### PR #2970 — fix(ux): confetti reduced-motion + AlertDialog
- **Veredito: DECISAO_HUMANA**
- draft=true | 2 arquivos | mergeable_state=dirty
- Arquivos: `MockupConfigPanel.tsx`, `useKitBuilderPageState.ts`
- **git cherry:** `+ a32a9d60 fix(ux): prefers-reduced-motion no confete e confirmação antes de limpar mockup`; Gate Final=failure

### PR #2971 — fix(ux): FT-134/FT-136/FT-173
- **Veredito: DECISAO_HUMANA**
- draft=true | 3 arquivos | mergeable_state=dirty
- Arquivos: `KitAIPromptDialog.tsx`, `KitBuilderHeader.tsx`, `MockupConfigPanel.tsx`
- **git cherry:** `+ 91599c85 fix(ux): FT-134/FT-136/FT-173 — confirmação IA, erros distintos, maxColors`; Gate Final=failure

### PR #2973 — fix(ux): FT-167/306/309
- **Veredito: DECISAO_HUMANA**
- draft=true | 3 arquivos
- **git cherry:** `+ 592cc971 fix(ux): FT-167/306/309 — onLogoRemove, senha min 8, CNPJ copy consistente`
- Gate Final=failure HEAD 592cc971. Bloqueio adicional: FT-306 eleva senha mínima de 6->8 chars (impacto em usuários existentes -> decisão PO)

### PR #2976 — fix(ux): UX batch6
- **Veredito: DECISAO_HUMANA**
- draft=true | 8 arquivos | mergeable_state=behind
- Arquivos: `KitAIPromptDialog.tsx`, `KitBuilderHeader.tsx`, `KitMakerLanding.tsx`, `MockupResultCard.tsx`, `NoveltyProductGrid.tsx`, `ClientPicker.tsx`, `ReplenishmentProductGrid.tsx`, `useKitBuilderPageState.ts`
- **git cherry:** 2 commits `+`; Gate Final=failure HEAD d901f61a

### PR #2978 — fix(kit-builder): prefers-reduced-motion (FT-139)
- **Veredito: DECISAO_HUMANA**
- draft=true | 1 arquivo | mergeable_state=behind
- Arquivo: `useKitBuilderPageState.ts`
- **git cherry:** `+ 1d021efe fix(kit-builder): guarda prefers-reduced-motion antes do confete (FT-139)`; Gate Final=failure

### PR #2980 — fix(mockup): onLogoRemove aceita areaId (FT-167)
- **Veredito: DECISAO_HUMANA**
- draft=true | 1 arquivo | mergeable_state=behind
- Arquivo: `MockupGenerator.tsx`
- **git cherry:** `+ 455c4f31 fix(mockup): onLogoRemove aceita areaId e limpa análise somente da área ativa`; Gate Final=failure

### PR #2982 — fix(kit-builder): aviso prévia indicativa (FT-174)
- **Veredito: DECISAO_HUMANA**
- draft=true | 1 arquivo | mergeable_state=behind
- Arquivo: `MockupResultCard.tsx`
- **git cherry:** `+ df977e12 fix(mockup): adiciona aviso de prévia indicativa no resultado (FT-174)`; Gate Final=failure

### PR #2998 — fix (não identificado)
- **Veredito: DECISAO_HUMANA**
- draft=true | 1 arquivo | mergeable_state=behind
- Arquivo: `useRuptureAlerts.ts`
- **git cherry:** `+ 97fdb9ea fix(hooks): corrige TS2339 em useRuptureAlerts.ts`; Gate Final=failure HEAD 54b3cf2d

### PR #3001 — CI gate data file
- **Veredito: NAO_MERGEAVEL**
- draft=false | 3 arquivos | CI falhou
- Arquivos: `PENDENCIAS.md`, `analise-branches/dossies/devin-probe-e184-legacy-refs.md`, `scripts/migration-ledger-remote-only-allowlist.json`
- **git cherry:** 2 commits `+` (Gate E40 allowlist + P35-P40 PENDENCIAS); Gate Final=failure HEAD 704d978c

### PR #3003 — migrations SQL produção
- **Veredito: DECISAO_HUMANA**
- draft=true | 3 arquivos
- **Bloqueio:** `supabase/migrations/20261101000001_security_invoker_views_p06.sql` + `20261101000002_revoke_anon_color_synonym_map_p15.sql` (REGRA#8/E056 DDL produção)
- **git cherry:** 2 commits `+`; Gate Final=failure HEAD 66de98a6; mergeable_state=behind

### PR #3004 — analise-prs rev88 (claude_04)
- **Veredito: DECISAO_HUMANA**
- draft=true | 143 arquivos | mergeable_state=dirty
- Apenas arquivos `analise-prs/` (docs); 20+ commits `+`

### PR #3006 — docs(pendencias): P35 itens 9-16
- **Veredito: DECISAO_HUMANA**
- draft=true | 2 arquivos | mergeable_state=dirty
- Arquivos: `PENDENCIAS.md`, `analise-branches/dossies/devin-probe-e184-legacy-refs.md`
- **git cherry:** 2 commits `+`; Gate Final=failure HEAD 9bd90b4f

### PR #3012 — docs(ci): RELATORIO_CI.md
- **Veredito: DECISAO_HUMANA**
- draft=true | 1 arquivo | mergeable_state=dirty
- Arquivo: `RELATORIO_CI.md`
- **git cherry:** 2 commits `+`; Gate Final=failure HEAD 059668470e

### PR #3014 — docs(analise-prs): v5
- **Veredito: DECISAO_HUMANA**
- draft=true | 15 arquivos | apenas `analise-prs/` (docs)
- **git cherry:** 12 commits `+`

### PR #3015 — migrations + analise-branches
- **Veredito: DECISAO_HUMANA**
- draft=true | 4 arquivos | mergeable_state=dirty
- **Bloqueio:** `supabase/migrations/20261101223908_cron001_stagger_additional_jobs.sql` + `20261101232022_cron001_stagger_schedules_reapply.sql` com `cron.alter_job` (REGRA#8/E056 DDL produção)
- **git cherry:** 2 commits `+`

### PR #3016 — .github/workflows updates
- **Veredito: DECISAO_HUMANA**
- draft=true | 1 arquivo
- **Bloqueio:** `.github/workflows/schema-snapshot-export.yml` (REGRA#8 CI/workflows)
- **git cherry:** `+ 35d25259 fix(ci): corrige export job skipped quando drift-gate cancela com force_rotate`

### PR #3127 — fix(ci): estabiliza nucleo E2E
- **Veredito: DECISAO_HUMANA**
- draft=false | 15 arquivos
- **Bloqueio:** `.github/workflows/e2e-flows.yml`, `.github/workflows/e2e-stock.yml`, `.github/workflows/e2e.yml` (REGRA#8 CI/workflows)
- **git cherry:** 16 commits `+` (nenhum em main)

### PR #3129 — ci(e2e): reduzir pressão dos runners
- **Veredito: DECISAO_HUMANA**
- draft=false | 8 arquivos | TODOS em `.github/workflows/`
- **Bloqueio:** 8 workflows (`delivery-quality.yml`, `deploy-gates.yml`, `e2e-flows.yml`, `e2e-focused.yml`, `e2e-personalization.yml`, `e2e-swatch-quickview.yml`, `e2e.yml`, `visual-tests.yml`) (REGRA#8 CI/workflows)
- **git cherry:** 2 commits `+`; Gate Final=success (mas bloqueio REGRA#8 impede merge)

### PR #3137 — fix(ci): impedir falso negativo no detector E2E
- **Veredito: DECISAO_HUMANA**
- draft=false | 11 arquivos | 8 em `.github/workflows/`
- **Bloqueio:** 8 workflows modificados (REGRA#8 CI/workflows)
- **git cherry:** 3 commits `+` (`edd15ea7`, `46f5ef7c`, `e97fcf2e`)

### PR #3144 — fix(db): reconciliar ledger, baseline e recibos
- **Veredito: DECISAO_HUMANA**
- draft=false | 10 arquivos
- **Bloqueio:** `.github/workflows/db-reconcile-migration-history.yml` (REGRA#8 CI/workflows) + `supabase/migrations/20260511235959_bootstrap_public_dependencies_for_application_schemas.sql` + `supabase/rollbacks/20260511235959_rollback.sql` (REGRA#8/E056 DDL produção)
- **git cherry:** 5 commits `+`

### PR #3148 — fix(edge-fn): corrigir CRM bridge
- **Veredito: DECISAO_HUMANA**
- draft=true | 11 arquivos
- **Bloqueio:** `supabase/migrations/20261107134429_create_crm_seller_identity_links.sql` + rollback (REGRA#8/E056 DDL produção)
- **git cherry:** 1 commit `+ 820fa774`

### PR #3150 — fix(db): liberar aplicação de migrations
- **Veredito: DECISAO_HUMANA**
- draft=false | 17 arquivos
- **Bloqueio:** `.github/workflows/db-schema-drift-check.yml` + `.github/workflows/deploy-gates.yml` (REGRA#8 CI/workflows) + 3 migrations + 3 rollbacks (REGRA#8/E056 DDL produção)
- **git cherry:** 13 commits `+`; Gate Final=failure (run 42406466668)

### PR #3160 — fix: DB E15 (pg_temp + rollback)
- **Veredito: DECISAO_HUMANA**
- draft=true | 4 arquivos
- **Bloqueio:** `supabase/migrations/20261101150000_fix_sb0003_fn_get_rupture_alerts.sql` + rollback (REGRA#8/E056 DDL produção)
- **git cherry:** 27 commits `+`; Gate Final=failure (run 42405509174)

### PR #3179 — fix: corrige preflight db-apply-migration
- **Veredito: DECISAO_HUMANA**
- draft=true | 2 arquivos
- **Bloqueio:** `supabase/migrations/20261101150000` + rollback (REGRA#8/E056 DDL produção)
- **git cherry:** `+ 105a0b31 fix: corrige SET search_path e cria rollback para migration 20261101150000`

### PR #3202 — docs(ci): RELATORIO §33
- **Veredito: DECISAO_HUMANA**
- draft=true | 4 arquivos
- **Bloqueio:** `supabase/migrations/20261108001500_reconcile_e2e_cleanup_audit.sql` (REGRA#8/E056 DDL produção)
- **git cherry:** 10 commits `+` (67d2c939..dab66d27)

### PR #3203 — fix: scripts — static-pass, exit codes e regressão TypeScript
- **Veredito: NAO_MERGEAVEL**
- draft=false | 132 arquivos | CI falhou
- **git cherry:** 18 commits `+` (da32eaed..1aad6831)
- Gate Final=failure HEAD 1aad6831f705eaf14aaf2ec101851ed07a19ec57

### PR #3205 — fix(db): reversionar migration e2e_cleanup
- **Veredito: DECISAO_HUMANA**
- draft=false | 4 arquivos
- **Bloqueio:** `supabase/migrations/20261108132000_reconcile_e2e_cleanup_audit.sql` (REGRA#8/E056 DDL produção)
- **git cherry:** 3 commits `+` (1b094cd4, 1ef1c4e1, c3cc1210)

### PR #3210 — chore(main): release 1.8.2
- **Veredito: NAO_MERGEAVEL**
- draft=false | 4 arquivos | CI não verde
- Checks: Supabase Preview=failure, alert=skipped, Vercel=success, Vercel Agent=neutral — Gate Final não executou
- **git cherry:** 2 commits `+` (feat: RELATORIO_CI.md + chore(main): release 1.9.0)

### PR #3212 — docs: recibo de deploy de edge function(s)
- **Veredito: DECISAO_HUMANA**
- draft=false | 1 arquivo (`supabase/EDGE_FUNCTIONS_DEPLOY_LOG.md`) | mergeable=true (behind)
- Autor: **github-actions[bot]** (tipo: Bot); reviewer solicitado: `adm01-debug`
- **Bloqueio:** Bot PR + reviewer humano solicitado (critério DECISAO_HUMANA)
- **git cherry:** `+ c7844753 docs(edge-deploy-log): recibo do deploy — run 42491776265`

### PR #3214 — fix(cron): CRON-001 — escalonar 4 cron jobs
- **Veredito: DECISAO_HUMANA**
- draft=true | 124 arquivos
- **Bloqueio:** `.github/workflows/contract-tests.yml` (REGRA#8 CI/workflows) + migration `20261101220000_cron001_stagger_schedules.sql` com `cron.alter_job` (REGRA#8/E056)
- **git cherry:** 20 commits `+`

### PR #3215 — fix(migration): adiciona -- Rollback: em 20261108001500
- **Veredito: DECISAO_HUMANA**
- draft=false | 1 arquivo
- **Bloqueio:** `supabase/migrations/20261108001500_reconcile_e2e_cleanup_audit.sql` (REGRA#8/E056 DDL produção)
- **git cherry:** 3 commits `+` (389455fd, f5285e07, 5085f290); Gate Final=failure HEAD 5085f290

### PR #3216 — fix(migrations): rollback + CI status (nova nesta sessão)
- **Veredito: DECISAO_HUMANA**
- draft=true | 4 arquivos | mergeable_state=dirty
- **Bloqueio:** `supabase/migrations/20261108001500_reconcile_e2e_cleanup_audit.sql` (REGRA#8/E056 DDL produção)
- **git cherry:** 2 commits `+` (ba43810c, eab73c0d); Gate Final=failure HEAD eab73c0

---

## REGRAS DE BLOQUEIO APLICADAS

| Regra | Critério | PRs afetadas |
|-------|----------|-------------|
| DRAFT | PR em estado rascunho | 2948, 2950, 2951, 2958, 2965, 2966, 2967, 2969, 2970, 2971, 2973, 2976, 2978, 2980, 2982, 2998, 3003, 3004, 3006, 3012, 3014, 3015, 3016, 3148, 3160, 3179, 3202, 3214, 3216 |
| REGRA#8 CI/workflows | Toca `.github/workflows/` | 2967, 3016, 3127, 3129, 3137, 3144, 3150 |
| REGRA#8/E056 DDL produção | Toca `supabase/migrations/` | 2941, 2948, 2951, 2969, 3003, 3015, 3144, 3148, 3150, 3160, 3179, 3202, 3205, 3214, 3215, 3216 |
| REGRA#8 rollbacks | Toca `supabase/rollbacks/` | 2941, 2948, 2969, 3144 |
| REGRA#8 gitleaks | Toca `.gitleaks.toml` | 2966 |
| CI failure | Gate Final conclusion=failure no HEAD | 2941, 2961, 2978, 2980, 2982, 2998, 3001, 3003, 3006, 3012, 3150, 3160, 3203, 3210, 3215, 3216 |
| Conflito com main | mergeable_state=dirty | 2941, 2950, 2965, 2970, 2971, 3004, 3006, 3012, 3015, 3216 |
| Bot PR + reviewer | github-actions[bot] com reviewer | 3212 |
| Decisão PO | Regra de negócio (D7, senha, etc.) | 2958, 2973 |
| NAO_MERGEAVEL CI | Gate Final failure (sem bloqueio infra) | 2961, 3001, 3203, 3210 |

---

*Gerado em 2026-11-08 · sessions 01Ss1tXZ4cAbxBvdmu95uNPz (1-5) · SHA base: `1d3dafae`*
