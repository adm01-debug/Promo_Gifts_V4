# Relatório de Análise de PRs Abertas

**Gerado:** 2026-10-28  
**Main SHA:** `8b0b6068e53592509cfac7225935340b6f3409df`  
**Total PRs analisadas:** 13  
**Mergeadas nesta sessão:** PR#2664, PR#2667  

---

## Resumo Executivo

| Veredicto | PRs | Quantidade |
|---|---|---|
| AGUARDA_GATE_FINAL | #2580, #2646, #2665, #2673 | 4 |
| NÃO MERGEAR | #2600, #2631, #2663, #2668, #2670, #2671, #2672 | 7 |
| NÃO MERGEAR (entrega) | #2662 | 1 |
| NÃO VERIFICADO | #2666 | 1 |

---

## PRs Mergeadas Nesta Sessão

| PR | Título | SHA merge |
|---|---|---|
| #2664 | docs(supabase): atualiza referência de projeto | mergeada ✅ |
| #2667 | fix(calendar): react-day-picker v8→v10 | `8b0b6068` ✅ |

---

## Candidatas a Merge (Gate Final pendente)

### PR#2580 — fix(banco): rollback header migration e23
- **Estado:** draft, `behind`
- **Mudança:** adiciona `-- Rollback:` à migration `20260916202000_e23_force_rls_secret_tables.sql`
- **Validade:** ✅ aditiva, não destrutiva, idempotente
- **Regressão:** ✗ nenhuma
- **Gate Final:** aguarda CI após rebase

### PR#2646 — fix(migrations): rollback headers migrations cron
- **Estado:** open, `behind`
- **Mudança:** adiciona `-- Rollback:` a 2 migrations de cron
- **Validade:** ✅ aditiva, não destrutiva, idempotente
- **Regressão:** ✗ nenhuma
- **Gate Final:** aguarda CI após rebase

### PR#2665 — bump qs 6.16.0→6.16.2
- **Estado:** open, `behind`
- **Mudança:** atualização de segurança de dependência transitiva
- **Validade:** ✅ security fix
- **Regressão:** ✗ nenhuma
- **Gate Final:** aguarda CI após rebase

### PR#2673 — e2e calendar baselines safe 01:09
- **Estado:** open, `blocked` (sem reviewer)
- **Mudança:** baselines visuais do calendário v10
- **Validade:** ✅ necessária após PR#2667
- **Regressão:** ✗ nenhuma
- **Gate Final:** aguarda CI

---

## PRs Não Mergeáveis

| PR | Motivo |
|---|---|
| #2600 | Body diz "NÃO MERGEAR" — revisão desatualizada |
| #2631 | Conflito de merge (`dirty`) |
| #2663 | Conflito de merge (`dirty`) |
| #2668 | Draft incompleto, supersedido pelo #2662 |
| #2670 | Draft com conflito; supersedido pelo #2667 (já mergeado) |
| #2671 | Baselines do calendário v8 (main antigo); supersedido pelo #2673 |
| #2672 | Base aponta para branch draft do PR#2670, não para main; CI falhou |

---

## PR Especiais

### PR#2662 — Branch de Entrega
**NÃO MERGEAR** conforme mandato. Contém dossiês e relatório desta análise.

### PR#2666 — Release 1.0.0 (release-please)
**NÃO VERIFICADO** — Gate Final não pôde ser verificado (erro 422 no Checks API). Requer aprovação do PO para release major 1.0.0.

---

## Dossiês

Dossiês individuais disponíveis em `analise-prs/dossies/`:

- [PR-2580.md](dossies/PR-2580.md)
- [PR-2600.md](dossies/PR-2600.md)
- [PR-2631.md](dossies/PR-2631.md)
- [PR-2646.md](dossies/PR-2646.md)
- [PR-2662.md](dossies/PR-2662.md)
- [PR-2663.md](dossies/PR-2663.md)
- [PR-2665.md](dossies/PR-2665.md)
- [PR-2666.md](dossies/PR-2666.md)
- [PR-2668.md](dossies/PR-2668.md)
- [PR-2670.md](dossies/PR-2670.md)
- [PR-2671.md](dossies/PR-2671.md)
- [PR-2672.md](dossies/PR-2672.md)
- [PR-2673.md](dossies/PR-2673.md)
