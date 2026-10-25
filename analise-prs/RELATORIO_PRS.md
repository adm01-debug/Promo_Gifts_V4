# RELATORIO_PRS — Sessão session_01Ss1tXZ4cAbxBvdmu95uNPz (rev20)
**Data:** 2026-10-25
**main HEAD:** `15e10fd88208f9b4cd372b82544fb27892d15a81` (PR #2556 — chore(docs) backlog banco)
**Gate Final em main:** queued em `15e10fd88` (run #40227283262, iniciado 2026-10-25T19:42Z)
**Baseline anterior confirmado:** 429 testes / 0 falhas (run #40223579961, SHA `7d3bd4ba`)

---

## Resumo executivo

| Métrica | Valor |
|---|---|
| PRs abertas analisadas esta sessão | 20 |
| Merges autônomos esta sessão | **0** |
| DECISAO_HUMANA | 14 |
| FECHAR (órfãs) | 5 |
| JÁ_EM_MAIN | 1 |
| PRs mergeadas por PO/outros agentes entre sessões | 10 (#2544, #2545, #2548, #2549, #2551, #2552, #2553, #2554, #2555, #2556) |

**Resultado: 0 merges autônomos — todas as 20 PRs abertas bloqueadas.**

---

## PRs mergeadas por PO/outros agentes (pós-rev19)

| PR | Título | SHA merge |
|---|---|---|
| #2551 | fix: peso 0 no Kit Maker | `97eed25cb` |
| #2552 | fix: materials-api timeout 20s | `35fdb5793` |
| #2553 | fix: selos sem mock | `aebd333f3` |
| #2554 | fix: BI Cliente 360 sem mock | `e6538448e` |
| #2548 | feat: botão LGPD "Excluir meus dados" | `9be832a35` |
| #2555 | docs(pendencias): rev29 | `479f22194` |
| #2544 | docs: backlog CI CI-001..CI-008 | `1d26da908` |
| #2545 | chore: backlog funcionalidades FT-001..FT-416 | `2a93ba556` |
| #2549 | chore: backlog Supabase SB-001..SB-018 | `73df7502f` |
| #2556 | chore: backlog banco O1/O3 | `15e10fd88` |

---

## Distribuição por veredito (20 PRs abertas)

```
DECISAO_HUMANA   : 14
FECHAR           :  5  (órfãs NO_MERGE_BASE — ação do PO)
JA_EM_MAIN       :  1
──────────────────────
TOTAL ABERTAS    : 20
```

---

## PRs — DECISAO_HUMANA (14)

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
| #2547 | fix: remove links públicos mortos | Draft + REGRA#10 |
| #2550 | fix: filtro "Publicado" Kit Maker | Draft + REGRA#10 + regra negócio D7 pendente |
| #2557 | docs: RELATORIO_CI.md P27/P66/P67/P68 | Draft + REGRA#10 |
| #2558 | fix: reduz Header.tsx abaixo do baseline | Draft + REGRA#10 |

### Detalhe: PR #2558 — reduz Header.tsx (NOVO nesta sessão)
- Branch: `claude/fix-header-tamanho-lgpd-251025-1950` (diff lido 100%)
- Extrai `Skins` + `Guia Rápido` de Header.tsx para novo `UserMenuShortcutItems.tsx` (+53/-37 net)
- CLEAN provável (criada após merge de #2548), sem REGRA#8 files
- Bloqueio: **Draft + REGRA#10** (branch `claude/` de sessão diferente desta)

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

Todas as 20 PRs falham em pelo menos 1 dos 8 critérios:

| Bloqueio | PRs |
|---|---|
| NO_MERGE_BASE | #2417, #2418, #2419, #2420, #2422 |
| JÁ_EM_MAIN (cherry=0) | #2432 |
| CONFLICT | #2415, #2428, #2449, #2452, #2469, #2503, #2532 |
| REGRA#8 (.github/workflows/) | #2415, #2469, #2537 |
| REGRA#8 (.gitleaks.toml) | #2428 |
| REGRA#8 (supabase/migrations/) | #2449 |
| REGRA#10 (cross-session) | #2443, #2452, #2469, #2503, #2532, #2547, #2550, #2557, #2558 |
| Draft bloqueado | #2547, #2550, #2557, #2558 |
| Regressão semântica | #2520 (downgrade 1.2.1→1.0.0) |
| Segurança/aprovação | #2443 |

---

## Estado do CI

- **main HEAD:** `15e10fd88` — Gate Final queued (run #40227283262, 2026-10-25T19:42Z)
- **Baseline:** 429 testes / 0 falhas (run #40223579961, SHA `7d3bd4ba`)
- **Último Gate Final confirmado:** run #40224559937, SHA `5279abfe` ✅ success (2026-10-25T19:38:53Z)

---

## Ações requeridas do PO

### Imediatas
1. **Fechar 5 PRs órfãs:** #2417, #2418, #2419, #2420, #2422
2. **Fechar PR obsoleta:** #2432 (já em main)

### Decisão técnica/negócio
3. **PR #2537** — Aprovar troca ECR→ghcr.io em Contract Tests (CLEAN, baixo risco)
4. **PR #2520** — Aceitar ou rejeitar downgrade 1.2.1→1.0.0 (release-please)
5. **PR #2443** — Revisão segurança P03/P06/P09/P14/P15 FASE B
6. **PRs #2547, #2550, #2557, #2558** — 4 PRs técnicas de outras sessões: revisar e promover de draft

### Conflito — resolver ou abandonar
7. #2415, #2428, #2449, #2452, #2469, #2503, #2532 — todas com CONFLICT; obsoletas ou aguardando rebase
