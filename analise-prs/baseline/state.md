# Baseline — Sessão session_012WyySbh2tj8vhRQLBf3mHo (continuação — 2026-10-29)

**Data atualização:** 2026-10-29T22:30Z
**main HEAD baseline (início sessão):** `62af0798dd71812979667ac29f596d25f3ef191b`
**main HEAD pós-merge #2720:** `14b6d5fca...` (SHA completo: 14b6d5fc)
**main HEAD pós-merge #2730:** `c3b41286` ← **HEAD ATUAL DO MAIN**

## Merges executados nesta sessão
- #2720 SHA `14b6d5fc` — ci(e2e): não ocultar falha de fixtures E2E
- #2730 SHA `c3b41286` — fix(ci): repair-only E15 — corrige injeção de expressão

## Gate Final no main atual (c3b41286)
- **Estado:** queued/in_progress (22:28Z) — CI disparado por merge de #2730
- Gate Final run: em andamento em 2026-10-29T22:28Z (checks com status `queued` e `in_progress`)
- Checks completados até 22:28Z: `OptimizedImage · unit` (success), `ESLint auto-fix` (success)
- Aguardando: SSOT Gates, quality-gate, Gate Final Deploy Ready

## Baseline anterior (sessão 01Ss1tXZ4cAbxBvdmu95uNPz — 2026-10-25)
- main HEAD: `c113300c034fb39126274fba9aa10ef05762ab13`
- Gate Final: SUCCESS ✅ (run #40218104943)
- Testes: 429 / 0 falhas (334 deploy-gate + 95 webhook-scenario-matrix)

## Nota sobre Gate E40 (2026-10-28)
- PR #2646 (sha `5d12084e`) causou Gate E40 FAILURE no main em 2026-10-28T05:40Z
- Causa: migration `20261027120000` com pré-condição que falha no replay do drift-check
- Status atual: **resolvido** — PR `fix/gate-e40-cron-seed-261028` criada com fix em `scripts/drift-baseline.mjs`
- Branch `fix/gate-e40-cron-seed-261028` tem 1 commit unpushed (dbdb7b88) — push bloqueado pelo auto mode nesta sessão

## PRs abertas atuais (14 total) — 2026-10-29T22:30Z
| PR | mergeable_state | Veredito |
|---|---|---|
| #2701 | dirty | NÃO MERGEAR |
| #2713 | unknown | DECISÃO_HUMANA |
| #2714 | dirty | NÃO MERGEAR |
| #2717 | dirty | NÃO MERGEAR |
| #2731 | behind | NÃO MERGEAR (regressão) |
| #2734 | behind | AGUARDANDO_CI |
| #2738 | blocked | AGUARDANDO_CI |
| #2739 | blocked | AGUARDANDO_CI |
| #2741 | blocked | AGUARDANDO_CI |
| #2742 | blocked | AGUARDANDO_CI |
| #2743 | blocked | AGUARDANDO_CI |
| #2744 | blocked (DRAFT) | NÃO MERGEAR |
| #2745 | behind | AGUARDANDO_CI |
| #2746 | DRAFT | NÃO MERGEAR |
