# RELATORIO_PRS — Análise de PRs abertas

**Gerado em:** 2026-10-27  
**Sessão:** https://claude.ai/code/session_01VXkRxWq5ZUCmvuNx5e2TGX  
**Main HEAD:** `4c5fdd72fc301cdcd65851af30204881bab710c4`  
**Gate Final main:** ❌ RED (react-day-picker v10 — fix em PR #2667)

---

## ⚠️ RISCOS E BLOQUEIOS (leia primeiro)

| Risco | Impacto | Ação necessária |
|---|---|---|
| Gate Final main RED (SHA `4c5fdd72`) | **Bloqueia todos os merges** | Aguardar PR #2667 Gate Final verde |
| edge-functions-drift-check RED | 106 funções divergentes; bloqueia merges de PR | PO: aprovar deploy em https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40482914736 |
| PR #2666 version downgrade 1.2.1→1.0.0 | Semver regressão | PO: confirmar se é intencional |
| PR #2663 contém migration + fix redundante | Conflito com #2667 | PO: decidir se mergear ou fechar #2663 |

---

## Inventário Completo — 10 PRs abertas

| PR | Título | Veredito | Motivo |
|---|---|---|---|
| #2667 | fix(calendar): react-day-picker v10 | **MERGE CANDIDATE** | Aguarda Gate Final SHA `79ac4d6a3` |
| #2666 | chore(release): v1.0.0 | **AGUARDA PO** | Downgrade de versão 1.2.1→1.0.0 |
| #2665 | fix(deps): qs 6.16.2 CVE | **MERGE CANDIDATE** | Aguarda Gate Final main verde |
| #2664 | docs: auditoria Supabase | **MERGE CANDIDATE** | Aguarda Gate Final main verde |
| #2663 | fix + migration (misto) | **AGUARDA PO** | `supabase/migrations/` + conflito com #2667 |
| #2662 | docs: analise-prs (sessão anterior) | **MERGE CANDIDATE** | Aguarda Gate Final main verde |
| #2646 | ci+migration: packages:read | **AGUARDA PO** | `.github/workflows` ×3 + migrations ×3 |
| #2631 | docs: PENDENCIAS + RELATORIO_CI | **MERGE CANDIDATE** | Aguarda Gate Final main verde |
| #2600 | docs: analise-prs baseline | **MERGE CANDIDATE** | Aguarda Gate Final main verde |
| #2580 | security: force RLS rollback | **AGUARDA PO** | `supabase/migrations/` (comentário apenas) |

---

## Contagem por veredito

| Veredito | Quantidade | PRs |
|---|---|---|
| MERGE CANDIDATE | 6 | #2667, #2665, #2664, #2662, #2631, #2600 |
| AGUARDA PO | 4 | #2666, #2663, #2646, #2580 |
| Total analisado | **10** | = total aberto ✅ |

---

## Ordem de merge recomendada (após Gate Final verde)

1. **#2667** — fix react-day-picker (restaura main para verde)
2. **#2631** — docs CI/PENDENCIAS (informação mais recente)
3. **#2664** — auditoria Supabase docs
4. **#2665** — CVE qs (segurança)
5. **#2600** — analise-prs baseline histórico
6. **#2662** — analise-prs relatório histórico (possível conflito com #2600 — resolver na hora)

---

## PRs AGUARDA PO — ações necessárias

### #2666 — version downgrade
Confirmar com o PO: o release-please foi configurado para gerar v1.0.0? Se não, fechar a PR.

### #2663 — migration cron + fix redundante
- O fix react-day-picker está duplicado com #2667. Após #2667 ser mergeada, #2663 vai conflitar.
- A migration `20261027160000_deactivate_image_dimensions_backfill_cron.sql` pode ser extraída para PR separada se necessário.
- PO: fechar #2663 (o fix está em #2667; a migration pode ser re-aberta separadamente) ou aprovar o merge completo.

### #2646 — workflows + migrations
- Mudanças em `.github/workflows/` são sólidas (`packages: read` para docker auth)
- PO: revisar e aprovar (é melhoria de CI, não breaking change)

### #2580 — rollback RLS
- Risco mínimo (comentário SQL + script de rollback não executado)
- PO: aprovação rápida recomendada (boa prática de governança)

---

## PRs fechadas nesta sessão (execução anterior)

PRs #2420, #2572, #2579, #2605, #2622, #2645, #2653 foram fechadas conforme instrução do PO em sessão anterior.

---

## Status de merge (nenhum mergeado nesta sessão ainda)

| PR | SHA merge | Gate Final pós-merge | Observação |
|---|---|---|---|
| — | — | — | Aguardando PR #2667 Gate Final |

---

## META CHECKLIST

- [x] Total PRs abertas: 10
- [x] Total PRs analisadas: 10
- [x] MERGE CANDIDATE: 6
- [x] AGUARDA PO: 4
- [x] Nenhuma PR mergeada ainda (bloqueio: Gate Final main RED)
- [x] Worktrees: nenhum ativo (verificado via `git status`)
- [ ] PR #2667 Gate Final: PENDENTE (aguardando CI na SHA `79ac4d6a3`)
- [ ] Merges executados: 0/6 (aguarda Gate Final)

---

*Gerado por Claude Code — sessão https://claude.ai/code/session_01VXkRxWq5ZUCmvuNx5e2TGX*
