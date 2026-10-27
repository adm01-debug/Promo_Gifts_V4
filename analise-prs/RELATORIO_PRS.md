# RELATÓRIO DE PRs — Promo Gifts V4
**Sessão:** session_011d8gKLZg8BWivR8aQBwxGF (rev28)
**Data:** 2026-10-27
**main HEAD:** `1648890907d5831e2383157936f13742e326171c`
**Commit:** docs(ci): registra nota de governança sobre squash merge sem sufixo PR (#2601)

---

## Resumo Executivo

| Métrica | Valor |
|---|---|
| Total de PRs analisadas (histórico) | 49 |
| PRs abertas nesta sessão | 15 |
| PRs mergeadas autonomamente (total histórico) | 15 |
| PRs mergeadas nesta sessão | 0 |
| PRs aguardando DECISAO_HUMANA (abertas) | 9 |
| PRs BLOQUEADAS por REGRA#8 (abertas) | 6 |
| PRs FECHAR / orphas (abertas) | 1 |

---

## Baseline (SHA 1648890907d5 - rev28)

| Verificação | Resultado |
|---|---|
| TypeScript (tsc --noEmit) | 0 erros (SHA 2ca5ef04e) |
| Build Vite | built in 11.77s (SHA 2ca5ef04e) |
| Lint ESLint | OOM - FATAL ERROR pre-existente (nao e regressao) |
| Vitest parcial (utils/hooks/lib) | 429 testes, 0 falhas (CI run #40218104943) |
| Gate Final (Deploy Gates) | success — SHA c113300c (run #40218104943, 2026-10-25) |
| Gate 0 SSOT | CURRENT_PROJECT_ID = doufsxqlfjyuvxuezpln |

**Nota:** Deploy Gates não disparou para SHA 1648890907d5 (commit docs-only em analise-prs/ — paths-ignore:docs/**). Baseline de referência = último run success em SHA c113300c.

---

## PRs Abertas - Vereditos

### FECHAR (1 PR)

| PR | Titulo | Motivo |
|---|---|---|
| #2420 | chore(db): rollback retroativo migration | Branch orfa - NO_MERGE_BASE. Sem ancestral comum com main. |

### BLOQUEADA - REGRA#8 workflows (6 PRs)

Constraint ativo: nao tocar .github/workflows — nenhuma escrita autonoma nestas PRs.

| PR | Titulo | Rule8 |
|---|---|---|
| #2572 | chore(ci/feat): contrato E189 + CI | .github/workflows/ + supabase/migrations/ + CONFLICT |
| #2590 | bump codeql-action/upload-sarif 4.39.1 | gitleaks-history-audit.yml |
| #2591 | bump codeql-action/analyze 4.39.1 | codeql.yml |
| #2592 | bump actions/stale 9 to 11 | stale.yml |
| #2593 | bump codeql-action/init 4.39.1 | codeql.yml |
| #2594 | bump actions/setup-node 4 to 7 | e2e workflows + sem SHA pin |

### DECISAO_HUMANA (9 PRs abertas)

| PR | Titulo | Draft | Motivo |
|---|---|---|---|
| #2579 | release 1.0.0 | nao | Downgrade 1.2.1 to 1.0.0 - regressao semantica |
| #2580 | fix(banco): rollback e23 | sim | DRAFT + migrations REGRA#8 |
| #2587 | bump zustand 4 to 5 | nao | Major upgrade - 11 stores incompativeis com API v5 |
| #2588 | bump react-day-picker 8 to 10 | nao | Major upgrade - calendar.tsx usa API v8 |
| #2597 | fix: 4 workflows CI falhando | sim | DRAFT + REGRA#8 workflow |
| #2600 | docs(analise-prs): addendum | sim | DRAFT - entregaveis desta sessao |
| #2602 | fix(e2e): corrige falhas E2E mobile | sim | DRAFT - API retorna 405 |
| #2603 | fix(crons): 4 migrations — 401, burst, 404, blurhash | sim | DRAFT + REGRA#8 migrations (4 cron.alter_job) |
| #2572 | chore(ci/feat): contrato E189 + CI | nao | REGRA#10 cross-agent + REGRA#8 + CONFLICT |

---

## Merge Tests vs main 1648890907d5 (rev28)

| PR | Branch | Resultado |
|---|---|---|
| #2420 | claude/fix-rollback-261019-1637 | NO_MERGE_BASE |
| #2572 | claude_05/youthful-ride-vcdchy | CONFLICT (RELATORIO_CI.md + ItemCard.tsx) |
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
| #2602 | claude/fix-e2e-mobile-failures-261027-1500 | CLEAN (tree 9496eef0ec0d) |
| #2603 | claude_04/tender-hawking-ghw2zi | CLEAN (mergeable=true API, 496 add, 0 del) |

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

- PR #2603: NOVA nesta sessão (2026-10-27T00:43:44Z). DRAFT + REGRA#8 (4 migrations cron.alter_job). Fixes operacionais reais: 401 a cada 15min, 27 timeouts/dia, 404 a cada 3h. Requer PO aprovar e converter DRAFT→ready.
- PR #2602: DRAFT — GitHub API 405 impede merge. Requer PO converter para ready-for-review.
- PR #2572: CONFLICT (RELATORIO_CI.md + ItemCard.tsx) vs main 1648890907d5. Mantido BLOQUEADA.
- PR #2597: DRAFT verificado via API. Fix tecnico valioso aguarda PO por REGRA#8.
- Branches #2590-2593: dependabot actions atualizadas de -3.x para -4.39.1.

---

## META CUMPRIDA - rev28

- main SHA: 1648890907d5831e2383157936f13742e326171c
- Baseline: typecheck 0 erros, build Vite OK, Gate Final success (CI run #40218104943, 429/0 falhas)
- 49 PRs em prs.csv (historico completo)
- 15 PRs abertas — 100% cobertura com veredito e dossier
- prs.json: 49 entradas, main_head correto
- 15 dossiers PR-NNNN.md (incluindo novo PR-2603.md)
- Merge tests vs 1648890907d5 — 15 PRs (incluindo #2603 CLEAN)
- 0 PRs mergeadas (todas bloqueadas: 5 DRAFT-API-405, 6 REGRA#8, 2 DECISAO_HUMANA major, 1 semantic downgrade, 1 CONFLICT+REGRA#8+REGRA#10, 1 NO_MERGE_BASE)
- 0 escritas proibidas no GitHub
- worktrees removidos
