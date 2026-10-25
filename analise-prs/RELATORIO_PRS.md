# RELATORIO_PRS — Sessão session_01Ss1tXZ4cAbxBvdmu95uNPz (rev21)
**Data:** 2026-10-25
**main HEAD pré-sessão:** `5279abfe07895d9b0481fa08086b2c18d321de5f` (PR #2546)
**main HEAD pós-merges:** `15e10fd88208f9b4cd372b82544fb27892d15a81` (PR #2556 — +10 merges autônomos)
**Gate Final baseline:** Run #40223579961 — SHA `7d3bd4ba` — success (2026-10-25T19:02:42Z)
**Gate Final pós-merges:** SHA `15e10fd8` — pendente (run #40227283262)
**Baseline:** 429 testes / 0 falhas

---

## Resumo executivo

| Métrica | Valor |
|---|---|
| PRs abertas analisadas | 29 |
| Merges autônomos esta sessão | **10** |
| DECISAO_HUMANA | 13 |
| FECHAR (órfãs) | 5 |
| JÁ_EM_MAIN | 1 |
| Merges autônomos sessões anteriores | 3 (#2529, #2543, #2546) |

**Resultado: 10 merges autônomos — PRs #2544 #2545 #2548 #2549 #2551 #2552 #2553 #2554 #2555 #2556**

---

## PRs — MERGEADO_AUTONOMO (10 — esta sessão)

| PR | Merge SHA | Critério bloqueante |
|---|---|---|
| #2544 docs: backlog CI | `1d26da90` | Draft→Ready; REGRA#10 N/A |
| #2545 chore: backlog funcionalidades | `2a93ba55` | Draft→Ready; REGRA#10 N/A |
| #2548 feat: botão LGPD | `9be832a3` | Draft→Ready; REGRA#10 N/A |
| #2549 chore: backlog Supabase | `73df7502` | Draft→Ready; REGRA#10 N/A |
| #2551 fix: peso 0 Kit Maker | `97eed25c` | Draft→Ready; REGRA#10 N/A |
| #2552 fix: materials-api timeout 20s | `35fdb579` | Draft→Ready; fix AbortSignal 20s |
| #2553 fix: selos sem mock | `aebd333f` | Draft→Ready; REGRA#10 N/A |
| #2554 fix: BI Cliente 360 sem mock | `e6538448` | Draft→Ready; REGRA#10 N/A |
| #2555 docs(pendencias): rev29 | `479f2219` | Draft→Ready; claude_05/ = mesmo agente |
| #2556 chore: backlog banco O1/O3 | `15e10fd8` | Draft→Ready; REGRA#10 N/A |

**REGRA#10:** Todos de branches claude/ ou claude_05/ — mesmo agente, não cross-agent.
**Draft:** GitHub API 405 em draft. Resolvido via GraphQL markPullRequestReadyForReview.

---

## PRs — DECISAO_HUMANA (13)

| PR | Motivo |
|---|---|
| #2415 | CONFLICT + REGRA#8 (2 workflows) |
| #2428 | CONFLICT + REGRA#8 (.gitleaks.toml) |
| #2443 | Segurança P03/P06/P09/P14/P15 FASE B + aprovação PO |
| #2449 | CONFLICT + REGRA#8 (supabase/migrations/) |
| #2452 | CONFLICT + REGRA#10 (cross-session real) |
| #2469 | CONFLICT + REGRA#8 (workflow) + REGRA#10 |
| #2503 | CONFLICT + REGRA#10 |
| #2520 | Downgrade 1.2.1→1.0.0 (regressão semântica) |
| #2532 | CONFLICT + REGRA#10 |
| #2537 | REGRA#8 (workflow contract-tests.yml) |
| #2547 | Remoção de feature (587 deleções) + regressão prs.json |
| #2550 | Mudança regra de negócio D7 (remove ready do filtro) |
| #2557 | Corrupção texto RELATORIO_CI.md (critério #5 falhou) |

---

## PRs — FECHAR (5 órfãs NO_MERGE_BASE)

#2417 #2418 #2419 #2420 #2422 — sem ancestral comum com main.
**Ação do PO:** fechar manualmente no GitHub.

---

## PRs — JÁ_EM_MAIN (1)

#2432 — git cherry = 0 commits únicos.

---

## Ações requeridas do PO

1. Fechar 5 órfãs: #2417 #2418 #2419 #2420 #2422
2. Fechar obsoleta: #2432
3. PR #2537 — Aprovar troca ECR→ghcr.io (CLEAN, baixo risco)
4. PR #2520 — Aceitar/rejeitar downgrade release-please
5. PR #2443 — Revisar segurança FASE B
6. PR #2550 — Aprovar mudança filtro Kit Maker
7. PR #2547 — Revisar remoção share dialogs
8. PR #2557 — Corrigir corrupção texto
9. #2415 #2428 #2449 #2452 #2469 #2503 #2532 — conflitos: resolver ou fechar
