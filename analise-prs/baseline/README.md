# Baseline CI - Main SHA 9a97f9a2c857b25590691efd2c741a194bfb24da

Data: 2026-10-29
Sessao: https://claude.ai/code/session_01RfQzo8Ean3zudG2sEN79b6
SHA inicial: 8bc08b12f50872e2d9b9a93d3f7dbae388fec204
SHA pos-8-merges: 9a97f9a2c857b25590691efd2c741a194bfb24da

## Deploy Gates no Main

O workflow deploy-gates.yml NAO disparou no push para main apos PR #2719 (docs-only/chore).
O workflow usa paths-ignore que excluiu esse push.

Deploy Gates RODOU e PASSOU em todas as 8 PRs antes de cada merge:
Evidencia: conclusion: success verificada via github_get_workflow_run (FOREVER MCP) antes
de cada operacao de github_merge_pull_request.

## Checks que Rodaram em Main 9a97f9a2c8 (pos-merges)

| Workflow | Run ID | Resultado |
|---|---|---|
| Static Health Checks | 40969607792 | success |
| SSOT Supabase Guard | 40969607824 | success |
| Security Scan | 40969607897 | success |
| Gitleaks Full History Audit | 40969607927 | success |
| Policies Baseline | 40969607904 | success |
| Supabase Linter Gate | 40969607838 | success |
| CodeQL | 40969607845 | success |
| Select Columns vs Types | 40969607793 | success |
| UI Visual A11y | 40969607907 | success |
| Quote Builder Delivery Quality | 40969607919 | success |
| Required Checks Guard | 40969607855 | success |
| Release Please | 40969607960 | success |
| E2E Personalization Flow | 40969607989 | FAILURE (PRE-EXISTENTE) |
| Branch Protection Sentinel | 40969607706 | FAILURE (PRE-EXISTENTE - aguarda PR #2749) |

## Falhas Conhecidas (Pre-Existentes - NAO Introduzidas pelos Merges)

E2E Personalization Flow (run 40969607989): pre-existente, nao bloqueante para Gate Final
Branch Protection Sentinel (run 40969607706): aguarda PR #2749 (DECISAO_HUMANA, REGRA #8)
Uptime Monitor: infra externa intermitente

## Logs Supabase (postgres_logs) Pos-Merges 18:00-23:59 UTC

Erros encontrados - NENHUM introduzido pelos merges:
- database postgres has a collation version mismatch: plataforma Supabase, pre-existente
- column companies.owner_id does not exist: erro app pre-existente (nenhum merge tocou companies)
- duration 30028ms SELECT pg_sleep(30): cron lento pre-existente

Conclusao: zero erros novos introduzidos pelos 8 merges.

## Analise Local (Worktree)

NAO REALIZADA. Motivo: OOM - npm run lint:baseline falha com heap limit no ambiente remoto.
Analise de diff realizada via GitHub API (get_pr_diff, list_pr_files) para cada PR.
Evidencia documentada nos dossiers individuais.

## PRs Aguardando CI

| PR | Run ID | Status | Desde |
|---|---|---|---|
| #2747 | 40970640916 | queued | 23:05Z |
| #2739 | 40970786956 | queued | 23:06Z |

Causa: backlog de runners GitHub Actions.
Merge automatico via check-in trig_01SKnYnGKKstgSPBksfF9c67 as 00:02Z.
