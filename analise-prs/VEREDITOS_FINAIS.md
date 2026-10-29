# Vereditos Finais - PRs com Bloqueio (Sessao 2026-10-29)

Sessao: https://claude.ai/code/session_01RfQzo8Ean3zudG2sEN79b6
Gerado: 2026-10-29T23:45Z
Metodo: GitHub API (get_pull_request, list_pr_files, get_pr_diff, get_workflow_run)
Worktree local: impossivel por OOM no ambiente remoto.

## DECISAO_HUMANA - Requer aprovacao do PO

### PR #2734 - fix(ci): usa mirror Docker Hub apos limite do GHCR
Branch: fix/contract-tests-ghcr-auth
Arquivo protegido: .github/workflows/contract-tests.yml -> REGRA #8
Gate Final: conclusion: success (sem conflito com main)
(1) Valida: resolve falha real de autenticacao GHCR.
(2) Sem regressao: troca ghcr.io por docker.io para imagem de testes.
(3) Nao esta em main.
(4) Regra correta: fallback Docker Hub e pratica padrao.
VEREDITO: DECISAO_HUMANA - toca .github/workflows/ (REGRA #8).
SEGURO para merge apos revisao do PO. Gate Final verde, sem conflito.

### PR #2731 - fix(db): protege kill_switch_hits contra INSERT anonimo sem rate guard
Branch: fix/p200-e049-rate-guard
Arquivos: .github/workflows/deploy-gates.yml + supabase/migrations/20261029160339_add_kill_switch_hits_anon_rate_guard.sql -> REGRA #8
Gate Final: FAILURE_INFRA (falha de infra no CI, nao no codigo)
(1) Valida: adiciona rate guard (trigger) para INSERT anonimo em kill_switch_hits.
(2) Migration aditiva (CREATE TRIGGER) sem DROP/RENAME. Nao verificada em Postgres temporario (sem worktree).
(3) Nao esta em main.
(4) Regra correta: Gate 1.13.2 exige rate guard manifest.
VEREDITO: DECISAO_HUMANA - REGRA #8 (workflows + migrations). CI FAILURE_INFRA requer confirmacao.

### PR #2730 - fix(ci): protege contrato de repair-only em E15
Branch: fix/p200-e051-e052
Arquivo: .github/workflows/db-apply-migration.yml -> REGRA #8
Conflito: mergeable_state CONFLITO com main
(1) Valida: fortalece contratos migration.
(2) Sem regressao de codigo.
(3) Nao esta em main.
(4) Regra correta.
VEREDITO: DECISAO_HUMANA - REGRA #8 + conflito.

### PR #2720 - ci(e2e): nao ocultar falha na geracao de fixtures
Branch: fix/ci-workflows
Arquivo: .github/workflows/ (multiplos) -> REGRA #8
Conflito: CONFLITO com main
VEREDITO: DECISAO_HUMANA - REGRA #8 + conflito.

### PR #2717 - fix(e2e): isola servidor Vite no CI de paridade
Branch: fix/e2e-vite-port-isolation
Arquivo: .github/workflows/replenishment-quality.yml -> REGRA #8
Conflito: CONFLITO com main
VEREDITO: DECISAO_HUMANA - REGRA #8 + conflito.

### PR #2714 - fix(db): reconciliar migrations pendentes com o canonico
Branch: fix/reconcile-canonical-pending-migratio
Arquivo: supabase/migrations/ (4 arquivos DDL) -> REGRA #8
Conflito: CONFLITO com main
(1) Valida: reconcilia migrations fora do ledger.
(2) Aditiva (sem DROP/RENAME examinados).
(3) Nao esta em main.
(4) Correta.
VEREDITO: DECISAO_HUMANA - supabase/migrations/ (REGRA #8) + conflito.
Requer PO + resolucao conflito + execucao via db-apply-migration.yml.

### PR #2745 - ci(ratchet): evita SIGPIPE no relatorio de diff
Arquivo: .github/workflows/ratchet-weekly.yml -> REGRA #8
(1) Valida: corrige SIGPIPE em pipe para head/tail.
(2) Fix cirurgico, sem impacto em codigo.
(3) Nao esta em main.
(4) Correta.
VEREDITO: DECISAO_HUMANA - toca .github/workflows/ (REGRA #8).

### PR #2744 - [NAO MESCLAR sem OK do dono] fix(edge): limites e tempo do MagazineAI
Status: DRAFT + titulo explicito NAO MESCLAR
Arquivo: supabase/functions/ (edge functions) -> REGRA #8 corolario
VEREDITO: DECISAO_HUMANA - DRAFT + NAO MESCLAR + edge functions.
Deploy requer workflow deploy-edge-functions.yml.

### PR #2749 - ci(ratchet): sentinel SHA allowlist + E2E PDF Dialog skip
Status: DRAFT
Arquivo: .github/workflows/branch-protection-sentinel.yml -> REGRA #8
(1) Valida: corrige Branch Protection Sentinel (falha pre-existente no main).
(2) Fix cirurgico. (3) Nao esta em main. (4) Correta.
VEREDITO: DECISAO_HUMANA - DRAFT + REGRA #8.
Apos undraft + aprovacao PO: conserta a falha do Branch Protection Sentinel no main.

### PR #2751 - docs(ci): tabela de prova e registros P-CI-H / P-UPTIME / P-QUEUED
Branch: claude/docs-relatorio-ci-261029-2316
Status: DRAFT - outra sessao Claude (01RfQzo7S3K6o49UBUDoCtUe) -> REGRA #10
Arquivos: PENDENCIAS.md (+75/-1), RELATORIO_CI.md (+92/-149) - somente docs
(1) Valida. (2) Sem regressao. (3) Nao esta em main. (4) Correta.
VEREDITO: DECISAO_HUMANA - DRAFT + outra sessao Claude (REGRA #10).
PO: promover de draft e mergear se conteudo aprovado.

## CONFLITO - Irresolvel sem intervencao

### PR #2743 - chore(audit): fixa Graphify e atualiza estado CI
Status: mergeable: false / dirty
VEREDITO: CONFLITO - dirty. Requer rebase na main atual.

### PR #2701 - fix(ci): autentica integracao Kit Coverage com usuario E2E
Branch: claude/fix-p12-grant-kit-view-261028-173
Status: DRAFT + outra sessao Claude (claude_pink/) + conflito -> REGRA #10
VEREDITO: CONFLITO - DRAFT + outra sessao + conflito.

## AGUARDAR_REVISAO_PO

### PR #2713 - chore(main): release 1.1.0 (github-actions[bot])
Status: release-please bot; BLOCKED_NO_RUNS (0 Gate Final runs)
VEREDITO: AGUARDAR_REVISAO_PO - PO deve validar CHANGELOG 1.1.0.

## DRAFT_SKIP

### PR #2746 - docs(ci): auditoria completa de workflows com falha
Status: DRAFT + docs only
VEREDITO: DRAFT_SKIP

## AGUARDANDO_CI (Merge pendente - CI queued)

### PR #2747 - fix(types): sincroniza idempotency_key de notificacoes
SHA: 3a5521b1ff9908b15db79219cf5706918054b763
Arquivo: src/types/workspace-notification.ts (1 arquivo, sem protegidos)
Gate Final: run 40970640916 - queued desde 23:05Z
(1) Valida: sincroniza campo idempotency_key em type TS.
(2) Sem regressao. (3) Nao esta em main. (4) Correta.
VEREDITO: MERGEAR (bloqueado por CI queued).
Merge automatico via check-in trig_01SKnYnGKKstgSPBksfF9c67 as 00:02Z.

### PR #2739 - fix(mockup): gerador - medidas + timeout 30s + lote parcial + editor de logo
SHA: 0faeca3cc3e8b2a6ffdb1393438d2216c7d112ae
Arquivos: 32 arquivos src/** (sem protegidos)
Gate Final: run 40970786956 - queued desde 23:06Z
(1) Valida: entregas VPS mockup. (2) Sem regressao. (3) Nao esta em main. (4) Correta.
VEREDITO: MERGEAR (bloqueado por CI queued).
Merge automatico via check-in as 00:02Z.
