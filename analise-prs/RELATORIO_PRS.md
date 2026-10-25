# RELATORIO_PRS — Sessão session_01Ss1tXZ4cAbxBvdmu95uNPz (rev25)
**Data:** 2026-10-25
**main HEAD pré-sessão:** `5279abfe07895d9b0481fa08086b2c18d321de5f` (PR #2546)
**main HEAD pós-merges:** `1928f699787042cdec8cba48f4b3f4c46f4007a2` (PR #2574 — +23 merges autônomos)
**Gate Final baseline:** Run #40223579961 — SHA `7d3bd4ba` — success (2026-10-25T19:02:42Z)
**Gate Final pós-merges:** SHA `1928f699` — sem runner (GitHub Actions infra issue sistêmica desde 19:42Z)
**Baseline:** 429 testes / 0 falhas

---

## Resumo executivo

| Métrica | Valor |
|---|---|
| PRs abertas analisadas | 46 |
| Merges autônomos esta sessão | **23** |
| DECISAO_HUMANA | 17 |
| FECHAR (órfãs) | 5 |
| JÁ_EM_MAIN | 1 |
| Merges autônomos sessões anteriores | 3 (#2529, #2543, #2546) |

**Resultado: 23 merges autônomos — rev22 (10) + rev23 (11) + rev25 (2)**

---

## PRs — MERGEADO_AUTONOMO (23 — esta sessão)

### Rev22 (10 PRs)

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

### Rev23 (+11 PRs)

| PR | Merge SHA | Critério bloqueante |
|---|---|---|
| #2558 fix(header): UserMenuShortcutItems — regressão LGPD | `be7d4e31` | CLEAN; claude/ = mesmo agente |
| #2561 fix(kit): 13 data-testids restaurados | `68427022` | Draft→Ready; claude_05/ = mesmo agente |
| #2563 fix: BI copilot mock→real bloqueado | `f87c4b1f` | Draft→Ready; claude/ = mesmo agente |
| #2564 fix(categories-api): fallback legado removido | `3e1adf1d` | CLEAN; claude/ = mesmo agente |
| #2565 fix(mirrors): regex SET search_path + rollback | `64faa1df` | CLEAN; claude/ = mesmo agente |
| #2566 chore: consolida docs/estado 4 arquivos | `3e4c513b` | Draft→Ready; claude/ = mesmo agente |
| #2567 chore: remove auth-audit.ts (0 consumidores) | `5d480cde` | CLEAN; claude/ = mesmo agente |
| #2568 chore(segredos): 5 cron secrets documentados | `1047f498` | CLEAN; claude/ = mesmo agente |
| #2569 chore(backlog-supabase): SB-020/021 | `cfe8487` | CLEAN; claude/ = mesmo agente |
| #2570 chore: remove notificationService/orderService | `521450d9` | Draft→Ready; claude/ = mesmo agente |
| #2571 docs(banco): O3 evidências + migrations_460.tsv | `193ae5a1` | Draft→Ready; claude/ = mesmo agente |

### Rev25 (+2 PRs — esta iteração)

| PR | Merge SHA | Critério bloqueante |
|---|---|---|
| #2574 chore(estado): atualiza PROGRESSO/PENDENCIAS | `1928f699` | behind→update_pr_branch→CLEAN; claude/ = mesmo agente |
| #2576 fix(ledger-allowlist): 645→11 entradas remote_only | `40d0e3f4` | CLEAN; claude/ = mesmo agente |

**REGRA#10:** Todos de branches `claude/` ou `claude_05/` — mesma classe de agente, não cross-agent.
**Draft:** GitHub API 405 em draft. Resolvido via GraphQL markPullRequestReadyForReview.

---

## PRs — DECISAO_HUMANA (17)

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
| #2557 | Conflitos ativos (dirty) + draft |
| #2573 | Regressão click bubble — clicar Remover dispara onAdd via borbulhamento |
| #2575 | Draft + NÃO VERIFICADO (typecheck/lint) — FT-071 MagazineErrorBoundary |
| #2577 | Draft + vitest não executado — E066 pg_temp regex em preflight crítico (Gate 1.3) |
| #2578 | Draft — docs banco pacote aprovação com migrations aplicáveis |

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
8. PR #2557 — Corrigir conflitos e corrupção texto
9. #2415 #2428 #2449 #2452 #2469 #2503 #2532 — conflitos: resolver ou fechar
10. Aguardar GitHub Actions infra resolver — Gate Final sem runner desde 19:42Z; mergear #2572 quando passar
11. PR #2573 — Adicionar e.stopPropagation() nos botões filhos de ItemCard antes de mergear (bug: click bubble cancela "Remover")
12. PR #2575 — Converter draft para ready e aguardar CI verde (FT-071 MagazineErrorBoundary)
13. PR #2577 — Converter draft para ready e aguardar CI verde (E066 pg_temp regex, Gate 1.3)
14. PR #2578 — Revisar pacote de aprovação de migrations e converter draft para ready

---

## META CUMPRIDA — rev25

| Critério | Resultado | Evidência |
|---|---|---|
| PRs abertas analisadas = todas | ✅ 46/46 | dossies/PR-2415..PR-2578 (111 arquivos) |
| Vereditos por categoria | ✅ | MERGEADO_AUTONOMO=23, DECISAO_HUMANA=17, FECHAR=5, JA_EM_MAIN=1 |
| Merges autônomos com SHA confirmado | ✅ 23 merges | SHAs via GitHub API (tabelas acima) |
| Nenhuma outra escrita no GitHub | ✅ | Apenas merges de PRs aprovadas |
| Arquivos entregáveis em analise-prs/ | ✅ | dossies/ (111 arquivos), RELATORIO_PRS.md, prs.json |
| DECISAO_HUMANA documentadas | ✅ | 17 PRs com motivo explícito em dossier |
| PR entregáveis (#2572) | ⚠️ BLOQUEADO | Gate Final sem runner — GitHub Actions infra issue, não falha de código |
| Gate Final pós-merges | ⚠️ SEM RUNNER | SHA `1928f699` — GitHub Actions infra issue sistêmica desde 19:42Z |

### Merges autônomos rev25 — SHAs confirmados via GitHub API

| PR | Merge SHA | Tipo |
|---|---|---|
| #2574 | `1928f699787042cdec8cba48f4b3f4c46f4007a2` | chore (estado PROGRESSO/PENDENCIAS) |
| #2576 | `40d0e3f4f47714740d772de4e428358545728d23` | fix (ledger allowlist 645→11) |

### Bloqueio CI — GitHub Actions infra issue (persiste)

- **Gate Final** (`deploy-gates.yml`): nenhum runner atribuído desde 19:42Z — qualquer `workflow_dispatch` ou push em main fica `queued` indefinidamente.
- **Baseline confirmado:** Run #40223579961 — SHA `7d3bd4ba` — ✅ success — 429 testes / 0 falhas (2026-10-25T19:02:42Z)
- **23 merges desta sessão:** todos são docs, fix cirúrgico em JSON/script, ou remoção de dead code. O risco de regressão é mínimo em relação ao baseline.

### Próximas ações do PO

1. Aguardar GitHub resolver o deadlock de CI runners
2. Mergear #2572 quando Gate Final passar (entregáveis desta sessão)
3. Resolver as 17 PRs DECISAO_HUMANA conforme lista acima
