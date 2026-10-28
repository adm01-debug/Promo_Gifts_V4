# RELATORIO_PRS — Análise de PRs abertas

**Gerado em:** 2026-10-28  
**Sessão:** https://claude.ai/code/session_01VXkRxYoeZ4YYfunRonjjXL  
**Main HEAD:** `62af0798dd71812979667ac29f596d25f3ef191b`  
**Gate Final main:** ⏳ IN PROGRESS (E2E rodando na SHA `62af079`)

---

## ⚠️ RISCOS E BLOQUEIOS (leia primeiro)

| Risco | Impacto | Ação necessária |
|---|---|---|
| PR #2679 Gate Final aguardando | Bloqueia merge do fix de unit tests | Aguardar CI na SHA `ce05764` |
| PR #2663 contém migration + título enganoso | Possível conflito ou divergência de ledger | PO: revisar antes de mergear |

---

## Inventário Completo — 5 PRs abertas

| PR | Título | Veredito | Motivo |
|---|---|---|---|
| #2679 | test(calendar): corrige seletores para react-day-picker v10 | **MERGE CANDIDATE** | Aguarda Gate Final SHA `ce05764` |
| #2675 | docs(audit): relatório final sessão anterior (4 merges autônomos) | **MERGE CANDIDATE** | Docs only; aguarda Gate Final main verde |
| #2668 | chore(analise-prs): inventário e relatório de todas as PRs abertas | **MERGE CANDIDATE** | Docs only; aguarda Gate Final main verde |
| #2663 | docs(ci): RELATORIO_CI.md + PENDENCIAS.md + migration | **AGUARDA PO** | Título diz "docs" mas contém migration; verificar antes de mergear |
| #2631 | chore: atualiza PENDENCIAS §4 e RELATORIO_CI | **MERGE CANDIDATE** | Docs only; aguarda Gate Final main verde |

---

## Contagem por veredito

| Veredito | Quantidade | PRs |
|---|---|---|
| MERGE CANDIDATE | 4 | #2679, #2675, #2668, #2631 |
| AGUARDA PO | 1 | #2663 |
| Total analisado | **5** | = total aberto ✅ |

---

## Ordem de merge recomendada (após Gate Final verde em PR #2679)

1. **#2679** — fix unit tests rdp v10 (restaura Gate 2 para verde)
2. **#2631** — docs CI/PENDENCIAS
3. **#2668** — analise-prs inventário
4. **#2675** — relatório de auditoria sessão anterior

---

## PRs AGUARDA PO

### #2663 — docs(ci) + migration suspeita
- Título diz "RELATORIO_CI.md + PENDENCIAS.md" mas pode conter migration SQL
- PO: revisar o diff completo antes de autorizar merge

---

## PRs fechadas nesta sessão

| PR | Motivo do fechamento |
|---|---|
| #2678 | Duplicata do fix de unit tests rdp v10 (substituído por #2679) |
| #2677 | Duplicata do fix de unit tests rdp v10 (substituído por #2679) |
| #2670 | Fix do calendar.tsx já estava em main via commit `8b0b606` |
| #2671 | E2E baselines já mergeadas via PR #2673 (`62af079`) |
| #2672 | E2E baselines já mergeadas via PR #2673 (`62af079`) |

## PRs mergeadas nesta sessão

| PR | SHA merge | Gate Final |
|---|---|---|
| #2673 | `62af0798` | ✅ em execução (E2E in_progress) |

---

## Escritas no GitHub desta sessão

1. PR #2678 — comentário de fechamento + close
2. PR #2677 — comentário de fechamento + close
3. PR #2670 — comentário de fechamento + close
4. PR #2671 — comentário de fechamento + close
5. PR #2672 — comentário de fechamento + close
6. PR #2673 — merge (E2E baselines)
7. PR #2679 — criado (unit test fix rdp v10)

---

## META CHECKLIST

- [x] Total PRs abertas: 5 (reduzidas de 16 → 5 nesta sessão + sessão anterior)
- [x] Total PRs analisadas: 5
- [x] MERGE CANDIDATE: 4
- [x] AGUARDA PO: 1
- [x] PRs fechadas com evidência: 5 (#2678, #2677, #2670, #2671, #2672)
- [ ] PR #2679 Gate Final: AGUARDANDO (SHA `ce05764`)
- [ ] Merges pendentes: 4 (#2679, #2675, #2668, #2631) após Gate Final verde

---

*Gerado por Claude Code — sessão https://claude.ai/code/session_01VXkRxYoeZ4YYfunRonjjXL*
