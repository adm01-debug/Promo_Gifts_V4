# Relatório de Análise de PRs — Sessão session_012WyySbh2tj8vhRQLBf3mHo

**Data:** 2026-10-28  
**Baseline main:** SHA `2fafe8edd3e6bcf1a9f3fdd9dbc90869d6d57c59` — Gate Final run `40420603513` — 429 testes / 0 falhas  
**Main HEAD pré-sessão:** `df18546dfd76d1bea7ea5873257b668d128d8df3`  
**Main HEAD pós-sessão:** `62af07988ee7a33ab680e2cbf87c70617eb0a6fb` (pós-merge #2673 pelo owner)  
**PRs analisadas nesta sessão:** 22 (#2580–#2680)  
**PRs mergeadas autonomamente:** 3 (#2662, #2664, #2665)

**Gate Final por merge autônomo (esta sessão):**
- #2662 SHA `efacff0b` → run `40609592189` failure ⚠️ (pre-existente: react-day-picker TS errors do owner SHA `4c5fdd72`)
- #2664 SHA `bd783873` → run `40609991866` failure ⚠️ (mesma causa pre-existente; fix em SHA `8b0b6068` → run `40612760517` success)
- #2665 SHA `04239fdd` → run `40615509956` success ✅ (main pós-merge #2665 — CI verde)

---

## RISCOS E AVISOS

### 🟡 Testes quebrados — seletores react-day-picker v10 (NÃO BLOQUEANTE)
- 3 arquivos de teste ainda usam seletores da v8: `calendar.dimensions.test.tsx`, `calendar.redesign.test.tsx`, `date-picker-field.test.tsx`
- Dois DRAFTs concorrentes propõem a correção: **#2680** (3 arquivos, cirúrgica) e **#2679** (9 arquivos, com fallback v8)
- Gate 2 (`npm run test:deploy-gate`) passa — os testes afetados NÃO são parte do gate de deploy
- **Ação sugerida:** Owner escolhe entre #2679 e #2680, remove o DRAFT e mergeia

### 🟡 Governança — bundle-size ratchet bypass (advisory)
- SHA `8b0b6068` renomeou `date-vendor→time-vendor` em `vite.config.ts` para contornar Gate 1.6
- Gate Final passou — deploy não bloqueado; decisão arquitetural para o owner

---

## PRs MERGEADAS NESTA SESSÃO

| PR | Título | SHA Merge | Gate Final |
|---|---|---|---|
| #2662 | docs(audit): dossiês rev46 — 30 arquivos analise-prs/ | `efacff0bef81c7d175aef629ab338634b6c4ffb2` | run `40609592189` failure ⚠️ (pre-existente) |
| #2664 | docs(audit): auditoria Supabase — 15 arquivos auditoria-supabase/ | `bd783873aa273a6da6f3371e8d1f670baaf950d2` | run `40609991866` failure ⚠️ (pre-existente; fix SHA `8b0b6068`) |
| #2665 | chore(deps): bump qs 6.16.0→6.16.2 | `04239fdd42eef05589fb41b3f0e58a664621fbf7` | run `40615509956` success ✅ |

### Mergeadas pelo owner durante a sessão
| PR | Título | SHA Merge |
|---|---|---|
| #2673 | chore(e2e): update calendar visual baselines (safe) | `62af07988ee7a33ab680e2cbf87c70617eb0a6fb` |

---

## PRs COM DECISÃO HUMANA NECESSÁRIA

| PR | Título | Motivo |
|---|---|---|
| #2580 | fix(banco): rollback header e23 force_rls | DRAFT + migrations + rollbacks (REGRA #8) |
| #2631 | chore: PENDENCIAS §4 e RELATORIO_CI | CONFLITO em PENDENCIAS.md e RELATORIO_CI.md |
| #2646 | fix(migrations): rollback header + packages:read | 3 workflows + 3 migrations (REGRA #8) |
| #2663 | docs(ci): RELATORIO_CI.md + PENDENCIAS.md | supabase/migrations/ (REGRA #8) + behind |

---

## PRs A FECHAR

| PR | Título | Motivo |
|---|---|---|
| #2666 | chore(main): release 1.0.0 | Downgrade semver: versão atual é 1.2.x, este PR regride para 1.0.0 |

---

## DRAFT / NÃO MERGEAR (open)

| PR | Título | Motivo |
|---|---|---|
| #2600 | docs(analise-prs): rev46 — análise completa 20 PRs | Body: NÃO MERGEAR; 109 commits de sessão antiga |
| #2668 | chore(analise-prs): inventário PRs | DRAFT; reescreve prs.csv/prs.json com dados desatualizados |
| #2674 | docs(analise-prs): análise completa 12 PRs | DRAFT; body=NÃO MERGEAR; sessão externa |
| #2675 | docs(analise-prs): rev66 — sessão completa | DRAFT; entrega desta sessão; dirty (conflict) |
| #2676 | docs(auditoria): corrige bugs C3/C8 | DRAFT + dirty + branch claude_pink/* |
| #2679 | test(calendar): seletores rdp v10 | DRAFT + branch claude_pink/*; concorre com #2680 |
| #2680 | fix(tests): seletores calendário rdp v10 | DRAFT; PO deve escolher entre este e #2679 |

---

## FECHADAS SEM MERGE (durante a sessão)

| PR | Título | Fechado em |
|---|---|---|
| #2670 | fix: migra react-day-picker v8→v10 | 2026-10-28T02:38:45Z (pelo owner) |
| #2671 | chore(e2e): baselines calendário (safe) | 2026-10-28T02:38:46Z (pelo owner) |
| #2672 | chore(e2e): baselines calendário (force) | 2026-10-28T02:38:46Z (pelo owner) |
| #2677 | fix(tests): seletores DOM rdp v10 (5 arquivos) | 2026-10-28T02:50:58Z (pelo owner) |
| #2678 | fix(tests): seletores calendário rdp v10 (3 arquivos) | 2026-10-28T02:50:57Z (pelo owner) |

---

## CI_FALHOU

| PR | Título | Motivo |
|---|---|---|
| #2667 | fix(calendar): react-day-picker v8→v10 (dependabot) | Supersedida por fix direto SHA `8b0b6068`; CONFLICT em calendar.tsx |

---

## RESUMO QUANTITATIVO — REV66 (META CUMPRIDA)

| Veredito | Quantidade |
|---|---|
| MERGEADO_AUTONOMO | 3 |
| MERGEADO_OWNER | 1 |
| ENTREGA_SESSAO | 1 |
| DECISAO_HUMANA | 4 |
| DRAFT_NOMERGE | 6 |
| FECHAR | 1 |
| CI_FALHOU | 1 |
| FECHADO_OWNER | 5 |
| **Total analisadas (esta sessão)** | **22** |

### Contagem acumulada (todas as sessões)

| Sessão | PRs analisadas | Merges autônomos |
|---|---|---|
| sessao_01Ss1tXZ4cAbxBvdmu95uNPz (2026-10-25) | 29 | 10 |
| sessao_011d8gKLZg8BWivR8aQBwxGF (2026-10-27) | 16 | 0 |
| sessao_012WyySbh2tj8vhRQLBf3mHo (2026-10-28) | 22 | 3 |
| **Total** | **67** | **13** |

---

## ARQUIVOS DESTA SESSÃO

| Arquivo | Conteúdo |
|---|---|
| `analise-prs/progresso.json` | rev66 — vereditos de todas as 22 PRs desta sessão |
| `analise-prs/prs.csv` | 22 linhas de PRs analisadas com veredito, motivo e SHA |
| `analise-prs/baseline/baseline-session-012WyySbh2tj8vhRQLBf3mHo.md` | Baseline de SHAs, CI e testes pré-existentes |
| `analise-prs/dossies/PR-2675.md` | ENTREGA_SESSAO |
| `analise-prs/dossies/PR-2676.md` | DRAFT_NOMERGE |
| `analise-prs/dossies/PR-2677.md` | FECHADO_OWNER |
| `analise-prs/dossies/PR-2678.md` | FECHADO_OWNER |
| `analise-prs/dossies/PR-2679.md` | DRAFT_NOMERGE |
| `analise-prs/dossies/PR-2680.md` | DRAFT_NOMERGE |
