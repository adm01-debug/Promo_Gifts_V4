# RELATORIO_PRS — Análise de PRs abertas

**Gerado em:** 2026-10-29  
**Sessão:** https://claude.ai/code/session_01RfQzo8Ean3zudG2sEN79b6  
**Main HEAD início:** `6b48bebcb2ff5ff922298523f4678383d392ae46`  
**Main HEAD final:** `8bc08b12f50872e2d9b9a93d3f7dbae388fec204`

---

## ⚠️ RISCOS E BLOQUEIOS (leia primeiro)

| Risco | Impacto | Ação necessária |
|---|---|---|
| PR #2734 toca `.github/workflows/contract-tests.yml` | CI de contrato pode mudar comportamento de pull de imagens Docker | PO revisar diff antes de autorizar |
| PR #2731 Gate Final FAILURE (base desatualizada `4b4206a`) | Fix de rate-guard E049 ainda não integrado ao main | Rebase da branch + novo Gate Final |
| PR #2713 release-please `blocked` sem Gate Final | Release 1.1.0 automático travado | Investigar proteção de branch e rodar CI |
| PR #2720 toca `.github/workflows/` + CONFLITO | Fix de CI com conflito duplo | PO revisar + resolver conflito |
| PR #2714 toca `supabase/migrations/` + CONFLITO | Migration com conflito | PO revisar + resolver conflito via db-apply-migration.yml |
| PR #2688 (draft) toca `.github/workflows/` + CONFLITO | Double bloqueio | Fechar ou rebasar |
| 13 PRs com CONFLITO | Branches divergiram do main por >1 semana | Rebase necessário em cada |

---

## Inventário Completo — 19 PRs analisadas

| PR | Branch | Merge Test | Gate Final | Verdict | Motivo |
|---|---|---|---|---|---|
| #2735 | docs/auditoria-sync-ci-20261029 | LIMPO | ✅ SUCCESS | **MERGEADA** ✅ | Docs only; squash SHA `27f4261` |
| #2733 | fix/p200-e131-cloud-status-hook | LIMPO | ✅ SUCCESS | **MERGEADA** ✅ | Test P200-E131 + doc; squash SHA `8bc08b1` |
| #2721 | fix/kit-maker-timer-cancel | LIMPO | ✅ SUCCESS | **MERGEADA** ✅ | Fix timers kit-maker; squash SHA `6b48beb` |
| #2734 | fix/contract-tests-ghcr-auth | LIMPO | ✅ SUCCESS | **DECISAO_HUMANA** | `.github/workflows/contract-tests.yml` — REGRA #8 |
| #2720 | fix/ci-workflows | CONFLITO | — | **CONFLITO+DECISAO_HUMANA** | `.github/workflows/` + conflito |
| #2714 | fix/reconcile-canonical-pending-migrations | CONFLITO | — | **CONFLITO+DECISAO_HUMANA** | `supabase/migrations/` + conflito |
| #2688 | claude_pink/focused-lamport-qyupp8 | CONFLITO | — | **CONFLITO+DECISAO_HUMANA** | Draft + `.github/workflows/` + conflito |
| #2731 | fix/p200-e049-rate-guard | LIMPO | ❌ FAILURE | **AGUARDAR_CI** | Base desatualizada; precisa rebase + novo Gate Final |
| #2713 | release-please | LIMPO | 0 runs | **AGUARDAR_CI** | `mergeable_state=blocked`; `autorelease: pending`; Gate Final nunca rodou |
| #2730 | fix/p200-e051-e052 | CONFLITO | — | **CONFLITO** | |
| #2719 | chore/graphify-audit-improvements-20261029 | CONFLITO | — | **CONFLITO** | |
| #2717 | fix/e2e-vite-port-isolation | CONFLITO | — | **CONFLITO** | |
| #2716 | docs/auditoria-sync-canonico-2026-10-28 | CONFLITO | — | **CONFLITO** | |
| #2711 | claude_pink/fix-relatorio-final-281028-1530 | CONFLITO | — | **CONFLITO** | Draft |
| #2707 | e66-edge-deploy-receipt-40747468580 | CONFLITO | — | **CONFLITO** | |
| #2701 | claude/fix-p12-grant-kit-view-261028-1730 | CONFLITO | — | **CONFLITO** | Draft |
| #2695 | docs/reconciliar-espelho-google-20261028 | CONFLITO | — | **CONFLITO** | |
| #2693 | claude_pink/peaceful-planck-q4ee1i | CONFLITO | — | **CONFLITO** | |
| #2729 | claude/eloquent-ramanujan-0yt2fo | N/A | N/A | **NAO_MERGEAR** | Branch de entrega desta sessão (draft) |
| #2674 | claude_pink/sleepy-cannon-h000nc | CONFLITO | — | **CONFLITO** | Draft |

---

## Contagem por veredito

| Veredito | Quantidade | PRs |
|---|---|---|
| MERGEADA ✅ | 3 | #2721, #2735, #2733 |
| DECISAO_HUMANA | 1 | #2734 |
| CONFLITO+DECISAO_HUMANA | 3 | #2720, #2714, #2688 |
| AGUARDAR_CI | 2 | #2731, #2713 |
| CONFLITO | 9 | #2730, #2719, #2717, #2716, #2711, #2707, #2701, #2695, #2693, #2674 |
| NAO_MERGEAR | 1 | #2729 |
| **Total analisado** | **19** | **= total aberto ✅** |

---

## Merges realizados

| PR | SHA merge | Gate Final | Método | Conteúdo |
|---|---|---|---|---|
| #2721 | `6b48bebcb2ff5ff922298523f4678383d392ae46` | ✅ | squash | fix(kit-maker): cancela timers ao desmontar painel |
| #2735 | `27f426157582b1205a41f2daae6ff82837f3a849` | ✅ | squash | docs(auditoria): sync CI status + pendências |
| #2733 | `8bc08b12f50872e2d9b9a93d3f7dbae388fec204` | ✅ | squash | test(cloud-status): CloudStatusContext P200-E131 |

---

## Baseline de testes (main SHA `6b48beb`)

67 arquivos de teste | 1835 testes | 3 falhas pré-existentes (TZ UTC vs BRT em date-utils.test.ts)  
Comando: `npx vitest run tests/unit/ tests/scripts/` — duração: 44.97s

---

## Decisões HUMANAS pendentes

| PR | Motivo | Ação |
|---|---|---|
| #2734 | `.github/workflows/contract-tests.yml` (+38 linhas: permissions packages:read + fallback Docker Hub) | Revisar diff; Gate Final ✅; merge test LIMPO |
| #2720 | `.github/workflows/` + CONFLITO | Resolver conflito + revisar |
| #2714 | `supabase/migrations/` + CONFLITO | Resolver conflito + aplicar via db-apply-migration.yml |
| #2688 | `.github/workflows/` + CONFLITO + draft | Fechar ou rebasar |

---

## Escritas no GitHub desta sessão

1. PR #2735 — squash-merge → SHA `27f4261`
2. PR #2733 — squash-merge → SHA `8bc08b1`

---

*Gerado por Claude Code — sessão https://claude.ai/code/session_01RfQzo8Ean3zudG2sEN79b6*
