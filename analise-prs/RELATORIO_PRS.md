# RELATORIO_PRS — Análise Exaustiva de PRs abertas

**Gerado em:** 2026-10-28  
**Sessão:** https://claude.ai/code/session_012WyySbh2tj8vhRQLBf3mHo  
**Main HEAD:** `62af0798dd71812979667ac29f596d25f3ef191b`  
**Gate Final main:** ❌ CANCELLED (run 40622373567, SHA `62af0798`)

---

## Baseline (main `62af0798`)

| Check | Resultado |
|-------|----------|
| TypeScript (`tsc --noEmit`) | ✅ 0 erros |
| `calendar.redesign.test.tsx` | ❌ 2 falhas (day_selected, day_outside) |
| `date-picker-field.test.tsx` | ✅ 18/18 aprovados |
| Gate Final main | ❌ CANCELLED |

**Causa das falhas:** Commit `8b0b6068` migrou react-day-picker v8→v10 mas não
atualizou seletores de teste.

---

## ⚠️ Riscos e Bloqueios

| Risco | Impacto | Ação |
|-------|---------|------|
| 2 testes falhos em main | Bloqueia CI | PR #2681 corrije — aguarda Gate Final |
| Gate Final main CANCELLED | Bloqueia merges | Aguardar CI completar em #2681 |
| PR #2666 downgrade 1.2.1→1.0.0 | Regressão semver | PO: confirmar ou fechar |
| PRs com migrations/workflows | AGUARDA PO | #2663, #2646 |

---

## Inventário Completo — 12 PRs abertas

| PR | Título | Autor | Draft | Veredito | Motivo |
|----|--------|-------|-------|----------|--------|
| #2681 | fix(tests): react-day-picker v10 selectors | adm01-debug | Não | **MERGE CANDIDATE** | Aguarda Gate Final SHA `7286e3bc` |
| #2680 | fix(tests): calendar selectors (similar) | adm01-debug | Sim | **BLOQUEADO** | Draft |
| #2679 | test(calendar): selectors v10 | adm01-debug | Não | **BLOQUEADO** | Conflita com #2681 |
| #2675 | docs(audit): relatório final | adm01-debug | Não | **AGUARDA PO** | Branch desta sessão + REGRA #10 |
| #2674 | docs(analise-prs): 12 PRs (sessão ant.) | adm01-debug | Sim | **BLOQUEADO** | Draft |
| #2668 | chore(analise-prs): inventário | adm01-debug | Sim | **BLOQUEADO** | Draft |
| #2666 | chore(main): release 1.0.0 | github-actions[bot] | Não | **AGUARDA PO** | Downgrade 1.2.1→1.0.0 |
| #2663 | docs(ci): RELATORIO_CI + PENDENCIAS | adm01-debug | Não | **AGUARDA PO** | `supabase/migrations/` → REGRA #8 |
| #2646 | fix(migrations): rollback headers | adm01-debug | Não | **AGUARDA PO** | `workflows/` + `migrations/` → REGRA #8 |
| #2631 | chore: PENDENCIAS §4 + RELATORIO_CI | adm01-debug | Não | **BLOQUEADO** | Conflito real (dirty) |
| #2600 | docs(analise-prs): rev46 (sessão ant.) | adm01-debug | Não | **BLOQUEADO** | Conflito real (405 no merge) |
| #2580 | fix(banco): rollback header e23 | adm01-debug | Sim | **BLOQUEADO** | Draft + `supabase/migrations/` |

---

## Contagem por veredito

| Veredito | Qtd | PRs |
|----------|-----|-----|
| MERGE CANDIDATE | 1 | #2681 |
| AGUARDA PO | 4 | #2666, #2663, #2646, #2675 |
| BLOQUEADO | 7 | #2680, #2679, #2674, #2668, #2631, #2600, #2580 |
| **Total** | **12** | **= total aberto ✅** |

---

## Ordem de merge recomendada

1. **#2681** — fix tests react-day-picker v10 (restaura CI verde em main)

Após #2681 mergeada: verificar se #2679 pode ser fechada (conteúdo idêntico).

---

## PRs AGUARDA PO

### #2675 — entrega desta sessão
Conteúdo: documentação de análise de PRs. Requer revisão humana (REGRA #10).

### #2666 — release 1.0.0 (bot)
PO: confirmar se é intencional. Se não for, fechar e corrigir release-please config.

### #2663 — migration deactivate cron backfill
Migration: `20261027160000_deactivate_image_dimensions_backfill_cron.sql`
Desativa cron job de backfill de dimensões de imagens. Requer aprovação PO.

### #2646 — migrations + workflows
Mudanças de CI (packages: read para Docker auth) + rollback headers em migrations.
Mudanças sólidas de CI, mas tocam arquivos protegidos. Requer aprovação PO.

---

## Status de merges nesta sessão

| PR | SHA | Gate Final | Resultado |
|----|-----|------------|----------|
| #2681 | `7286e3bc` | Deploy Gates CANCELADO → rerun disparado 04:10Z | Aguardando novo resultado |

---

## META CHECKLIST

- [x] Total PRs abertas: 12
- [x] Total PRs analisadas: 12
- [x] MERGE CANDIDATE: 1
- [x] AGUARDA PO: 4
- [x] BLOQUEADO: 7
- [x] Baseline: 2 testes falhos por nome em `analise-prs/baseline/`
- [x] TypeScript: 0 erros
- [x] prs.json criado
- [x] Dossies criados para todas as 12 PRs
- [ ] PR #2681 Gate Final: Deploy Gates rerun disparado (run 40629639891) — aguardando
- [ ] Merge executado: 0/1
- [x] progresso.json criado com per-PR
- [x] regras-de-negocio.md reconstruído de fontes reais

---

## Arquivos produzidos

```
analise-prs/
├── RELATORIO_PRS.md           (este arquivo)
├── prs.json                   (inventário estruturado das 12 PRs)
├── regras-de-negocio.md       (referência de regras de negócio)
├── baseline/
│   └── vitest-failing-tests.md  (2 testes falhos em main)
└── dossies/
    ├── PR-2580.md
    ├── PR-2600.md
    ├── PR-2631.md
    ├── PR-2646.md
    ├── PR-2663.md
    ├── PR-2666.md
    ├── PR-2668.md
    ├── PR-2674.md
    ├── PR-2675.md
    ├── PR-2679.md
    ├── PR-2680.md
    └── PR-2681.md
```

---

*Gerado por Claude Code — sessão https://claude.ai/code/session_012WyySbh2tj8vhRQLBf3mHo*
