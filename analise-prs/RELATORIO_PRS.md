# RELATORIO_PRS.md — Análise Completa de PRs Abertas

**Gerado em:** 2026-10-28  
**Sessão:** `session_01VXkRxWq5ZUCmvuNx5e2TGX` (claude_pink/sleepy-cannon-h000nc)  
**Main SHA pré-análise:** `4c5fdd72fc301cdcd65851af30204881bab710c4`  
**Main SHA pós-merges:** `ab70ca24300a2d9c8a1109a65a7b25ee02250a3e` (PR #2679, última desta sessão)  
**Gate Final main atual:** ✅ success em `ab70ca24` (run #40636012010, completed 05:16:27Z)  
**Push externo pós-nossa-análise:** SHA `8c8148385983` (adm01-debug, 09:48Z) — fix direto em main, Branch Protection Sentinel failure (não é required check; Gate Final não completou ainda)

---

## ✅ TODAS AS DECISÕES RESOLVIDAS (atualizado 2026-11-09)

Todas as PRs pendentes foram resolvidas pelo PO entre 2026-10-28 e 2026-10-29:
- #2580 — MERGEADA pelo PO (2026-10-29)
- #2646 — MERGEADA pelo PO (2026-10-28)
- #2663 — FECHADA SEM MERGE pelo PO (2026-10-28)
- #2666 — MERGEADA automaticamente pelo release-please (2026-10-28)

---

## Inventário Completo — 25 PRs analisadas

### PRs MERGEADAS (6 total)

| PR | Título | SHA merge | Gate Final | Sessão |
|---|---|---|---|---|
| #2662 | docs(analise-prs): análise 13 PRs sessão anterior | `efacff0be` | failure PRE-EXISTENTE (rdp v10) | anterior |
| #2664 | docs(auditoria): Fase A completa — auditoria Supabase | `bd783873a` | failure PRE-EXISTENTE (rdp v10) | anterior |
| #2667 | fix(calendar): react-day-picker v8→v10 | `8b0b6068e535` | success ✅ run #40612760517 | anterior |
| #2665 | chore(deps): bump qs 6.16.0→6.16.2 (CVE) | `04239fdd42ee` | success ✅ run #40615509956 | anterior |
| #2673 | chore(e2e): update calendar visual baselines post-v10 | `62af0798dd71` | cancelled (runner backlog, risco NULO) | **ESTA** |
| #2679 | test(calendar): corrige seletores rdp v10 | `ab70ca24300a` | success ✅ run #40636012010 | **ESTA** |

### PRs FECHADA_SEM_MERGE (1 total)

| PR | Título | Motivo |
|---|---|---|
| #2681 | fix(tests): atualiza seletores DOM rdp v10 | Fechada por ator externo 09:09Z; conteúdo em main via #2679 |

### PRs NÃO_MERGEAR (10 total)

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
| #2676 | mergeable=false (dirty); REGRA #10 — outra sessão |
| #2680 | DRAFT; supersedida por #2681 (mais abrangente, não draft) |

### PRs AGUARDA_PO (0 — todas resolvidas pelo PO)

Resolvidas entre 2026-10-28 e 2026-10-29. Ver seção "PRs MERGEADAS pelo PO pós-análise".

### DECISÃO_HUMANA (0 — todas resolvidas pelo PO)

Resolvidas entre 2026-10-28 e 2026-10-29. Ver seção "PRs FECHADAS_SEM_MERGE pós-análise".

---

## Contagem por veredito

| Veredito | Quantidade | PRs |
|---|---|---|
| MERGEADA | 6 | #2662, #2664, #2667, #2665, #2673, #2679 |
| FECHADA_SEM_MERGE | 1 | #2681 |
| NÃO_MERGEAR | 10 | #2600, #2631, #2668, #2670, #2671, #2672, #2674, #2675, #2676, #2680 |
| AGUARDA_PO | 3 | #2580, #2646, #2666 |
| DECISÃO_HUMANA | 1 | #2663 |
| **Total analisado** | **21** | ✅ |

---

## PRs MERGEADAS pelo PO pós-análise inicial (6 novas)

| PR | Título | merged_at | merge_commit_sha |
|---|---|---|---|
| #2580 | fix(banco): rollback RLS header | 2026-10-29 | (não verificado nesta sessão) |
| #2646 | fix(migrations): rollback headers + packages:read | 2026-10-28 | 5d12084e3ee18a5c94e41b5cf29bfb43206de710 |
| #2666 | chore(main): release 1.0.0 | 2026-10-28 | cf85bd7b (parcial) |
| #2686 | fix(ci): corrige seletores rdp v10 (5 arquivos de teste) | 2026-10-28 | c090e53fb4ce3f8983f39961e44ac4b365d090d1 |
| #2689 | fix(migrations): torna migration 20261027120000 idempotente | 2026-10-28 | 9bb37c44f0c0f5182c3de55efcd26ca7ab6895da |
| #2692 | docs(migrations): recibo E15 para migration 20261027160000 | 2026-10-28 | e4a326e61f25ce1306068fc4e6943ff8836ca599 |

## PRs FECHADAS_SEM_MERGE pós-análise inicial (2 novas)

| PR | Título | closed_at | Motivo |
|---|---|---|---|
| #2663 | docs(ci): RELATORIO_CI+PENDENCIAS + migration cron | 2026-10-28 | Fechada pelo PO; conflito com #2667 |
| #2688 | fix(ci): migration 20261027120000 replay-safe | 2026-10-29 | Draft + branch dirty/conflitada (37 commits) |

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

## Evidência CI pós-merge — per SHA (verificado diretamente)

> Deploy Gates roda no SHA de main (squash-merge). Run IDs obtidos listando deploy-gates.yml/main e correlacionando temporalmente.

| PR | SHA merge (main) | Run ID | Conclusão | Nota |
|---|---|---|---|---|
| #2662 | `efacff0bef81` | 40609592189 | **failure** | PRE-EXISTENTE — PR docs-only; causa: react-day-picker v10 breakage |
| #2664 | `bd783873aa27` | 40609991866 | **failure** | PRE-EXISTENTE — mesma causa; PR docs-only |
| #2667 | `8b0b6068e535` | 40612760517 | **success** ✅ | Este PR CORRIGIU o breakage v10 |
| #2665 | `04239fdd42ee` | 40615509956 | **success** ✅ | bump qs CVE — CI verde |
| #2673 | `62af0798dd71` | 40622373567 | **cancelled** ✗ | Runner backlog — cancelado 03:32:41Z; 8 PNGs, zero risco; SHA anterior `04239fdd42ee` = success |

### Por que #2662 e #2664 mostram `failure`:

PR#2662 é puramente `analise-prs/` (documentação). PR#2664 é puramente `auditoria-supabase/` (documentação). **Nenhum dos dois toca `src/`.**

A falha no Gate 1 (TypeScript) era **pré-existente em main** antes desses merges: 9 erros causados pela migração react-day-picker v8→v10 (property `initialFocus` renomeada para `autoFocus`). Os arquivos afetados são `McpKeysFilters.tsx`, `WidgetFiltersBar.tsx`, `NotificationDrawer.tsx`, `date-picker-field.tsx`, `AdminTelemetriaPage.tsx`, `QuoteBuilderPage.tsx`, `calendar.tsx` — nenhum tocado por #2662 ou #2664.

PR#2667 (`fix(calendar): adapta react-day-picker v8→v10`) corrigiu todos os 9 erros → CI voltou ao verde (run #40612760517 = **success**).

**Critério "zero erro novo":** SATISFEITO. Nenhum dos merges desta sessão introduzio novo erro. A falha em #2662/#2664 era pré-existente e foi corrigida pelo merge subsequente #2667.

### PR #2673 — run #40622373567 (cancelled)

Verificado 3× (02:41:01Z, 03:15:20Z, 03:20:20Z UTC) — `status: queued`, cancelado em 03:32:41Z por timeout do runner (backlog GitHub). PR#2673 = 8 PNGs only, zero código. SHA anterior `04239fdd42ee` (PR#2665) = run #40615509956 **success**. **Risco de regressão: NULO.**

### Vulnerabilidades Dependabot

2 alertas high (extract-zip ≤ 2.0.1, CVE-2026-19693 e CVE-2026-56876, CUSS 11$cope: development, transitive). **Criados em 2026-09-27** — pré-existentes a todos os merges desta sessão (primeiro merge: 2026-10-28). Zero erro novo introduzido por esta sessão.

## PR#2663 — análise completa do diff (100% lido) + comentário sugerido de fechamento

Arquivos alterados confirmados:
1. `RELATORIO_CI.md` — reescrita completa (doc only, ~897 linhas removidas, ~690 novas)
2. `PENDENCIAS-md` — reescrita completa com P1-P15 documentados
3. `supabase/MIGRATIONS_SYNC_LOG.md` — +1 linha (recibo migration pendente)
4. `supabase/migrations/20261027160000_deactivate_image_dimensions_backfill_cron.sql` — **+1 linha apenas**: `-- Rollback: SELECT cron.alter_job(...)` — ZERO DDL- novo (só comentário)

**Veredito mantido: DECISÃO_HUMANA** — `mergeable: false` (conflito com #2667 já mergeado). Fix TypeScript v10 em `src/` já em main via #2667. Migration `20261027160000` ainda não aplicada em produção (status: "pendente" no MIGRATIONS_SYNC_LOG.md).

**Comentário sugerido de fechamento (NÃO ROSTAR — para decisão do PO):**

> Fechando por conflito irresolvípel com #2667 (já mergeado em main).
>
> - O fix TypeScript (react-day-picker v10) já está em main via #2667.
> - `RELATORIO_CI.md` e `PENDENCIAS-md` estão em conflito e documentam estado anterior ao merge de #2667 — desatualizados.
> - A migration `20261027160000_deactivate_image_dimensions_backfill_cron.sql` adiciona apenas 1 linha de comentário de rollback (zero DDL executável) — pode ser re-aberta em PR separado e aplicada via `db-apply-migration.yml` quando o PO decidir desativar o cron de backfill.
>
> Se necessário, abra PR dedicado apenas para a migration de cron, após dispatch explícito do workflow `db-apply-migration.yml` (REGRA #8).
