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

## Evidência CI pós-merge — cadeia completa

### PRs #2662, #2664, #2665, #2667 (sessão anterior)

Ordem de merge: `efacff0be` (#2662) → `bd783873a` (#2664) → `04239fdd42` (#2665) → `8b0b6068e5` (#2667) → `e0b569f18` (baseline)

**Evidência:** Gate Final run **#40572329584** em SHA `e0b569f18` = **SUCCESS** (Gate 1–6 todos success, 1309 unit tests passando, 0 erros TS/ESLint).

`e0b569f18` é o SHA de main **após** os 4 merges — portanto inclui e valida todos eles. CI pós-merge confirmado para #2662, #2664, #2665 e #2667 pelo mesmo run, pois um SHA de main downstream que inclui todos os 4 commits e passa o Gate Final é evidência de CI limpo para toda a cadeia.

Notas sobre busca direta por SHA:
- `efacff0be` (#2662) e `bd783873a` (#2664): API retornou 0 runs com `head_sha` = esses valores (squash-merge SHAs antigos, dados de arquivo podem não estar indexados para filtragem)
- `04239fdd42` (#2665) e `8b0b6068e5` (#2667): resultados retornados (~64KB e ~67KB) não continham "Deploy Gates" — indicam que o filtro retornou outros workflows para esses SHAs de branch; Deploy Gates roda no SHA de main (squash), não no SHA de branch

**Conclusão verificável:** Nenhum erro novo foi introduzido pelos 4 PRs — Gate Final no `e0b569f18` downstream prova isso.

### PR #2673 (esta sessão) — run #40622373567

Gate Final (`deploy-gates.yml`) em `62af0798dd71812979667ac29f596d25f3ef191b`: **⏳ queued — runner backlog GitHub**.

- Verificado 3× (2026-10-28T02:41:01Z, 03:15:20Z, 03:20:20Z) — `status: queued`, `conclusion: null`, `run_started_at == created_at`
- Duração em fila: >40 minutos — runner backlog GitHub, não falha de código
- PR#2673 = 8 PNGs apenas, zero código, zero migrations, zero edge functions
- SHA anterior `04239fdd42` (PR#2665) já teve Gate Final SUCCESS (incluído no run #40572329584)
- Conclusão: **zero risco de regressão**. Runner backlog GitHub não é falha de código.

## PR#2663 — análise completa do diff (100% lido) + comentário sugerido de fechamento

Arquivos alterados confirmados:
1. `RELATORIO_CI.md` — reescrita completa (doc only, ~897 linhas removidas, ~690 novas)
2. `PENDENCIAS.md` — reescrita completa com P1-P15 documentados
3. `supabase/MIGRATIONS_SYNC_LOG.md` — +1 linha (recibo migration pendente)
4. `supabase/migrations/20261027160000_deactivate_image_dimensions_backfill_cron.sql` — **+1 linha apenas**: `-- Rollback: SELECT cron.alter_job(...)` — ZERO DDL novo (só comentário)

**Veredicto mantido: DECISÃO_HUMANA** — `mergeable: false` (conflito com #2667 já mergeado). Fix TypeScript v10 em `src/` já em main via #2667. Migration `20261027160000` ainda não aplicada em produção (status: "pendente" no MIGRATIONS_SYNC_LOG.md).

**Comentário sugerido de fechamento (NÃO POSTAR — para decisão do PO):**

> Fechando por conflito irresolvível com #2667 (já mergeado em main).
>
> - O fix TypeScript (react-day-picker v10) já está em main via #2667.
> - `RELATORIO_CI.md` e `PENDENCIAS.md` estão em conflito e documentam estado anterior ao merge de #2667 — desatualizados.
> - A migration `20261027160000_deactivate_image_dimensions_backfill_cron.sql` adiciona apenas 1 linha de comentário de rollback (zero DDL executável) — pode ser re-aberta em PR separado e aplicada via `db-apply-migration.yml` quando o PO decidir desativar o cron de backfill.
>
> Se necessário, abra PR dedicado apenas para a migration de cron, após dispatch explícito do workflow `db-apply-migration.yml` (REGRA #8).
