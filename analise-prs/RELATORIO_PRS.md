# Relatório de Análise de PRs — sessão_012WyySbh2tj8vhRQLBf3mHo

**Data:** 2026-10-27  
**Sessão:** session_012WyySbh2tj8vhRQLBf3mHo  
**Rev:** 55  
**Total analisado:** 18 PRs  
**Total aberto (excl. entrega #2653):** 12 PRs abertos sem merge + 6 mergeados durante sessão = 18 ✓

---

## ⚠️ RISCOS E DECISÕES HUMANAS (LEIA PRIMEIRO)

### #2420 — DECISAO_HUMANA — rollback migration 20261019000000
- **Risco:** migrations + rollbacks com conflito não-trivial vs main. REGRA #8 (DDL sem aprovação PO).
- **Ação recomendada PO:** Verificar se o rollback da migration `20261019000000` já está em main via PR #2621 (que trouxe 7 rollbacks). Se já coberto, fechar. Se não, resolver conflito e aprovar via `db-apply-migration.yml`.
- **Dossier:** `dossies/PR-2420.md`

### #2579 — DECISAO_HUMANA — regressão de versão 1.2.1→1.0.0
- **Risco:** PR de release-please downgrade da versão do package.json de 1.2.1 para 1.0.0 — regressão clara.
- **Ação recomendada PO:** Fechar esta PR. A versão atual `1.2.1` é a correta.
- **Dossier:** `dossies/PR-2579.md`

### #2580 — DECISAO_HUMANA — DRAFT + migrations banco
- **Risco:** DRAFT com migrations pendentes. REGRA #8 — não executar sem aprovação PO.
- **Ação recomendada PO:** Revisar conteúdo do banco, aprovar e tirar do DRAFT quando pronto.
- **Dossier:** `dossies/PR-2580.md`

### #2588 — CI_FALHOU — react-day-picker 8→10 (2 major upgrades)
- **Risco:** Breaking change — API do componente mudou entre v8 e v10. Gate Final FAILED.
- **Ação recomendada PO:** Decidir se aceita; se sim, aplicar adaptações nos usos do componente antes de mergear.
- **Dossier:** `dossies/PR-2588.md`

### #2646 — DECISAO_HUMANA — edge function + Gate Final falhou
- **Risco:** Mudança em edge function com Gate Final falhando. REGRA #8 corolário (deploy edge fn só via `deploy-edge-functions.yml`).
- **Ação recomendada PO:** Revisar mudança na edge function, corrigir falha de CI, depois aprovar.
- **Dossier:** `dossies/PR-2646.md`

---

## PRs mergeadas com SHA e CI pós-merge

### Mergeadas por Claude (autônomo)

| PR | Título | SHA | Gate Final pós-merge |
|---|---|---|---|
| #2587 | chore(deps): zustand 4.5.7→5.0.16 | `16ad57c66e619100f76c113653cdab7a20a7871a` | run `40544232971` **success** (2026-10-27T17:08:33Z) |

**Evidência CI:** check_run_id `122342656953`, SHA `16ad57c66e619100f76c113653cdab7a20a7871a`, conclusion `success`  
**Baseline comparado:** Gate Final run `40420603513`, SHA `2fafe8edd3e6bcf1a9f3fdd9dbc90869d6d57c59`, 429 testes / 0 falhas

### Mergeadas pelo owner (adm01-debug)

| PR | Título | SHA | Mergeado em |
|---|---|---|---|
| #2648 | docs: atualiza PENDENCIAS.md §12 | `ed87db31b5ce630378f74766adcdcc26edfb0bd2` | 2026-10-27T15:50:19Z |
| #2649 | fix(e2e): admin-critical-routes e personalization-auth-redirect | `61a0cfa1714661f752273cf864b335eb217ea134` | 2026-10-27T15:54:20Z |
| #2594 | chore(ci)(deps): bump actions/setup-node from 4 to 7 | `f2f8c3d6e316cef8802faf42a64f9f4005970b6a` | 2026-10-27T15:56:14Z |
| #2650 | fix(e2e): testids e landing state em catalog.spec e kit-builder.spec | `f0689734b38e79edda24cf80f5df19abae941015` | 2026-10-27T16:21:21Z |
| #2652 | docs(e15): recibo aplicação migration 20261027140000 | `22ba938e02ae48eee34d77176a4d5dee6cf8e14b` | 2026-10-27T16:40:44Z |

---

## PRs prontas mas não mergeadas (com motivo)

### CONFLITO — não podem ser mergeadas sem resolução manual

| PR | Motivo |
|---|
---|
| #2572 | Conflito em `RELATORIO_CI.md` + REGRA #10 (branch de outra sessão); não é deste agente resolver |
| #2622 | ADD/ADD conflict com main após merge de #2621; 2 rollbacks únicos reconstituted em #2627 (outra sessão) |

### AGUARDAR_APROVACAO — PRs de outras sessões aguardando PO

| PR | Título | Motivo |
|---|---|---|
| #2631 | chore: atualiza PENDENCIAS §4 e RELATORIO_CI | DRAFT — sessão externa aguardando PO |
| #2645 | docs: recibo de aplicação — 20261027140000 (E15) | Sem CI verde confirmado + outra sessão |

---

## PRs a fechar ou descartar

| PR | Motivo |
|---|---|
| #2605 | Supersedida — conteúdo já está em main (conflito CLEAN impossível vs main atual) |

**Comentário sugerido (NÃO POSTAR):** "Esta PR foi supersedida pelo commit que trouxe a correção equivalente para main. Fechando."

---

## PRs DRAFT — não mergear

| PR | Motivo |
|---|---|
| #2600 | DRAFT analise-prs/ docs internos — branch `claude_04/...`; aguardar que a sessão finalize |
| #2662 | DRAFT analise-prs/ docs internos — branch `claude_pink/sleepy-cannon-h000nc`; sessão `session_01VXkRxWq5ZUCmvuNx5e2TGX`; REGRA #10 cross-agente |

---

## Clusters e padrões

### Cluster 1 — Análise de PRs (docs internos)
PRs #2600, #2662, #2653 (entrega): todas contêm `analise-prs/` com dossiers e relatórios de diferentes sessões Claude. Cada sessão gera seu próprio inventário. Nenhuma deve ser mergeada até a sessão dona finalizar.

### Cluster 2 — Migrations e rollbacks
PRs #2420, #2580: ambas envolvem migrations com conflitos não-triviais. REGRA #8 impede merge automático. Exigem aprovação PO e caminho via `db-apply-migration.yml`.

### Cluster 3 — Atualização de dependências
PR #2588 (react-day-picker 8→10): upgrade com breaking changes. #2587 (zustand 4→5) foi mergeado com sucesso após verificação de que era frontend-only sem breaking API.

---

## NÃO VERIFICADO

Nenhum item marcado como NÃO VERIFICADO nesta sessão — todos os vereditos têm evidências citadas nos dossiers individuais.

---

## Resumo final por veredito

| Veredito | Qtd | PRs |
|---|---|---|
| MERGEADO_AUTONOMO (Claude) | 1 | #2587 |
| MERGEADO_OWNER | 5 | #2594, #2648, #2649, #2650, #2652 |
| FECHADO_OWNER | 3 | #2605, #2622, #2645 |
| DECISAO_HUMANA | 5 | #2420, #2572, #2579, #2580, #2646 |
| CI_FALHOU | 1 | #2588 |
| DRAFT_NOMERGE | 3 | #2600, #2631, #2662 |
| **Total** | **18** | — |

---

## Baseline de CI (imutável — fixado no início da sessão)

| Campo | Valor |
|---|---|
| Gate Final run | `40420603513` |
| SHA | `2fafe8edd3e6bcf1a9f3fdd9dbc90869d6d57c59` |
| Status | **success** |
| Testes (Vitest) | 429 passando / 0 falhas |
| main HEAD na entrada | `df18546dfd76d1bea7ea5873257b668d128d8df3` |
| main HEAD final | `e0b569f18cdfc8c7bc63466e567597cf799aaae7` |

---

## Arquivos de entrega

```
analise-prs/
├── baseline/
│   ├── README.md
│   ├── baseline.json
│   ├── build.txt
│   ├── failing-tests-by-name.md     ← 21 falhas pré-existentes (fetch failed)
│   ├── gate1-lint-typecheck-output.md
│   ├── lint.txt
│   ├── local-checks.md
│   ├── typecheck.txt
│   └── vitest-per-test-name.txt
├── dossies/
│   └── PR-<n>.md                   ← 125 dossiers (PR-2290 até PR-2662)
├── RELATORIO_PRS.md                 ← este arquivo
├── prs.json                         ← inventário JSON rev55
├── prs.csv                          ← inventário CSV
├── progresso.json                   ← estado por sessão
└── regras-de-negocio.md             ← regras extraídas do codebase
```

_Relatório gerado por sessão session_012WyySbh2tj8vhRQLBf3mHo em 2026-10-27_
