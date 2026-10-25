# RELATORIO_PRS — Sessão session_01Ss1tXZ4cAbxBvdmu95uNPz (rev19)
**Data:** 2026-10-25
**main HEAD:** `5279abfe07895d9b0481fa08086b2c18d321de5f` (PR #2546 — docs rev18)
**Gate Final confirmado:** Run #40223579961 — SHA `7d3bd4ba` — ✅ success (2026-10-25T19:02:42Z)
**Baseline:** 429 testes / 0 falhas

---

## Resumo executivo

| Métrica | Valor |
|---|---|
| PRs abertas analisadas | 29 |
| Merges autônomos esta sessão | **0** |
| DECISAO_HUMANA | 23 |
| FECHAR (órfãs) | 5 |
| JÁ_EM_MAIN | 1 |
| Merges autônomos sessões anteriores (docs) | 3 (#2529, #2543, #2546) |

**Resultado: 0 merges autônomos — todas as 29 PRs abertas bloqueadas.**

---

## Distribuição por veredito

```
DECISAO_HUMANA   : 23
FECHAR           :  5  (órfãs NO_MERGE_BASE — ação do PO)
JA_EM_MAIN       :  1
──────────────────────
TOTAL ABERTAS    : 29
```

---

## PRs — DECISAO_HUMANA (23)

| PR | Título | Motivo principal |
|---|---|---|
| #2415 | fix(ci): P20 — exclui check-file-size-baseline | CONFLICT + REGRA#8 (2 workflows) + cross-session |
| #2428 | fix(ci): .gitleaks.toml allowlist mock tokens | CONFLICT + REGRA#8 (.gitleaks.toml) |
| #2443 | APROVAÇÃO REQUERIDA: P06/P09/P14/P15/P03 FASE B | CLEAN, mas título exige aprovação + segurança + REGRA#10 |
| #2449 | chore(migrations): E99 mirrors repair-only | CONFLICT + REGRA#8 (supabase/migrations/) |
| #2452 | fix(docs): remove prefixo em PR-2441.md | CONFLICT + REGRA#10 |
| #2469 | fix(ci): e2e-personalization E42 skip ratio | CONFLICT + REGRA#8 (workflow) + REGRA#10 |
| #2503 | docs(ci): RELATORIO_CI Rev21 | CONFLICT + REGRA#10 |
| #2520 | chore(main): release 1.0.0 | Downgrade 1.2.1→1.0.0 (regressão) |
| #2532 | docs: atualiza run refs P2b/P23/P61 | CONFLICT + REGRA#10 |
| #2537 | fix: Contract Tests registry ghcr.io | REGRA#8 (workflow) |
| #2544 | docs: backlog CI CI-001..CI-008 | Draft + REGRA#10 |
| #2545 | chore: backlog funcionalidades FT-001..FT-416 | Draft + REGRA#10 |
| #2547 | fix: remove links públicos mortos | Draft + REGRA#10 |
| #2548 | feat: botão LGPD "Excluir meus dados" | Draft + REGRA#10 |
| #2549 | chore: backlog Supabase SB-001..SB-018 | Draft + REGRA#10 |
| #2550 | fix: filtro "Publicado" Kit Maker | Draft + REGRA#10 + regra negócio D7 pendente |
| #2551 | fix: peso 0 no Kit Maker | Draft + REGRA#10 |
| #2552 | fix: materials-api timeout 20s | Draft + REGRA#10 |
| #2553 | fix: selos sem mock | Draft + REGRA#10 |
| #2554 | fix: BI Cliente 360 sem mock | Draft + REGRA#10 |
| #2555 | docs(pendencias): rev29 | Draft + REGRA#10 (claude_05/ diferente) |
| #2556 | chore: backlog banco O1/O3 | Draft + REGRA#10 |
| #2557 | docs: RELATORIO_CI.md P27/P66/P67/P68 | Draft + REGRA#10 |

### Detalhe: PR #2537 — Contract Tests registry ghcr.io
- CLEAN, 1 commit único, `+5/-5` em `.github/workflows/contract-tests.yml` (ECR → ghcr.io)
- Única pendência: REGRA#8 workflow — exige aprovação PO

### Detalhe: PR #2520 — Release 1.0.0 (release-please)
- Criada por `github-actions[bot]`; propõe downgrade `1.2.1 → 1.0.0` — regressão de versão

### Detalhe: PR #2443 — APROVAÇÃO REQUERIDA
- CLEAN, 1 commit, `APROVACAO_FASE_B_IMPACTO.md`; título exige decisão do PO; segurança P03/P06/P09/P14/P15

---

## PRs — FECHAR (5 órfãs)

| PR | Branch | Motivo |
|---|---|---|
| #2417 | claude/fix-contract-mag-reader-261019-2110 | NO_MERGE_BASE |
| #2418 | claude/fix-gitleaks-gate-261019-1800 | NO_MERGE_BASE |
| #2419 | claude/fix-sync-log-ci-261019-1730 | NO_MERGE_BASE |
| #2420 | claude/fix-rollback-261019-1637 | NO_MERGE_BASE |
| #2422 | claude/chore-migrations-sync-log-261019-1600 | NO_MERGE_BASE |

Branches sem ancestral comum com `main`. Impossível mergear.
**Ação requerida do PO:** fechar manualmente no GitHub.

---

## PRs — JÁ_EM_MAIN (1)

| PR | Evidência |
|---|---|
| #2432 | `git cherry HEAD refs/remotes/pr/2432` = 0 commits únicos |

---

## Por que ZERO merges autônomos

Todas as 29 PRs falham em pelo menos 1 dos 8 critérios:

| Bloqueio | PRs |
|---|---|
| NO_MERGE_BASE | #2417, #2418, #2419, #2420, #2422 |
| JÁ_EM_MAIN (cherry=0) | #2432 |
| CONFLICT | #2415, #2428, #2449, #2452, #2469, #2503, #2532 |
| REGRA#8 (.github/workflows/) | #2415, #2417, #2418, #2419, #2469, #2537 |
| REGRA#8 (.gitleaks.toml) | #2428 |
| REGRA#8 (supabase/migrations/) | #2449 |
| REGRA#10 (cross-session) | #2443, #2452, #2469, #2503, #2532, #2544–#2557 |
| Draft bloqueado | #2444–#2557 |
| Regressão semântica | #2520 (downgrade 1.2.1→1.0.0) |
| Segurança/aprovação | #2443 |

**PRs CLEAN sem CONFLICT:** #2432 (JÁ_EM_MAIN), #2443 (REGRA#10+segurança), #2520 (downgrade), #2537 (REGRA#8), #2544–#2557 (draft+REGRA#10).

---

## Estado do CI

- **Run:** #40223579961 — SHA `7d3bd4ba` — ✅ success (2026-10-25T19:02:42Z)
- **Baseline:** 429 testes / 0 falhas

---

## Ações requeridas do PO

### Imediatas
1. **Fechar 5 PRs órfãs:** #2417, #2418, #2419, #2420, #2422
2. **Fechar PR obsoleta:** #2432 (já em main)

### Decisão técnica/negócio
3. **PR #2537** — Aprovar troca ECR→ghcr.io em Contract Tests (CLEAN, baixo risco)
4. **PR #2520** — Aceitar ou rejeitar downgrade 1.2.1→1.0.0 (release-please)
5. **PR #2443** — Revisão segurança P03/P06/P09/P14/P15 FASE B
6. **PRs #2547–#2557** — 11 PRs técnicas de outra sessão: revisar e promover de draft

### Conflito — resolver ou abandonar
7. #2415, #2428, #2449, #2452, #2469, #2503, #2532 — todas com CONFLICT; obsoletas ou aguardando rebase
