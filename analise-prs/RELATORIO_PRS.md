# RELATÓRIO DE PRs — Promo Gifts V4
**Sessão:** session_011d8gKLZg8BWivR8aQBwxGF (rev26)
**Data:** 2026-10-27
**main HEAD:** `1648890907d5831e2383157936f13742e326171c`
**Commit:** docs(ci): registra nota de governança sobre squash merge sem sufixo PR (#2601)

---

## Resumo Executivo

| Métrica | Valor |
|---|---|
| Total de PRs analisadas (histórico) | 47 |
| PRs abertas nesta sessão | 13 |
| PRs mergeadas autonomamente (total histórico) | 15 |
| PRs mergeadas nesta sessão | 0 |
| PRs aguardando DECISAO_HUMANA (abertas) | 7 |
| PRs BLOQUEADAS por REGRA#8 (abertas) | 5 |
| PRs FECHAR / orphas (abertas) | 1 |

---

## Baseline (SHA 1648890907d5 - rev26)

| Verificação | Resultado |
|---|---|
| TypeScript (tsc --noEmit) | 0 erros (SHA 2ca5ef04e) |
| Build Vite | built in 11.77s (SHA 2ca5ef04e) |
| Lint ESLint | OOM - FATAL ERROR pre-existente (nao e regressao) |
| Vitest parcial (utils/hooks/lib) | 2549 testes, 0 falhas, 3 skipped |
| Gate 0 SSOT | CURRENT_PROJECT_ID = doufsxqlfjyuvxuezpln |

---

## PRs Abertas - Vereditos

### FECHAR (1 PR)

| PR | Titulo | Motivo |
|---|---|---|
| #2420 | chore(db): rollback retroativo migration | Branch orfa - NO_MERGE_BASE. Sem ancestral comum com main. |

### BLOQUEADA - REGRA#8 workflows (5 PRs)

Constraint ativo: nao tocar .github/workflows - nenhuma escrita autonoma nestas PRs.

| PR | Titulo | Rule8 |
|---|---|---|
| #2590 | bump codeql-action/upload-sarif 4.39.1 | gitleaks-history-audit.yml |
| #2591 | bump codeql-action/analyze 4.39.1 | codeql.yml |
| #2592 | bump actions/stale 9 to 11 | stale.yml |
| #2593 | bump codeql-action/init 4.39.1 | codeql.yml |
| #2572 | chore(ci/feat): contrato E189 + CI | contract-tests.yml + supabase/migrations/ + REGRA#10 |

### DECISAO_HUMANA (7 PRs)

| PR | Titulo | Draft | Motivo |
|---|---|---|---|
| #2579 | release 1.0.0 | nao | Downgrade 1.2.1 to 1.0.0 - regressao semantica |
| #2580 | fix(banco): rollback e23 | sim | DRAFT + migrations REGRA#8 |
| #2587 | bump zustand 4 to 5 | nao | Major upgrade - 11 stores incompativeis com API v5 |
| #2588 | bump react-day-picker 8 to 10 | nao | Major upgrade - calendar.tsx usa API v8 |
| #2594 | bump actions/setup-node 4 to 7 | nao | .github/workflows REGRA#8 + sem SHA pin |
| #2597 | fix: 4 workflows CI falhando | sim | DRAFT + REGRA#8 workflow |
| #2600 | docs(analise-prs): addendum rev22 | sim | DRAFT - entregaveis desta sessao |

---

## Merge Tests vs main 1648890907d5 (rev26)

| PR | Branch | Resultado |
|---|---|---|
| #2420 | claude/fix-rollback-261019-1637 | NO_MERGE_BASE |
| #2572 | claude_05/youthful-ride-vcdchy | CLEAN |
| #2579 | release-please--branches--main--components--gifts-store | CLEAN |
| #2580 | claude/fix-e23-rollback-261025-2145 | CLEAN |
| #2587 | dependabot/npm_and_yarn/zustand-5.0.16 | CLEAN |
| #2588 | dependabot/npm_and_yarn/react-day-picker-10.0.2 | CLEAN |
| #2590 | dependabot/github_actions/github/codeql-action/upload-sarif-4.39.1 | CLEAN |
| #2591 | dependabot/github_actions/github/codeql-action/analyze-4.39.1 | CLEAN |
| #2592 | dependabot/github_actions/actions/stale-11.0.0 | CLEAN |
| #2593 | dependabot/github_actions/github/codeql-action/init-4.39.1 | CLEAN |
| #2594 | dependabot/github_actions/actions/setup-node-7 | CLEAN |
| #2597 | claude_04/beautiful-gates-bvocz5 | CLEAN |
| #2600 | claude_04/optimistic-bohr-qplx94 | CLEAN |

---

## PRs Mergeadas Autonomamente (Historico - 15 total)

| PR | SHA merge | Titulo |
|---|---|---|
| #2544 | 1d26da908 | docs: backlog CI CI-001..CI-008 |
| #2545 | 2a93ba556 | chore: backlog funcionalidades FT-001..FT-416 |
| #2548 | 9be832a35 | feat: botao LGPD excluir meus dados |
| #2549 | 73df7502f | chore: backlog Supabase SB-001..SB-018 |
| #2551 | 97eed25cb | fix: peso 0 no Kit Maker |
| #2552 | 35fdb5793 | fix: materials-api timeout 20s |
| #2553 | aebd333f3 | fix: selos sem mock |
| #2554 | e6538448e | fix: BI Cliente 360 sem mock |
| #2555 | 479f2219 | docs(pendencias): rev29 |
| #2556 | 15e10fd88 | chore: backlog banco O1/O3 |
| #2582 | 045d835f5 | chore(ci): metricas semanais 2026-W44 |
| #2585 | 145da71bb | bump prod deps minor/patch (7 updates) |
| #2586 | fb046592 | bump dev deps minor/patch (10 updates) |
| #2589 | 9e2746a31 | bump globals 15 to 17 |
| #2596 | 54e890458 | bump postcss-selector-parser (CVE-2026-104844) |

---

## Observacoes

- PR #2597: convertido para DRAFT (verificado via API 2026-10-27). Fix tecnico valioso aguarda aprovacao PO por REGRA#8.
- PR #2572: merge test CONFLICT vs 2ca5ef04e; CLEAN vs novo main 1648890907d5. Bloqueio mantido: REGRA#8 + REGRA#10.
- Branches #2590-2593: atualizadas de -3.x para -4.39.1 pelo dependabot entre sessoes.
- PR #2599: FECHADA_EXTERNAMENTE - conteudo integrado via commit direto 2ca5ef04e.

---

## META CUMPRIDA - rev26

- main SHA: 1648890907d5831e2383157936f13742e326171c
- Baseline: typecheck 0 erros, build Vite OK, vitest 2549/0 falhas
- 47 PRs em prs.csv (historico completo)
- 13 PRs abertas - 100% cobertura com veredito e dossier
- prs.json: 47 entradas, main_head correto
- 13 dossiers PR-NNNN.md
- Merge tests vs 1648890907d5 - 13 PRs
- 0 PRs mergeadas (todas bloqueadas por REGRA#8/REGRA#10/DRAFT/DECISAO_HUMANA/NO_MERGE_BASE)
- 0 escritas proibidas no GitHub
- worktrees removidos
