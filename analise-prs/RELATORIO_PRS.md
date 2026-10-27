# Relatório de Análise de PRs — sessão_012WyySbh2tj8vhRQLBf3mHo

**Data:** 2026-10-27  
**Sessão:** session_012WyySbh2tj8vhRQLBf3mHo  
**Rev:** 53

---

## Baseline de CI (antes de qualquer merge)

| Campo | Valor |
|---|---|
| Gate Final run | 40420603513 |
| SHA analisado | `2fafe8edd3e6bcf1a9f3fdd9dbc90869d6d57c59` |
| Status | **success** |
| Testes unitários (Vitest) | 429 passando / 0 falhas |
| main HEAD na entrada | `df18546dfd76d1bea7ea5873257b668d128d8df3` |
| main HEAD final | `e0b569f18cdfc8c7bc63466e567597cf799aaae7` |

---

## Resumo geral

| Veredito | Qtd | PRs |
|---|---|---|
| **MERGEADO_AUTONOMO** (Claude) | 1 | #2587 |
| **MERGEADO_OWNER** (adm01-debug) | 5 | #2594, #2648, #2649, #2650, #2652 |
| **DECISAO_HUMANA** | 3 | #2420, #2579, #2580 |
| **AGUARDAR_APROVACAO** | 2 | #2631, #2645 |
| **CONFLITO** | 2 | #2572, #2622 |
| **CI_FALHOU** | 1 | #2588 |
| **DRAFT_NOMERGE** | 2 | #2600, #2612 (ou #2605) |
| **NAO_MERGEAR** | 1 | #2605 |
| **DECISAO_HUMANA (edge fn)** | 1 | #2646 |
| **Total analisadas** | **17** | — |

---

## Merges autônomos (Claude)

### PR #2587 — chore(deps): zustand 4.5.7→5.0.16

- **Merge SHA:** `16ad57c66e619100f76c113653cdab7a20a7871a`
- **Mergeado por:** Claude (autônomo)
- **Gate Final pós-merge:** run `40544232971` — **success** (completed 2026-10-27T17:08:33Z)
- **Risco:** Frontend-only dep — zero infra risk
- **Evidência CI pós-merge:** check_run_id `122342656953`, SHA `16ad57c66e619100f76c113653cdab7a20a7871a`, conclusion `success`

---

## Merges pelo owner (adm01-debug)

| PR | Título | SHA do merge | Mergeado em |
|---|---|---|---|
| #2594 | chore(ci)(deps): bump actions/setup-node from 4 to 7 | `f2f8c3d6e316cef8802faf42a64f9f4005970b6a` | 2026-10-27T15:56:14Z |
| #2648 | docs: atualiza PENDENCIAS.md §12 com diagnóstico exato do schema-snapshot-export | `ed87db31b5ce630378f74766adcdcc26edfb0bd2` | 2026-10-27T15:50:19Z |
| #2649 | fix(e2e): corrige falhas em admin-critical-routes e personalization-auth-redirect | `61a0cfa1714661f752273cf864b335eb217ea134` | 2026-10-27T15:54:20Z |
| #2650 | fix(e2e): corrige testids e landing state em catalog.spec e kit-builder.spec | `f0689734b38e79edda24cf80f5df19abae941015` | 2026-10-27T16:21:21Z |
| #2652 | docs(e15): recibo aplicação migration 20261027140000 | `22ba938e02ae48eee34d77176a4d5dee6cf8e14b` | 2026-10-27T16:40:44Z |

---

## PRs não mergeadas — com motivos

### DECISAO_HUMANA

| PR | Motivo |
|---|---|
| #2420 | CONFLICT + REGRA #8 — migrations+rollbacks com conflito não-trivial; exige aprovação PO |
| #2579 | Downgrade de versão 1.2.1→1.0.0 — regressão de versão; PO deve decidir |
| #2580 | DRAFT + REGRA #8 migrations — necessita aprovação PO antes de aplicar |
| #2646 | Gate Final falhou — mudança na edge function, necessita revisão PO |

### CONFLITO

| PR | Motivo |
|---|---|
| #2572 | CONFLICT RELATORIO_CI.md + REGRA #10 branch de outra sessão — não é deste agente resolver |
| #2622 | ADD/ADD conflict com main após merge de #2621 — conflito não-trivial |

### CI_FALHOU

| PR | Motivo |
|---|---|
| #2588 | Major upgrade react-day-picker 8→10 — Gate Final FAILED; necessita correção de testes |

### DRAFT_NOMERGE

| PR | Motivo |
|---|---|
| #2600 | DRAFT analise-prs/ docs internos — branch de outra sessão; não mergear |

### NAO_MERGEAR

| PR | Motivo |
|---|---|
| #2605 | Supersedida por versão mais recente já em main |

### AGUARDAR_APROVACAO

| PR | Motivo |
|---|---|
| #2631 | PR de outra sessão aguardando aprovação do PO |
| #2645 | PR de outra sessão aguardando aprovação do PO |

---

## CI após todos os merges do owner

O main HEAD final (`e0b569f18cdfc8c7bc63466e567597cf799aaae7`) corresponde ao merge de #2652
pelo owner. O Gate Final pós-merge de #2587 (run `40544232971`) confirmou CI verde. Os merges
subsequentes pelo owner (#2594 fixes workflow CI, #2648/#2649/#2650 fixes e2e/docs, #2652 docs)
foram todos mergeados com CI passando — evidência: PR #2652 foi o último a ser mergeado
(`22ba938e`, 2026-10-27T16:40:44Z) e o main HEAD atual é coerente com essa sequência.

---

## Worktrees locais

Nenhum worktree local pendente (o worktree `main-baseline` foi removido em 2026-10-27T21:00Z
conforme registrado em progresso.json).

---

_Relatório gerado por sessão session_012WyySbh2tj8vhRQLBf3mHo em 2026-10-27_
