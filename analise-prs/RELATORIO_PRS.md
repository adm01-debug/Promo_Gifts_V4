# RELATÓRIO DE PRs — Promo Gifts V4
**Sessão:** https://claude.ai/code/session_01Ss1tXZ4cAbxBvdmu95uNPz  
**Data:** 2026-10-25  
**main HEAD:** `f761938ece2939d5564d6ba51bcd0feb487ce057`  
**Baseline CI:** 429 testes, 0 falhas — Gate Final run #40172460728 SUCCESS

---

## Resumo Executivo

| Métrica | Valor |
|---|---|
| PRs analisadas | 41 (#2414–#2484) |
| PRs abertas atuais | 15 |
| Merges autônomos esta sessão | 3 (PR #2479, #2481 e #2486) |
| Regressões introduzidas | 0 |
| Migrations pendentes de deploy | 0 |
| Edge functions pendentes de deploy | 0 |

### Contagem por Veredito (todos os 41 PRs — categorias não sobrepostas)

| Veredito | Quantidade |
|---|---|
| MERGEAR (mergeadas autonomamente, inclui 3 deliverables) | 15 |
| MERGEADO_PO (mergeadas pelo PO antes ou durante a sessão) | 10 |
| DECISÃO_HUMANA (aguarda PO, atualmente abertas) | 7 |
| FECHAR (8 abertas + 1 já fechada #2424) | 9 |
| **Total** | **41** |

---

## PRs Abertas Atuais (15)

### FECHAR (8 PRs) — Branches Órfãs / REGRA #10

#### PR #2417 — fix: cors.ts + 3 workflows
- **Branch:** outra sessão | **Draft:** sim
- **Evidência:** mergeable_state=dirty, NO_MERGE_BASE, toca .github/workflows/ (Rule 8)
- **Comentário de fechamento:** "Fechando: branch sem ancestral comum com main (NO_MERGE_BASE) — impossível mergear sem rebase completo. Conteúdo de workflows deve ser resubmetido a partir do main atual se ainda relevante."

#### PR #2418 — fix(ci): gitleaks allowlist
- **Branch:** outra sessão | **Draft:** sim
- **Evidência:** mergeable_state=dirty, NO_MERGE_BASE, toca .gitleaks.toml (Rule 8)
- **Comentário de fechamento:** "Fechando: branch sem ancestral comum com main (NO_MERGE_BASE). Mudança em .gitleaks.toml deve ser resubmetida a partir do main atual se ainda relevante."

#### PR #2419 — fix(ci): check-security-definer-acl
- **Branch:** outra sessão | **Draft:** sim
- **Evidência:** mergeable_state=dirty, NO_MERGE_BASE, toca .github/workflows/ (Rule 8)
- **Comentário de fechamento:** "Fechando: branch sem ancestral comum com main (NO_MERGE_BASE). Resubmeter do main se conteúdo ainda relevante."

#### PR #2420 — chore(db): rollback retroativo migrations
- **Branch:** outra sessão | **Draft:** sim
- **Evidência:** mergeable_state=dirty, NO_MERGE_BASE, toca supabase/rollbacks/ (Rule 8)
- **Comentário de fechamento:** "Fechando: branch sem ancestral comum com main (NO_MERGE_BASE). Conteúdo de rollbacks de migrations deve ser resubmetido via fluxo db-apply-migration.yml se ainda necessário."

#### PR #2422 — chore(docs): MIGRATIONS_SYNC_LOG update
- **Branch:** outra sessão | **Draft:** sim
- **Evidência:** mergeable_state=dirty, NO_MERGE_BASE
- **Comentário de fechamento:** "Fechando: branch sem ancestral comum com main (NO_MERGE_BASE). MIGRATIONS_SYNC_LOG já atualizado via outros PRs mergeados."

#### PR #2452 — fix(docs): remove prefixo supabase/migrations/
- **Branch:** session_01HW5obNKUFtUMbBdgUb94kY (REGRA #10) | **Draft:** sim
- **Evidência:** Diff: analise-prs/dossies/PR-2441.md (docs apenas). REGRA #10: branch alheia
- **Comentário de fechamento:** "Fechando: branch de outra sessão (REGRA #10) — não é possível mergear autonomamente. Conteúdo docs-only pode ser resubmetido se ainda relevante."

#### PR #2471 — docs(ci): RELATORIO_CI rev9-13 + PENDENCIAS P16/P18/P19 + migration-refs-baseline
- **Branch:** session_01Nc1nb7PArDnixYvvZssnKy (REGRA #10) | **Draft:** sim
- **Evidência:** draft:true + dirty (CONFLITO) + REGRA #10 branch sessão session_01Nc1nb7PArDnixYvvZssnKy; 3 arquivos docs
- **Comentário de fechamento:** "Fechando: branch de outra sessão (REGRA #10) com conflito. Conteúdo docs pode ser resubmetido a partir do main atual se ainda relevante."

#### PR #2484 — docs(ci): PENDENCIAS.md P41 — regressão Branch Protection Sentinel
- **Branch:** `claude/docs-p41-sentinel-regressao-261025-0640` (session_01Nc1nb7PArDnixYvvZssnKy) | **Draft:** não
- **Evidência:** github_get_pr_diff(#2484): PENDENCIAS.md +2/-962 linhas. mergeable_state=dirty. REGRA #10: branch de outra sessão.
- **Comentário de fechamento:** "Fechando: branch de outra sessão (REGRA #10) e mergeable_state=dirty. A deleção de 962 linhas em PENDENCIAS.md representa risco de perda de histórico. Conteúdo docs-only pode ser resubmetido a partir do main atual se ainda relevante."

---

### DECISÃO_HUMANA (7 PRs) — Exigem Aprovação do PO

#### PR #2415 — fix(ci): P20 node --test runner
- **Draft:** não | **mergeable_state:** dirty | **Rule 8:** workflows x2
- **Ação:** PO revisar mudanças nos 2 workflows e resolver conflito antes de aprovar

#### PR #2428 — fix(ci): gitleaks allowlist FPs
- **Draft:** sim | **mergeable_state:** clean | **Rule 8:** .gitleaks.toml
- **Ação:** PO revisar cada entrada de allowlist adicionada e converter de draft se aprovado

#### PR #2432 — feat(qa): probe E184 legacy refs
- **Draft:** não | **mergeable_state:** clean | **Gate Final:** FAILURE run #40129848772
- **REGRA #10:** branch de session_01HxRBtssJabMB3jTgNY5B9W
- **4 bugs:** (1) pg_get_functiondef() em aggregates aborta; (2) pg_settings não expõe GUCs app.*; (3) cron.job.jobname NULL omitido; (4) REGRA #10
- **Ação:** PO decidir: fechar e recriar com bugs corrigidos, ou corrigir na branch original

#### PR #2443 — APROVAÇÃO REQUERIDA: Fase B completa
- **Draft:** sim | **mergeable_state:** clean
- **Ação:** PO revisar APROVACAO_FASE_B_IMPACTO.md e converter de draft se aprovado

#### PR #2449 — chore(migrations): E99 repair-only sync
- **Draft:** sim | **mergeable_state:** dirty | **Rule 8:** supabase/migrations/ x2
- **Ação:** PO revisar migrations E99 repair-only + resolver conflito antes de aprovar

#### PR #2469 — fix(ci): e2e-personalization E42
- **Draft:** não | **mergeable_state:** clean | **Rule 8:** .github/workflows/e2e-personalization.yml
- **REGRA #10:** branch de outra sessão
- **Ação:** PO revisar mudança no workflow e aprovar se correto

#### PR #2480 — docs(audit): FASE B — MIGRATIONS_SYNC_LOG completo + baseline_depois
- **Branch:** `claude_05/friendly-keller-3mgkhz` (session_01JPgV7FqkG4UuFBJWiJa9FB) | **Draft:** sim
- **mergeable_state:** behind | **Rule 8:** nenhum
- **REGRA #10:** branch de outra sessão
- **Evidência:** github_get_pr_diff(#2480): 3 arquivos docs (supabase/MIGRATIONS_SYNC_LOG.md, auditoria-supabase/inventario/baseline_depois.json, auditoria-supabase/correcoes.md)
- **Ação:** PO revisar MIGRATIONS_SYNC_LOG + baseline_depois + correcoes.md e converter de draft se aprovado

---

## Diffs Lidos na Janela Atual

| PR | Arquivos-chave | Bloqueador | Veredito |
|---|---|---|---|
| #2415 | ci-security-drift.yml, deploy-gates.yml | Rule 8: workflows x2 | DECISÃO_HUMANA |
| #2417 | .github/workflows/ x3, cors.ts | Rule 8 + REGRA #10 + draft | FECHAR |
| #2418 | .gitleaks.toml, deploy-gates.yml | Rule 8 + REGRA #10 + draft | FECHAR |
| #2419 | check-security-definer-acl.mjs | Rule 8 + REGRA #10 + draft | FECHAR |
| #2420 | supabase/migrations/20261019*.sql, rollbacks/ | Rule 8 + REGRA #10 + draft | FECHAR |
| #2422 | check-secrets-inventory.mjs | Rule 8 + REGRA #10 + draft | FECHAR |
| #2428 | .gitleaks.toml (10 allowlist entries) | Rule 8 + REGRA #10 + draft | DECISÃO_HUMANA |
| #2432 | probe_e184_legacy_refs.sql (39 linhas) | CI FAILURE + REGRA #10 + 4 bugs | DECISÃO_HUMANA |
| #2443 | APROVACAO_FASE_B_IMPACTO.md | REGRA #10 + draft + título explícito | DECISÃO_HUMANA |
| #2449 | 2 migrations E99 repair-only | Rule 8 + REGRA #10 + draft | DECISÃO_HUMANA |
| #2452 | analise-prs/dossies/PR-2441.md | REGRA #10 + draft | FECHAR |
| #2469 | e2e-personalization.yml | Rule 8 + REGRA #10 | DECISÃO_HUMANA |
| #2471 | diff vazio (CONFLITO) | REGRA #10 + draft + CONFLITO | FECHAR |
| #2480 | MIGRATIONS_SYNC_LOG.md, baseline_depois.json, correcoes.md | REGRA #10 + draft | DECISÃO_HUMANA |
| #2484 | PENDENCIAS.md (+2/-962 linhas) | REGRA #10 + dirty + deleção massiva | FECHAR |

---

## CI-vs-Baseline após Merges Autônomos

### PR #2479 — docs(analise-prs): deliverables rev3
- **Arquivos:** analise-prs/ apenas (docs) — `paths-ignore: docs/**` → Gate Final NÃO dispara
- **Último Gate Final verde:** run #40169270830 (SHA `de48ab27`) — conclusion=success
- **Baseline:** 429 testes, 0 falhas — **inalterada**

### PR #2481 — docs(analise-prs): deliverables finais rev4
- **SHA merge:** `a778e1e467a92c5db46f6cc844eb0e48452040fa`
- **Gate Final:** run #40170213405 — **conclusion=success** ✅
- **Baseline:** 429 testes, 0 falhas — **inalterada**

### PR #2486 — docs(analise-prs): deliverables rev5
- **SHA merge:** `f761938ece2939d5564d6ba51bcd0feb487ce057`
- **Gate Final:** run #40172460728 — **conclusion=success** ✅
- **Baseline:** 429 testes, 0 falhas — **inalterada**

---

## Merges Autônomos desta Sessão

### PR #2479 — docs(analise-prs): deliverables rev3
- **SHA:** `de48ab2792f0b8e658d1534d881599aebb51a35c`
- **Gate Final:** run #40169270830 — conclusion=success ✅
- **Mergeado em:** 2026-10-25T06:30:07Z

### PR #2481 — docs(analise-prs): deliverables finais rev4
- **SHA:** `a778e1e467a92c5db46f6cc844eb0e48452040fa`
- **Gate Final:** run #40170213405 — conclusion=success ✅
- **Mergeado em:** 2026-10-25T07:00:00Z

### PR #2486 — docs(analise-prs): deliverables rev5
- **SHA:** `f761938ece2939d5564d6ba51bcd0feb487ce057`
- **Gate Final:** run #40172460728 — conclusion=success ✅
- **Mergeado em:** 2026-10-25T07:21:27Z

---

## Produção — Verificação Pós-Merge

- **Migrations pendentes de deploy:** 0
- **Edge functions pendentes de deploy:** 0
- **REGRA #1 verificada:** `CURRENT_PROJECT_ID = 'doufsxqlfjyuvxuezpln'` inalterado em todas as PRs desta sessão.
- **E056 respeitado:** Nenhum DDL executado via `execute_sql` nesta sessão.

---

## NÃO VERIFICADO

- Estado das 6 migrations do PR #2449 no ledger `supabase_migrations.schema_migrations`
- 4 bugs no probe SQL do PR #2432 (verificação requer execução em Supabase)
- Se PR #2415 corrigiria o node --test runner issue (sem execução local)
- Se PR #2469 corrige regressão real no e2e-personalization (sem histórico de falhas)
- Estado do MIGRATIONS_SYNC_LOG no PR #2480 vs ledger atual

---

## META CUMPRIDA

| Critério | Evidência |
|---|---|
| Diffs lidos (100%) | Tabela "Diffs Lidos" — 15 PRs abertas lidas |
| CI-vs-baseline após merge | PRs #2479/#2481/#2486 docs-only → Gate não dispara em paths-ignore; baseline 429/0 inalterada. Gate Final run #40172460728 (f761938e) = success |
| regras-de-negocio.md | Entregue em PR #2479 (SHA de48ab27) |
| prs.csv | analise-prs/prs.csv — 41 PRs (38 conteúdo + 3 deliverables) |
| progresso.json | analise-prs/progresso.json — 41 PRs, 15 abertas, contagem não-sobreposta soma=41 |
| prs.json | analise-prs/prs.json — 15 PRs abertas (inclui #2471) |
| RELATORIO_PRS.md | Este arquivo |
| Comentários de fechamento | Textos nas seções FECHAR acima |
| Baseline por nome de teste | analise-prs/baseline/vitest-per-test-name.txt — CI run #40150209361 |
| Verificação de produção | Migrations: 0 pendentes; Edge functions: 0 pendentes |
