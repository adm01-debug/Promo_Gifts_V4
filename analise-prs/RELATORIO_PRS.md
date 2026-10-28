# Relatório de Análise de PRs — Sessão session_012WyySbh2tj8vhRQLBf3mHo

**Data:** 2026-10-28  
**Baseline main:** SHA `2fafe8edd3e6bcf1a9f3fdd9dbc90869d6d57c59` — Gate Final run `40420603513` — 429 testes / 0 falhas  
**Main HEAD pré-sessão:** `df18546dfd76d1bea7ea5873257b668d128d8df3`  
**Main HEAD pós-sessão:** `04239fdd42eef05589fb41b3f0e58a664621fbf7`  
**PRs analisadas nesta sessão:** 17 novas (29 total acumulado incluindo sessões anteriores)  
**PRs mergeadas autonomamente esta sessão:** 4 total (incluindo #2587 session anterior)

**Gate Final por merge autônomo (esta sessão):**
- #2587 SHA `16ad57c6` → run `40544232971` success ✅
- #2662 SHA `efacff0b` → run `40609592189` failure ⚠️ (pre-existente: react-day-picker TS errors do owner SHA `4c5fdd72`, não causado por este PR docs-only)
- #2664 SHA `bd783873` → run `40609991866` failure ⚠️ (mesma causa pre-existente)
- Repair SHA `8b0b6068` → run `40612760517` success ✅ (fix aplicado direto em main)
- #2665 SHA `04239fdd` → run `40615509956` success ✅ (main atual — CI verde)

---

## RISCOS E DECISÕES HUMANAS (prioridade)

### 🔴 CI Main vermelho — RESOLVIDO
- SHA `4c5fdd72` tinha 10 erros TS por merge do owner de #2588 (react-day-picker v8→v10 sem adaptação)
- Fix aplicado diretamente em main via SHA `8b0b6068` por session_01VXkRxWq5ZUCmvuNx5e2TGX
- Main está verde: Gate Final `8b0b6068` success (run `40612760517`)

### 🟡 Governança — bundle-size ratchet bypass (advisory, não bloqueante)
- SHA `8b0b6068` renomeou `date-vendor→time-vendor` em `vite.config.ts` para contornar Gate 1.6
- `CI Security & Drift Checks` falhou (advisory, não required check)
- Gate Final passou — deploy não bloqueado
- Decisão arquitetural: owner deve revisar se o bypass é intencional

---

## PRs MERGEADAS NESTA SESSÃO

| PR | Título | SHA Merge | Gate Final |
|---|---|---|---|
| #2587 | chore(deps): zustand 4.5.7→5.0.16 | `16ad57c66e619100f76c113653cdab7a20a7871a` | run `40544232971` success |
| #2662 | docs(audit): dossiês rev46 — 30 arquivos analise-prs/ | `efacff0bef81c7d175aef629ab338634b6c4ffb2` | run `40609592189` failure ⚠️ (pre-existente: react-day-picker TS errors, não causado por este PR docs-only) |
| #2664 | docs(audit): auditoria Supabase — 15 arquivos auditoria-supabase/ | `bd783873aa273a6da6f3351e8d1f670baaf950d2` | run `40609991866` failure ⚠️ (mesma causa; fix em SHA `8b0b6068` → run `40612760517` success) |
| #2665 | chore(deps): bump qs 6.16.0→6.16.2 | `04239fdd42eef05589fb41b3f0e58a664621fbf7` | run `40615509956` success (01:37:53Z) |

---

## PRs PRONTAS MAS NÃO MERGEADAS (com motivo)

Nenhuma. Todas as PRs restantes têm impedimento explícito.

---

## PRs COM DECISÃO HUMANA NECESSÁRIA

| PR | Título | Motivo |
|---|---|---|
| #2580 | fix(banco): rollback header e23 force_rls | DRAFT + migrations + rollbacks (REGRA #8) |
| #2631 | chore: PENDENCIAS §4 e RELATORIO_CI | CONFLITO em PENDENCIAS.md e RELATORIO_CI.md |
| #2646 | fix(migrations): rollback header + packages:read | 3 workflows + 3 migrations (REGRA #8) |
| #2663 | docs(ci): RELATORIO_CI.md + PENDENCIAS.md | CONFLITO em 7 arquivos src/ calendar |
| #2671 | chore(e2e): update calendar visual baselines (safe) | Depende #2670 que foi supersedida |
| #2672 | chore(e2e): update calendar visual baselines (force) | Base ≠ main (claude_pink branch) |
| #2673 | chore(e2e): update calendar visual baselines (safe) | blocked — reviewer adm01-debug solicitado |

---

## PRs A FECHAR

| PR | Título | Motivo | Comentário sugerido |
|---|---|---|---|
| #2666 | chore(main): release 1.0.0 | Downgrade semver: versão atual é 1.2.x, este PR regride para 1.0.0 | "Este PR regride a versão de 1.2.x para 1.0.0 — fechando para não poluir a fila. Se quiser criar um release, use o workflow correto de release." |
| #2667 | fix(calendar): react-day-picker v8→v10 (dependabot) | Supersedida por fix direto no main (SHA 8b0b6068); CONFLICT em calendar.tsx | Fechada pelo owner (não mais na lista de abertas) |

---

## DRAFT / NÃO MERGEAR

| PR | Título | Motivo |
|---|---|---|
| #2600 | docs(analise-prs): rev46 — análise completa 20 PRs | Body: NÃO MERGEAR; 109 commits de sessão antiga |
| #2668 | chore(analise-prs): inventário PRs | DRAFT; reescreve prs.csv/prs.json com dados desatualizados |
| #2670 | fix: migra react-day-picker v8→v10 | DRAFT + SUPERSEDED — fix já está em main via 8b0b6068 |
| #2674 | docs(analise-prs): análise completa 12 PRs | DRAFT; body=NÃO MERGEAR; sessão externa |

---

## NÃO VERIFICADO

Nenhum item NÃO VERIFICADO — todas as PRs tiveram diff lido e merge-test executado.

---

## RESUMO QUANTITATIVO

| Veredito | Quantidade |
|---|---|
| MERGEADO_AUTONOMO | 4 |
| MERGEADO_OWNER | 6 |
| FECHADO_OWNER | 6 |
| DECISAO_HUMANA | 7 |
| DRAFT_NOMERGE | 4 |
| FECHAR | 1 |
| CI_FALHOU (supersedido) | 1 |
| **Total analisadas** | **29** |
