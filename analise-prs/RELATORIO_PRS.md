# RELATÓRIO DE ANÁLISE DE PRs — adm01-debug/Promo_Gifts_V4

**Data:** 2026-10-27 | **Sessão:** session_01VXkRxWq5ZUCmvuNx5e2TGX | **Branch:** `claude_pink/sleepy-cannon-h000nc`

---

## 🚨 ALERTA CRÍTICO — STOP CONDITION ATIVO

**Gate Final FALHOU em main após merge de #2588**

- **SHA:** `4c5fdd72fc301cdcd65851af30204881bab710c4`
- **Run ID:** `40597996716` — `deploy-gates.yml` — conclusion: **failure**
- **Gate falho:** Gate 1 - Lint + TypeScript (`npm run typecheck` exit 2)
- **Gate 6 (Build):** skipped em cascata (Gate 1 falhou primeiro)

**Causa raiz:** PR #2588 (`react-day-picker` v8→v10) não atualizou os consumidores da API.
Prop `initialFocus` foi removida na v10. 8 arquivos afetados:
- `src/components/admin/security/keys/McpKeysFilters.tsx` (L182, L209)
- `src/components/dashboard/widget-filters/WidgetFiltersBar.tsx` (L123)
- `src/components/notifications/NotificationDrawer.tsx` (L617)
- `src/components/ui/calendar.tsx` (L60 `caption`→ClassNames removido; L94 `IconLeft`→CustomComponents removido)
- `src/components/ui/date-picker-field.tsx` (L204)
- `src/pages/admin/AdminTelemetriaPage.tsx` (L515, L543)
- `src/pages/quotes/QuoteBuilderPage.tsx` (L569)

**Merges adicionais bloqueados** até CI voltar ao verde.

---

## RESUMO EXECUTIVO

| Métrica | Valor |
|---|---|
| PRs abertas analisadas | 12 |
| PRs fechadas por ordem do PO | 7 (#2420 #2572 #2579 #2605 #2622 #2645 #2653) |
| PRs DRAFT bloqueadas (regra) | 4 (#2580 #2600 #2631 #2662) |
| PRs com CI FAILURE (bloqueadas antes do merge) | 1 (#2646) |
| PRs mergeadas nesta sessão | **1** (#2588 → SHA `4c5fdd72`) |
| main CI status pós-merge | **🔴 FAILURE** |

---

## BASELINE DE MAIN (ANTES DO MERGE)

| Componente | Status | Evidência |
|---|---|---|
| HEAD pré-merge | `e0b569f18` | git log |
| Gate Final CI pré-merge | ✅ SUCCESS | run_id `40572329584` |
| TypeScript | ✅ EXIT 0 | `analise-prs/baseline/typecheck.txt` |
| Testes unitários | ✅ 1309/1309 | `analise-prs/baseline/unit-tests.txt` |
| ESLint / Gate 1 | ✅ GREEN | CI run `40572329584` (Gate Final SUCCESS inclui Gate 1) |
| Build / Gate 6 | ✅ GREEN | CI run `40572329584` (Gate Final SUCCESS inclui Gate 6) |

---

## MERGE EXECUTADO — #2588

| Campo | Valor |
|---|---|
| PR | #2588 react-day-picker v8→v10 |
| Squash SHA | `4c5fdd72fc301cdcd65851af30204881bab710c4` |
| CI pós-merge | 🔴 FAILURE — run_id `40597996716` |
| Gate falho | Gate 1 (TypeScript) — `initialFocus` removido no v10 |
| Gate 6 | skipped (cascata) |

---

## PRs FECHADAS POR ORDEM DO PO

#2420, #2572, #2579, #2605, #2622, #2645, #2653 — fechadas em 2026-10-27 por instrução explícita do PO.

---

## PRs BLOQUEADAS

| PR | Motivo |
|---|---|
| #2580 | DRAFT |
| #2600 | DRAFT |
| #2631 | DRAFT |
| #2646 | Toca `.github/workflows` + CI FAILURE na PR |
| #2662 | DRAFT (nossa própria branch de análise) |

---

## NÃO VERIFICADO

- Diff completo de #2580 não lido nesta sessão (PR DRAFT — não bloqueia análise de outras)
- `analise-prs/baseline/build.txt` não criado localmente — Gate 6 confirmado verde em CI run `40572329584`; ficou `skipped` em `4c5fdd72` por cascata do Gate 1

---

*session_01VXkRxWq5ZUCmvuNx5e2TGX — 2026-10-27*
