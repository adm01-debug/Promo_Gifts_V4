# RELATORIO_PRS.md — Análise Completa de PRs Abertas

**Gerado em:** 2026-10-28  
**Sessão:** claude_pink/sleepy-cannon-h000nc  
**Main SHA na análise:** `8b0b6068e53592509cfac7225935340b6f3409df`  
**Total PRs abertas:** 12  
**Total analisadas:** 12  

---

## Resumo Executivo

| Veredicto | Quantidade | PRs |
|---|---|---|
| NÃO_MERGEAR | 4 | #2600, #2662, #2668, #2670 |
| DECISAO_HUMANA | 1 | #2663 |
| AGUARDA_CI | 7 | #2580, #2631, #2646, #2665, #2666, #2671, #2673 |
| AGUARDA_ANÁLISE | 1 | #2672 |

**PRs mergeadas nesta sessão:** #2664 (react-day-picker fix parte 1) + #2667 (react-day-picker fix completo)

---

## Tabela de PRs

| PR | Título | Draft | Base | Gate Final | Veredicto |
|---|---|---|---|---|---|
| #2580 | fix(banco): rollback header | ✓ | old | FAILED (old base) | AGUARDA_CI |
| #2600 | docs(analise-prs): rev46 | — | old | SUCCESS | NÃO_MERGEAR |
| #2631 | chore: PENDENCIAS+RELATORIO_CI | — | old | SUCCESS (old base) | AGUARDA_CI |
| #2646 | fix(migrations): rollback headers | — | old | FAILED (E40 infra) | AGUARDA_CI |
| #2662 | delivery branch desta sessão | — | — | SUCCESS | NÃO_MERGEAR |
| #2663 | docs(ci): RELATORIO_CI+PENDENCIAS | — | old | N/A (conflito) | DECISAO_HUMANA |
| #2665 | bump qs 6.16.0→6.16.2 | — | old | NOT RUN | AGUARDA_CI |
| #2666 | release 1.0.0 | — | main ✓ | NOT RUN | AGUARDA_CI |
| #2668 | analise-prs inventário | ✓ | old | NOT RUN | NÃO_MERGEAR |
| #2670 | fix react-day-picker (dup) | ✓ | old | NOT RUN | NÃO_MERGEAR |
| #2671 | e2e baselines (safe) | — | old | NOT RUN | AGUARDA_CI |
| #2672 | e2e baselines (force) | — | other | NOT RUN | AGUARDA_ANÁLISE |
| #2673 | e2e baselines (safe, nova) | — | main ✓ | NOT RUN | AGUARDA_CI |

---

## PRs NÃO_MERGEAR — Justificativas

### PR#2600 — docs(analise-prs): rev46
**Motivo:** O body da PR diz explicitamente `"NÃO MERGEAR ESTA PR"`. É a delivery branch de uma sessão anterior.

### PR#2662 — delivery branch desta sessão
**Motivo:** Esta própria branch (`claude_pink/sleepy-cannon-h000nc`) não deve ser mergeada automaticamente — é a delivery desta sessão para revisão humana.

### PR#2668 — analise-prs inventário (draft)
**Motivo:** Draft, incompleto, base outdated (`4c5fdd72`). Substituído por PR#2662.

### PR#2670 — fix react-day-picker (draft)
**Motivo:** Draft, superseded por PR#2667 que já está mergeada no main.

---

## PR DECISAO_HUMANA — PR#2663

### PR#2663 — docs(ci): RELATORIO_CI.md + PENDENCIAS.md
**Motivo:** `mergeable: false`, `mergeable_state: "dirty"`. Tem conflito de merge contra main atual. O conteúdo documenta um estado de CI que pode estar desatualizado após merge do fix calendar (PR#2667). Requer decisão do PO: rebase e atualizar conteúdo, ou fechar.

---

## PRs AGUARDA_CI — Detalhes

### PR#2580 — fix(banco): rollback header (DRAFT)
- Draft, base outdated, Gate Final FAILED (contra versão quebrada do main)
- Mudança aditiva válida (cabeçalho de rollback em arquivo SQL)
- Aguarda: undraft + rebase + Gate Final verde

### PR#2631 — chore: PENDENCIAS + RELATORIO_CI
- Docs-only, base outdated, Gate Final SUCCESS (mas contra versão quebrada)
- Aguarda: Gate Final contra main atual

### PR#2646 — fix(migrations): rollback headers
- Base outdated, Gate Final FAILED por rate limit ghcr.io (infra, não código)
- Aguarda: novo run de CI + Gate Final verde

### PR#2665 — bump qs 6.16.0→6.16.2
- Security bump by dependabot, base outdated (`4c5fdd72`)
- Aguarda: rebase (dependabot ou manual) + Gate Final

### PR#2666 — release 1.0.0
- Base = main atual ✓, release-please automático
- Gate Final NÃO RODOU (apenas checks Vercel/Supabase)
- Aguarda: Gate Final Deploy Gates

### PR#2671 — e2e baselines (safe)
- Base outdated (`4c5fdd72`), Gate Final não rodou na base atual
- Aguarda: verificar conflito com #2673 (mesmos arquivos)

### PR#2673 — e2e baselines (safe, nova)
- Base = main atual ✓, criada nesta sessão
- Gate Final NÃO RODOU
- Aguarda: Gate Final Deploy Gates

---

## Baseline CI no Momento da Análise

- **Main SHA:** `8b0b6068e53592509cfac7225935340b6f3409df`
- **Gate Final no main:** ✅ SUCCESS (confirmado via PR#2667 mergeada)
- **Deploy Vercel:** confirmado após merge PR#2667
- **Arquivos críticos:**
  - `src/integrations/supabase/client.ts`: `CURRENT_PROJECT_ID = 'doufsxqlfjyuvxuezpln'` ✓
  - `src/components/ui/calendar.tsx`: react-day-picker v10 ✓
  - `vite.config.ts`: chunk `time-vendor` (date-fns) ✓
  - `bundle-size-baseline.json`: atualizado ✓

---

## Ações Executadas Nesta Sessão

1. **PR#2667 MERGEADA** — Fix completo react-day-picker v8→v10 (SHA merge: `8b0b6068`)
   - Corrigiu main que estava quebrado com 10 erros TypeScript
   - Gate Final ✅ antes do merge (SHA `241aa2a6`)

2. **Análise completa** de 12 PRs abertas com 4 perguntas cada

3. **Deliverables gerados** em `analise-prs/`:
   - `baseline/`: typecheck.txt, lint.txt, build.txt, main-sha.txt
   - `dossies/PR-NNNN.md` para todos os 12 PRs abertos
   - `RELATORIO_PRS.md` (este arquivo)
   - `prs.json`, `prs.csv`
   - `regras-de-negocio.md`

---

## Restrições Identificadas (para futuras sessões)

1. **PRs com base `4c5fdd72`** (8 de 12): precisam de rebase ou fechamento após as correções de PR#2667
2. **PR#2663**: conflito de merge — requer ação humana
3. **PR#2646**: Gate E40 falha por rate limit ghcr.io — problema de infraestrutura do CI, não de código
4. **PR#2666 e #2673**: Gate Final não rodou — aguardam trigger automático do CI

---

_Análise gerada por Claude Code — sessão `claude_pink/sleepy-cannon-h000nc`_
