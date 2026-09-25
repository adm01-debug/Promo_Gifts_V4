# Registro de deploys de Edge Functions

Ledger de todo deploy de edge function no projeto canônico `doufsxqlfjyuvxuezpln`,
análogo ao `supabase/MIGRATIONS_SYNC_LOG.md` para migrations (PLANO_DBA E15).

**Por quê:** 2 casos de deploy fora do fluxo git só foram descobertos pelo job
"Compare GitHub × Canonical" (drift check) — sem ledger algum que os apontasse
antes disso: `kit-ai-builder` (2026-09-23, timeout de 20s implementado direto
em produção) e `magazine-reader-state-read` (2026-09-24, fix de segurança
fail-open deployado via MCP antes de qualquer revisão do PR #1899). Ver o
corolário "caminho único para deploy de edge function" em `CLAUDE.md`
(REGRA #8) e as etapas E66/E67 de
`docs/plans/PLANO_CONSOLIDACAO_AUDITORIAS_100_ETAPAS_2026-09-24.md`.

**Caminho normal:** `.github/workflows/deploy-edge-functions.yml`
(`workflow_dispatch` com `function_name`, ou automático em `push` para `main`
tocando `supabase/functions/**`). Cada deploy bem-sucedido grava aqui uma
linha automaticamente (job `ledger` do mesmo workflow) e abre um PR com o
recibo — nunca commit direto em `main`.

**Deploy de emergência fora do fluxo (MCP/dashboard):** só sob as 3 condições
de `docs/db/POLITICA_EDGE_DEPLOY.md` (E73) — uma delas é registrar aqui
manualmente, no mesmo dia, com o método `emergência-MCP`.

## Recibos

| Data (UTC) | Slug | Versão | SHA (git) | Run | Executor | Método |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-09-25T06:08:52.597Z | `kit-ai-builder` | 288 | `a79944b53f436d428dab1ce9fb5984b31e79489f` | 36101511155 | GitHub Actions (disparado por adm01-debug) | workflow_dispatch |

## Retro-registro (casos anteriores a este ledger, E67)

| Data | Slug | Versão | Como foi descoberto | Reconciliação |
| --- | --- | --- | --- | --- |
| 2026-09-23 | `kit-ai-builder` | v285 | Job "Compare GitHub × Canonical" (drift check) — timeout de 20s presente em produção sem commit correspondente | Reconciliado em `7899b0254`, trazendo o timeout para o git |
| 2026-09-24 | `magazine-reader-state-read` | v39–v42 | Job "Compare GitHub × Canonical" (drift check) no PR #1899 — fix de segurança fail-open deployado via MCP antes de qualquer revisão | Reconciliado em `558b30daf` (git) + `workflow_dispatch` run 36015927545 (deploy oficial, byte-idêntico ao git) |
