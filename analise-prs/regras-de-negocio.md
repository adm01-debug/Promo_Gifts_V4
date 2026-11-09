# Regras de Negócio — Auditoria de PRs (2026-11-09)

Derivadas do CLAUDE.md, histórico de PRs e análise do código.
Sessão: session_01VXkRxWq5ZUCmvuNx5e2TGX

---

## RB-01: Nunca Mergear Workflows
PRs que tocam `.github/workflows/` NUNCA são mergeadas sem aprovação explícita do PO.
Fundamento: CLAUDE.md mandato absoluto "Não tocar .github/workflows".
Aplica-se a: #3228, #3247, #3327, #3328, #3329, #3330, #3357

## RB-02: DDL Migrations Requerem PO
Qualquer PR com arquivo em `supabase/migrations/` ou `supabase/rollbacks/` requer aprovação do PO antes do merge.
O deploy ocorre via `.github/workflows/db-apply-migration.yml` (workflow_dispatch) — nunca via merge direto.
Aplica-se a: #3179, #3214, #3243, #3250, #3251, #3255, #3256, #3261, #3263, #3264, #3265, #3273, #3279, #3284

## RB-03: Major Version Bumps Requerem PO
Bumps de dependência com salto de major version (N→N+1 ou maior) requerem análise de compatibilidade e aprovação do PO.
Critério: `package.json` com semver MAJOR diferente (ex: 3.x.x → 4.x.x).
Aplica-se a: #3331 (date-fns 3→4), #3333 (framer-motion 11→14), #3334 (sentry 8→11)

## RB-04: CI Verde É Pré-requisito de Merge
PRs com Gate Final ou qualquer gate bloqueante em FAILURE não são mergeadas.
Aplica-se a: #3329, #3330, #3332, #3339

## RB-05: SSOT Canônico Nunca Alterado
O projeto Supabase `doufsxqlfjyuvxuezpln` é o único canônico.
Fundamento: REGRA #1 do CLAUDE.md.

## RB-06: Merge Conflict = Não Mergeável
PRs com mergeStateStatus=CONFLICTING ou DIRTY não podem ser mergeadas pelo agente.
Aplica-se a: #3203, #3355

## RB-07: Branch de Entrega Nunca Mergeada
A branch `claude_pink/sleepy-cannon-h000nc` (PR #3355) é a branch de rastreamento do agente.
NUNCA deve ser mergeada em main.

## RB-08: Dependabot Workflows = AGUARDA_PO
PRs do Dependabot que tocam `.github/workflows/` seguem RB-01.
Aplica-se a: #3327, #3328.

## RB-09: Dependabot Deps Sem Major Bump = Elegível
PRs do Dependabot com bump de patch/minor que não tocam workflows podem ser mergeadas se CI verde.
Exceção: RB-03 prevalece para major bumps.

## RB-10: Cron DDL Exige Workflow Dispatch
Qualquer `cron.alter_job`, `cron.schedule`, `cron.unschedule` deve ser aplicado via db-apply-migration.yml.
Fundamento: REGRA #8/E056 do CLAUDE.md.
Aplica-se a: #3214, #3251, #3263, #3279

## RB-11: Release Please PR = Decisão do PO
PRs geradas pelo `github-actions[bot]` via Release Please são decisões de release.
O agente não mergeia releases automaticamente.
Aplica-se a: #3210

## RB-12: Idempotência é Requisito para Merge de Migration
Migrations de reconciliação devem usar IF NOT EXISTS, CREATE OR REPLACE, etc.
Verificado em: #3243, #3250, #3255, #3261, #3264, #3265, #3273

## RB-13: PR com Gate 1 Failure por Regressão = NAO_MERGEAR
PRs que introduzem regressão em Gate 1 não são mergeadas.
Aplica-se a: #3339

## RB-14: Verificação de Produção Antes de Merge de Migration
Antes de classificar uma migration como AGUARDA_PO (aprovável), verificar via execute_sql (READ ONLY)
que o estado em produção é o esperado.

## RB-15: Escrita em GitHub Apenas via MCP FOREVER
Toda operação de escrita no GitHub usa exclusivamente `mcp__GITHUB_-_MCP_-_FOREVER__*`.
O MCP padrão do GitHub retorna 403 em writes.
