# RELATÓRIO DE PRs — Promo Gifts V4
**Sessão:** https://claude.ai/code/session_01Ss1tXZ4cAbxBvdmu95uNPz  
**Data:** 2026-10-25  
**main HEAD:** `de48ab2792f0b8e658d1534d881599aebb51a35c`  
**Baseline CI:** 429 testes, 0 falhas — Gate Final run #40169270830 SUCCESS

---

## Resumo Executivo

| Métrica | Valor |
|---|---|
| PRs analisadas | 40 (#2414–#2479) |
| PRs abertas atuais | 12 |
| Merges autônomos esta sessão | 1 (PR #2479) |
| Regressões introduzidas | 0 |
| Migrations pendentes de deploy | 0 |
| Edge functions pendentes de deploy | 0 |

### Contagem por Veredito (todos os 40 PRs)

| Veredito | Quantidade |
|---|---|
| MERGEAR (mergeadas autonomamente) | 13 |
| DECISÃO_HUMANA (aguarda PO) | 11 |
| DECISÃO_HUMANA→MERGEADO_PO | 10 |
| FECHAR | 8 |
| IMPOSSÍVEL | 5 |
| MERGEADO (por outra sessão) | 2 |

---

## PRs Abertas Atuais (12)

### 🔴 FECHAR (6 PRs)

#### PR #2417 — fix: cors.ts + 3 workflows
- **Draft:** sim | **Evidência:** NO_MERGE_BASE + Rule 8 (.github/workflows/)
- **Comentário:** "Fechando: branch sem ancestral comum com main (NO_MERGE_BASE) — impossível mergear. Resubmeter do main se relevante."

#### PR #2418 — fix(ci): gitleaks allowlist
- **Draft:** sim | **Evidência:** NO_MERGE_BASE + Rule 8 (.gitleaks.toml)
- **Comentário:** "Fechando: branch sem ancestral comum com main (NO_MERGE_BASE). Mudança em .gitleaks.toml deve ser resubmetida do main atual."

#### PR #2419 — fix(ci): check-security-definer-acl
- **Draft:** sim | **Evidência:** NO_MERGE_BASE + Rule 8 (.github/workflows/)
- **Comentário:** "Fechando: branch sem ancestral comum com main (NO_MERGE_BASE). Resubmeter do main se relevante."

#### PR #2420 — chore(db): rollback retroativo migrations
- **Draft:** sim | **Evidência:** NO_MERGE_BASE + Rule 8 (supabase/rollbacks/)
- **Comentário:** "Fechando: branch sem ancestral comum com main (NO_MERGE_BASE). Rollbacks devem ser resubmetidos via db-apply-migration.yml."

#### PR #2422 — chore(docs): MIGRATIONS_SYNC_LOG update
- **Draft:** sim | **Evidência:** NO_MERGE_BASE
- **Comentário:** "Fechando: branch sem ancestral comum com main (NO_MERGE_BASE). MIGRATIONS_SYNC_LOG já atualizado via outros PRs."

#### PR #2452 — fix(docs): remove prefixo supabase/migrations/
- **Draft:** sim | **Evidência:** REGRA #10 (branch session_01HW5obNKUFtUMbBdgUb94kY)
- **Comentário:** "Fechando: branch de outra sessão (REGRA #10). Conteúdo docs-only pode ser resubmetido se relevante."

---

### 🟡 DECISÃO_HUMANA (6 PRs)

#### PR #2415 — fix(ci): P20 node --test runner
- **Draft:** não | **Conflito:** sim | **Rule 8:** ci-security-drift.yml + deploy-gates.yml
- **Ação:** PO revisar mudanças nos 2 workflows + resolver conflito

#### PR #2428 — fix(ci): gitleaks allowlist FPs
- **Draft:** sim | **Rule 8:** .gitleaks.toml
- **Ação:** PO revisar cada entrada de allowlist e converter de draft se aprovado

#### PR #2432 — feat(qa): probe E184 legacy refs
- **Draft:** não | **Gate Final:** FAILURE run #40129848772 | **REGRA #10:** session_01HxRBtssJabMB3jTgNY5B9W
- **4 bugs:** pg_get_functiondef em aggregates; pg_settings vs pg_db_role_setting; jobname NULL omitido; REGRA #10
- **Ação:** PO decidir fechar e recriar com bugs corrigidos

#### PR #2443 — APROVAÇÃO REQUERIDA: Fase B completa
- **Draft:** sim | **Diff:** auditoria-supabase/analise-impacto/APROVACAO_FASE_B_IMPACTO.md (docs)
- **Ação:** PO revisar e converter de draft se aprovado

#### PR #2449 — chore(migrations): E99 repair-only sync
- **Draft:** sim | **Conflito:** sim | **Rule 8:** supabase/migrations/
- **Ação:** PO revisar migrations + resolver conflito

#### PR #2469 — fix(ci): e2e-personalization E42
- **Draft:** não | **Rule 8:** .github/workflows/e2e-personalization.yml | **REGRA #10:** outra sessão
- **Ação:** PO revisar mudança no workflow

---

## Merge Autônomo desta Sessão

### PR #2479 — docs(analise-prs): deliverables rev3
- **SHA:** `de48ab2792f0b8e658d1534d881599aebb51a35c`
- **Gate Final:** run #40169270830 — **conclusion=success** ✅
- **Mergeado em:** 2026-10-25T06:30:07Z
- **Arquivos:** prs.csv, regras-de-negocio.md, baseline/vitest-per-test-name.txt, dossies/ (5 arquivos)
- **Regressão:** 0 — Gate Final success confirma baseline 429 testes, 0 falhas

---

## Produção — Verificação Pós-Merge

- **Migrations pendentes de deploy:** 0
- **Edge functions pendentes de deploy:** 0
- **Nota:** Nenhum PR aberto ou mergeado por esta sessão contém migrations ou edge functions.

---

## NÃO VERIFICADO

- Estado das migrations do PR #2449 no ledger (requer acesso Supabase)
- 4 bugs no probe SQL do PR #2432 (requer execução no banco)
- Se PR #2415 corrige o node --test runner issue (sem execução local)
- Se PR #2469 corrige regressão real no workflow E2E (sem histórico de falhas)
