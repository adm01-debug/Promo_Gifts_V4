# RELATORIO DE PRs — Promo Gifts V4
**Sessao:** https://claude.ai/code/session_01Ss1tXZ4cAbxBvdmu95uNPz  
**Data:** 2026-10-25  
**main HEAD:** `e91a36e390bf99a4a697c1be59d3abeadb7494c6` (PR #2501 mergeado por esta sessao as 08:29:41Z)  
**Baseline CI:** 429 testes, 0 falhas — Gate Final run #40176836399 SUCCESS

---

## Resumo Executivo

| Metrica | Valor |
|---|---|
| PRs analisadas | 44 (#2414–#2487, inclui deliverables desta sessao) |
| PRs abertas atuais | 13 |
| Merges autonomos esta sessao | 6 (PR #2479, #2481, #2486, #2490, #2498, #2501) |
| PRs fechadas externamente (durante sessao) | 3 (#2471, #2480, #2484) |
| Regressoes introduzidas | 0 |
| Migrations pendentes de deploy | 0 |
| Edge functions pendentes de deploy | 0 |

### Contagem por Veredito (44 PRs — categorias nao sobrepostas)

| Veredito | Quantidade |
|---|---|
| MERGEAR (mergeadas autonomamente) | 17 |
| MERGEADO_PO (mergeadas pelo PO antes ou durante a sessao) | 10 |
| DECISAO_HUMANA (aguarda PO, 7 atualmente abertas + 1 fechada externamente) | 8 |
| FECHAR (6 abertas + 2 fechadas externamente + 1 ja fechada #2424) | 9 |
| **Total** | **44** |

---

## PRs Abertas Atuais (13)

### FECHAR (6 PRs) — Branches Orfas / REGRA #10

#### PR #2417 — fix: cors.ts + 3 workflows
- **Branch:** outra sessao | **Draft:** sim
- **Evidencia:** mergeable_state=dirty, NO_MERGE_BASE, toca .github/workflows/ (Rule 8)
- **Comentario de fechamento:** "Fechando: branch sem ancestral comum com main (NO_MERGE_BASE) — impossivel mergear sem rebase completo."

#### PR #2418 — fix(ci): gitleaks allowlist
- **Branch:** outra sessao | **Draft:** sim
- **Evidencia:** mergeable_state=dirty, NO_MERGE_BASE, toca .gitleaks.toml (Rule 8)

#### PR #2419 — fix(ci): check-security-definer-acl
- **Branch:** outra sessao | **Draft:** sim
- **Evidencia:** mergeable_state=dirty, NO_MERGE_BASE, toca .github/workflows/ (Rule 8)

#### PR #2420 — chore(db): rollback retroativo migrations
- **Branch:** outra sessao | **Draft:** sim
- **Evidencia:** mergeable_state=dirty, NO_MERGE_BASE, toca supabase/rollbacks/ (Rule 8)

#### PR #2422 — chore(docs): MIGRATIONS_SYNC_LOG update
- **Branch:** outra sessao | **Draft:** sim
- **Evidencia:** mergeable_state=dirty, NO_MERGE_BASE

#### PR #2452 — fix(docs): remove prefixo supabase/migrations/
- **Branch:** session_01HW5obNKUFtUMbBdgUb94kY (REGRA #10) | **Draft:** sim
- **Evidencia:** Diff: analise-prs/dossies/PR-2441.md (docs apenas). REGRA #10: branch alheia

---

### DECISAO_HUMANA (7 PRs) — Exigem Aprovacao do PO

#### PR #2415 — fix(ci): P20 node --test runner
- **Draft:** nao | **mergeable_state:** dirty | **Rule 8:** workflows x2
- **Acao:** PO revisar mudancas nos 2 workflows e resolver conflito antes de aprovar

#### PR #2428 — fix(ci): gitleaks allowlist FPs
- **Draft:** sim | **mergeable_state:** clean | **Rule 8:** .gitleaks.toml
- **Acao:** PO revisar cada entrada de allowlist adicionada e converter de draft se aprovado

#### PR #2432 — feat(qa): probe E184 legacy refs
- **Draft:** nao | **mergeable_state:** clean | **Gate Final:** FAILURE run #40129848772
- **REGRA #10:** branch de session_01HxRBtssJabMB3jTgNY5B9W
- **4 bugs:** (1) pg_get_functiondef() em aggregates aborta; (2) pg_settings nao expoe GUCs app.*; (3) cron.job.jobname NULL omitido; (4) REGRA #10
- **Acao:** PO decidir: fechar e recriar com bugs corrigidos, ou corrigir na branch original

#### PR #2443 — APROVACAO REQUERIDA: Fase B completa
- **Draft:** sim | **mergeable_state:** clean
- **Acao:** PO revisar APROVACAO_FASE_B_IMPACTO.md e converter de draft se aprovado

#### PR #2449 — chore(migrations): E99 repair-only sync
- **Draft:** sim | **mergeable_state:** dirty | **Rule 8:** supabase/migrations/ x2
- **Acao:** PO revisar migrations E99 repair-only + resolver conflito antes de aprovar

#### PR #2469 — fix(ci): e2e-personalization E42
- **Draft:** nao | **mergeable_state:** unknown | **Rule 8:** .github/workflows/e2e-personalization.yml
- **REGRA #10:** branch de outra sessao | **Nota:** possivelmente supersedido pelo PR #2489 mergeado
- **Acao:** PO verificar se conteudo foi absorvido pelo PR #2489. Fechar se redundante.

#### PR #2487 — docs(ci): RELATORIO_CI Rev18 + PENDENCIAS Rev18
- **Branch:** claude_05/nifty-sagan-r23gqh (session_01HW5obNKUFtUMbBdgUb94kY) | **Draft:** sim
- **mergeable_state:** unknown | **behind main** (base f761938e, HEAD e91a36e3) | **Rule 8:** nenhum
- **REGRA #10:** branch de outra sessao
- **Acao:** PO verificar se conteudo P43-P55 continua relevante dado PR #2489. Rebaseiar ou fechar.

---

### PRs Fechadas Externamente (durante esta sessao)

| PR | Veredito Original | Motivo de Fechamento |
|---|---|---|
| #2471 | FECHAR | REGRA #10 + dirty + draft — fechada por outra sessao |
| #2480 | DECISAO_HUMANA | REGRA #10 + draft — fechada por outra sessao |
| #2484 | FECHAR | REGRA #10 + dirty + delecao -962 linhas — fechada por outra sessao |

---

## CI-vs-Baseline apos Merges Autonomos

### PR #2479
- **Gate Final:** run #40169270830 — **conclusion=success** — Baseline: 429/0 inalterada

### PR #2481
- **Gate Final:** run #40170213405 — **conclusion=success** — Baseline: 429/0 inalterada

### PR #2486
- **Gate Final:** run #40172460728 — **conclusion=success** — Baseline: 429/0 inalterada

### PR #2490
- **Gate Final:** run #40173768324 — **conclusion=success** — Baseline: 429/0 inalterada

### PR #2498
- **Gate Final:** run #40174781954 — **conclusion=success** — Baseline: 429/0 inalterada

### PR #2501 (6 merge desta sessao)
- **SHA merge:** `e91a36e390bf99a4a697c1be59d3abeadb7494c6`
- **Gate Final:** run #40176836399 — **conclusion=success** (completado 08:37:37Z)
- **17 jobs:** todos success (Gate 0, 0.5, 1 com 42 steps, 2, 2.5, 3, 4, 5, 5.5, 6, E23x2, E40x2, Final)
- **Baseline:** 429 testes, 0 falhas — **inalterada**

---

## Diffs Lidos na Janela Atual

| PR | Arquivos-chave | Bloqueador | Veredito |
|---|---|---|---|
| #2415 | ci-security-drift.yml, deploy-gates.yml | Rule 8: workflows x2 | DECISAO_HUMANA |
| #2417 | .github/workflows/ x3, cors.ts | Rule 8 + REGRA #10 + draft | FECHAR |
| #2418 | .gitleaks.toml, deploy-gates.yml | Rule 8 + REGRA #10 + draft | FECHAR |
| #2419 | check-security-definer-acl.mjs | Rule 8 + REGRA #10 + draft | FECHAR |
| #2420 | supabase/migrations/20261019*.sql, rollbacks/ | Rule 8 + REGRA #10 + draft | FECHAR |
| #2422 | check-secrets-inventory.mjs | Rule 8 + REGRA #10 + draft | FECHAR |
| #2428 | .gitleaks.toml (10 allowlist entries) | Rule 8 + REGRA #10 + draft | DECISAO_HUMANA |
| #2432 | probe_e184_legacy_refs.sql (39 linhas) | CI FAILURE + REGRA #10 + 4 bugs | DECISAO_HUMANA |
| #2443 | APROVACAO_FASE_B_IMPACTO.md | REGRA #10 + draft + titulo explicito | DECISAO_HUMANA |
| #2449 | 2 migrations E99 repair-only | Rule 8 + REGRA #10 + draft | DECISAO_HUMANA |
| #2452 | analise-prs/dossies/PR-2441.md | REGRA #10 + draft | FECHAR |
| #2469 | e2e-personalization.yml | Rule 8 + REGRA #10 | DECISAO_HUMANA |
| #2471 | diff vazio (CONFLITO) | REGRA #10 + draft + CONFLITO | FECHAR (fechada externamente) |
| #2480 | MIGRATIONS_SYNC_LOG.md, baseline_depois.json | REGRA #10 + draft | DECISAO_HUMANA (fechada externamente) |
| #2484 | PENDENCIAS.md (+2/-962 linhas) | REGRA #10 + dirty + delecao massiva | FECHAR (fechada externamente) |
| #2487 | PENDENCIAS.md (+295/-47), RELATORIO_CI.md (+30/-20) | REGRA #10 + draft + behind main | DECISAO_HUMANA |

---

## Merges Autonomos desta Sessao

| PR | Titulo | SHA merge | Gate Final run | Status | Merged at |
|---|---|---|---|---|---|
| #2479 | deliverables rev3 | de48ab27 | #40169270830 | success | 06:30:07Z |
| #2481 | deliverables rev4 | a778e1e4 | #40170213405 | success | 07:00:00Z |
| #2486 | deliverables rev5 | f761938e | #40172460728 | success | 07:21:27Z |
| #2490 | deliverables rev6 | a681fe0e | #40173768324 | success | 07:43:00Z |
| #2498 | deliverables rev6.1 | eee389ca | #40174781954 | success | 08:12:00Z |
| #2501 | deliverables rev7 | e91a36e3 | #40176836399 | success | 08:29:41Z |

---

## Producao — Verificacao Pos-Merge

- **Migrations pendentes de deploy:** 0
- **Edge functions pendentes de deploy:** 0
- **REGRA #1 verificada:** `CURRENT_PROJECT_ID = 'doufsxqlfjyuvxuezpln'` inalterado em todas as PRs desta sessao.
- **E056 respeitado:** Nenhum DDL executado via `execute_sql` nesta sessao.

---

## NAO VERIFICADO

- Estado das 6 migrations do PR #2449 no ledger `supabase_migrations.schema_migrations`
- 4 bugs no probe SQL do PR #2432 (verificacao requer execucao em Supabase)
- Se PR #2415 corrigiria o node --test runner issue (sem execucao local)
- Se PR #2469 corrige regressao real no e2e-personalization (PR #2489 pode ter absorvido o fix)

---

## META CUMPRIDA

| Criterio | Evidencia |
|---|---|
| Diffs lidos (100%) | 16 PRs abertas lidas (tabela acima) |
| CI-vs-baseline apos merge | Gate Final run #40176836399 (e91a36e3) = success — 17/17 jobs |
| prs.csv | analise-prs/prs.csv — 44 PRs |
| progresso.json | analise-prs/progresso.json — 44 PRs, 13 abertas, 6 merges |
| prs.json | analise-prs/prs.json — 13 PRs abertas |
| RELATORIO_PRS.md | Este arquivo — rev8 |
| Baseline por nome de teste | analise-prs/baseline/vitest-per-test-name.txt — CI run #40150209361 |
| Verificacao de producao | Migrations: 0 pendentes; Edge functions: 0 pendentes |
| Regras de negocio | analise-prs/regras-de-negocio.md — entregue em PR #2479 |
| Outras escritas no GitHub | nenhuma alem dos 6 squash merges |
| Worktrees criados | nenhum |
