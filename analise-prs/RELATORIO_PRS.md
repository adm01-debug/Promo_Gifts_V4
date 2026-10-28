# RELATORIO_PRS — Análise Exaustiva de PRs abertas

**Gerado em:** 2026-10-28  
**Sessão:** https://claude.ai/code/session_012WyySbh2tj8vhRQLBf3mHo  
**Main HEAD:** `62af0798dd71812979667ac29f596d25f3ef191b`  
**Gate Final main:** CANCELLED (run 40622373567)

---

## Baseline (main `62af0798`)

| Check | Resultado |
|-------|----------|
| TypeScript (`tsc --noEmit`) | 0 erros |
| `calendar.redesign.test.tsx` | 2 falhas (day_selected, day_outside) |
| `date-picker-field.test.tsx` | 18/18 aprovados |
| Gate Final main | CANCELLED |

**Causa das falhas:** Commit `8b0b6068` migrou react-day-picker v8 para v10 mas nao atualizou seletores de teste.

---

## Inventario Completo - 12 PRs abertas

| PR | Titulo | Autor | Draft | Veredito | Motivo |
|----|--------|-------|-------|----------|--------|
| #2681 | fix(tests): react-day-picker v10 selectors | adm01-debug | Nao | FECHADA SEM MERGE | Fechada 04:14Z sem merge |
| #2680 | fix(tests): calendar selectors (similar) | adm01-debug | Sim | BLOQUEADO | Draft |
| #2679 | test(calendar): selectors v10 | adm01-debug | Nao | **MERGE CANDIDATE** | Aguarda Gate Final (deploy-gates queued em `39e6bf76`) |
| #2675 | docs(audit): relatorio final | adm01-debug | Nao | AGUARDA PO | Branch desta sessao + REGRA#10 |
| #2674 | docs(analise-prs): 12 PRs (ant.) | adm01-debug | Sim | BLOQUEADO | Draft |
| #2668 | chore(analise-prs): inventario | adm01-debug | Sim | BLOQUEADO | Draft |
| #2666 | chore(main): release 1.0.0 | github-actions[bot] | Nao | AGUARDA PO | Downgrade 1.2.1->1.0.0 |
| #2663 | docs(ci): RELATORIO_CI + PENDENCIAS | adm01-debug | Nao | AGUARDA PO | supabase/migrations/ REGRA#8 |
| #2646 | fix(migrations): rollback headers | adm01-debug | Nao | AGUARDA PO | workflows/+migrations/ REGRA#8 |
| #2631 | chore: PENDENCIAS + RELATORIO_CI | adm01-debug | Nao | BLOQUEADO | Conflito real (dirty) |
| #2600 | docs(analise-prs): rev46 | adm01-debug | Nao | BLOQUEADO | Conflito real (405) |
| #2580 | fix(banco): rollback header e23 | adm01-debug | Sim | BLOQUEADO | Draft + migrations/ |

---

## Contagem por veredito

| Veredito | Qtd | PRs |
|----------|-----|-----|
| FECHADA SEM MERGE | 1 | #2681 |
| AGUARDA PO | 4 | #2666, #2663, #2646, #2675 |
| MERGE CANDIDATE | 1 | #2679 |
| BLOQUEADO | 6 | #2680, #2674, #2668, #2631, #2600, #2580 |
| **Total** | **12** | **= total analisado** |

---

## Status de merges nesta sessao

| PR | SHA final | Gate Final | Resultado |
|----|-----------|------------|----------|
| #2681 | `99aa164f` | Queued ao fechar | FECHADA SEM MERGE |
| #2679 | `39e6bf76` | deploy-gates queued (run 40631972278) | AGUARDANDO Gate Final |

**Main:** ainda com 2 falhas de teste (`day_selected`, `day_outside`).

**Evidencia #2679:** `mergeable: true` via API; draft=false confirmado via API; 9 commits únicos vs main; teste de merge local worktree → "Already up to date" (sem conflito).  
**Bloqueio para merge:** deploy-gates run 40631972278 em status `queued` para SHA `39e6bf76` — aguardando conclusão com SUCCESS.

---

## META CHECKLIST

- [x] Total PRs abertas: 12
- [x] Total PRs analisadas: 12
- [x] MERGE CANDIDATE: 1 (#2679)
- [x] FECHADA SEM MERGE: 1 (#2681)
- [x] AGUARDA PO: 4
- [x] BLOQUEADO: 6
- [x] Baseline: 2 testes falhos em `analise-prs/baseline/`
- [x] TypeScript: 0 erros
- [x] progresso.json criado per-PR
- [x] prs.json criado
- [x] Dossies para todas as 12 PRs
- [x] regras-de-negocio.md reconstruido
- [ ] Merges executados: 0/1 - PR #2681 fechada sem merge por terceiro

---

*Gerado por Claude Code - sessao https://claude.ai/code/session_012WyySbh2tj8vhRQLBf3mHo*
