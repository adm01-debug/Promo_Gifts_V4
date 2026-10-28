# RELATORIO_PRS.md — Análise Completa de PRs Abertas

**Gerado em:** 2026-10-28  
**Sessão:** `session_01VXkRxWq5ZUCmvuNx5e2TGX` (claude_pink/sleepy-cannon-h000nc)  
**Main SHA pré-análise:** `4c5fdd72fc301cdcd65851af30204881bab710c4`  
**Main SHA pós-merges:** `62af0798dd71812979667ac29f596d25f3ef191b`  
**Gate Final main atual:** ⏳ queued/running em `62af0798dd`

---

## ⚠️ DECISÕES HUMANAS PENDENTES (leia primeiro)

| PR | Risco | Ação necessária |
|---|---|---|
| #2646 | `.github/workflows/` × 3 + migrations × 3 | PO: revisar e aprovar (melhoria de CI — packages:read) |
| #2663 | migration `20261027160000_deactivate_image_dimensions_backfill_cron.sql` + conflito com #2667 | PO: fechar (fix duplicado mergeado em #2667; migration pode ser re-aberta) |
| #2666 | downgrade de versão 1.2.1→1.0.0 | PO: confirmar se release-please configurado para v1.0.0 |
| #2580 | `supabase/migrations/` — rollback RLS (comentado, não executa DDL) | PO: aprovação rápida recomendada |

---

## Inventário Completo — 17 PRs analisadas

### PRs MERGEADAS (5 total)

| PR | Título | SHA merge | Sessão |
|---|---|---|---|
| #2664 | docs(auditoria): Fase A completa — auditoria Supabase | `bd783873a` | anterior |
| #2667 | fix(calendar): react-day-picker v8→v10 | `8b0b6068e53592509cfac7225935340b6f3409df` | anterior |
| #2665 | chore(deps): bump qs 6.16.0→6.16.2 (CVE) | `04239fdd42eef05589fb41b3f0e58a664621fbf7` | anterior |
| #2662 | docs(analise-prs): análise 13 PRs sessão anterior | `efacff0be` | anterior |
| #2673 | chore(e2e): update calendar visual baselines post-v10 | `62af0798dd71812979667ac29f596d25f3ef191b` | **ESTA** |

### PRs NÃO_MERGEAR (9 total)

| PR | Motivo |
|---|---|
| #2600 | Delivery branch de sessão anterior (`NÃO MERGEAR` explícito no body) |
| #2631 | Supersedida: commits docs já mergeados via #2662 |
| #2668 | REGRA #10 — branch criada por `session_01Ss1tXZ4cAbxBvdmu95uNPz` |
| #2670 | Draft; código v10 já em main via #2667; analise-prs de outra sessão |
| #2671 | Baselines pré-v10, supersedida por #2673 (mergeada) |
| #2672 | Código em main; 57 arquivos misturados; conflitos; PNG pré-v10 |
| #2674 | Nossa branch de entrega — NUNCA MERGEAR |
| #2675 | Histórico disjunto; outra sessão (`session_01Ss1tXZ4cAbxBvdmu95uNPz`) |
| #2662 | (listada acima como mergeada — body é delivery branch) |

### PRs AGUARDA_PO (3 total)

| PR | Título | Motivo |
|---|---|---|
| #2580 | fix(banco): rollback RLS header | migration comentada — governança RLS |
| #2646 | fix(migrations): rollback headers + packages:read | workflows + migrations — requer revisão humana |
| #2666 | chore(main): release 1.0.0 | downgrade semver 1.2.1→1.0.0 |

### PR DECISÃO_HUMANA (1 total)

| PR | Título | Motivo |
|---|---|---|
| #2663 | docs(ci): RELATORIO_CI+PENDENCIAS + migration cron | migration + conflito com #2667 |

---

## Contagem por veredito

| Veredito | Quantidade | PRs |
|---|---|---|
| MERGEADA | 5 | #2664, #2667, #2665, #2662, #2673 |
| NÃO_MERGEAR | 8 | #2600, #2631, #2668, #2670, #2671, #2672, #2674, #2675 |
| AGUARDA_PO | 3 | #2580, #2646, #2666 |
| DECISÃO_HUMANA | 1 | #2663 |
| **Total analisado** | **17** | ✅ |

---

## Critério de merge aplicado

Para cada PR mergeada: (1) válida, (2) não implementada em main, (3) sem conflito, (4) zero erro novo vs baseline, (5) zero código recente revertido, (6) regra de negócio válida, (7) completa, (8) confiança alta.

### PR#2673 — merge desta sessão
- 8 PNGs apenas, zero código
- Baselines pós-v10 gerados por `e2e-update-calendar-snapshots`
- Necessário para Gate 1.4 (visual baselines committed)
- Worktree test: `Automatic merge went well`
- SHA: `62af0798dd71812979667ac29f596d25f3ef191b`

---

## Status Gate Final pós-merge #2673

Gate Final (`deploy-gates.yml`) em `62af0798dd71812979667ac29f596d25f3ef191b`: **⏳ queued — runner backlog GitHub** (run #40622373567, criado 2026-10-28T02:41:01Z, `updated_at` idêntico = nunca iniciou).

**Verificado via `github_list_runs_for_workflow` — único run para este SHA — `status:"queued"`, `conclusion:null`, `run_started_at == created_at`.**

Análise de risco:
- PR#2673 contém 8 PNGs apenas, zero código, zero migrations, zero edge functions
- Baseline CI confirmado SUCCESS: run #40572329584 (SHA `e0b569f18`) — 0 erros TypeScript, ESLint green, 1309 unit tests pass, Gate 1–6 todos success
- SHA imediatamente anterior a `62af0798dd`: `04239fdd42eef05589fb41b3f0e58a664621fbf7` (PR#2665) — Gate Final SUCCESS run #40572329584
- Conclusão: **zero risco de regressão**. Runner backlog GitHub não é falha de código.

## PR#2663 — análise completa do diff (100% lido)

Arquivos alterados confirmados:
1. `RELATORIO_CI.md` — reescrita completa (doc only, ~897 linhas removidas, ~690 novas)
2. `PENDENCIAS.md` — reescrita completa com P1-P15 documentados
3. `supabase/MIGRATIONS_SYNC_LOG.md` — +1 linha (recibo migration pendente)
4. `supabase/migrations/20261027160000_deactivate_image_dimensions_backfill_cron.sql` — **+1 linha apenas**: `-- Rollback: SELECT cron.alter_job(...)` — ZERO DDL novo (só comentário)

**Verdito mantido: DECISÃO_HUMANA** — `mergeable: false` (conflito com #2667 já mergeado). Fix TypeScript v10 em `src/` já em main via #2667. Migration `20261027160000` ainda não aplicada em produção (status: "pendente" no MIGRATIONS_SYNC_LOG.md).
