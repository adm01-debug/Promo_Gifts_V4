# Baseline — Sessão 01Ss1tXZ4cAbxBvdmu95uNPz

> Data: 2026-11-01 → 2026-11-02
> SHA main fixado: `a25070630788f77b297431665878319ad74bb587`
> Propósito: medir regressão de qualquer PR contra este estado

---

## TypeScript (`npm run typecheck`)

**Total de erros pré-existentes no main: 10**

Todos relacionados à atualização do `react-day-picker` v8 → v9 (prop `initialFocus` removida na v9):

```
src/components/admin/security/keys/McpKeysFilters.tsx(182,15): error TS2322 — initialFocus não existe em DayPickerProps
src/components/admin/security/keys/McpKeysFilters.tsx(209,15): error TS2322 — initialFocus não existe em DayPickerProps
src/components/dashboard/widget-filters/WidgetFiltersBar.tsx(123,15): error TS2322 — initialFocus não existe em DayPickerProps
src/components/notifications/NotificationDrawer.tsx(617,27): error TS2322 — initialFocus não existe em DayPickerProps
src/components/ui/calendar.tsx(60,9): error TS2353 — 'caption' não existe em Partial<ClassNames>
src/components/ui/calendar.tsx(94,9): error TS2353 — 'IconLeft' não existe em Partial<CustomComponents>
src/components/ui/date-picker-field.tsx(204,11): error TS2322 — initialFocus não existe em DayPickerProps
src/pages/admin/AdminTelemetriaPage.tsx(515,21): error TS2322 — initialFocus não existe em DayPickerProps
src/pages/admin/AdminTelemetriaPage.tsx(543,21): error TS2322 — initialFocus não existe em DayPickerProps
src/pages/quotes/QuoteBuilderPage.tsx(569,27): error TS2322 — initialFocus não existe em DayPickerProps
```

**Regra de regressão:** qualquer PR com mais de 10 erros TS (ou erros em arquivos diferentes dos listados) introduz regressão.

---

## Lint (`npm run lint:baseline`)

Lint ESLint resultou em OOM no ambiente de sessão (Node heap insuficiente, corrigido em `.husky/pre-push` nesta sessão: 2048 → 4096 MB).
Estado do CI canônico: run `#40223579961` no main (`a25070630788f77b297431665878319ad74bb587`).

**NÃO VERIFICADO localmente** — medição real via CI.

---

## Build (`npm run build`)

**NÃO VERIFICADO localmente** — medição real via Gate 6 do CI.

---

## Testes Unitários (`vitest`)

CI canônico run `#40223579961`:
- Gate 2 (unit tests): estado confirmado via check run do CI, não reproduzido localmente nesta sessão.

**NÃO VERIFICADO localmente** — medição real via CI.

---

## CI Canônico

- Workflow: `deploy-gates.yml`
- Run de referência: `#40223579961` em `a25070630788f77b297431665878319ad74bb587`
- Estado: consultado via `mcp__GITHUB_-_MCP_-_FOREVER__github_list_check_runs` na sessão

---

## Nota sobre a baseline anterior

A versão anterior deste arquivo indicava "TypeScript: 0 erros" — **INCORRETO**.
O main real tem 10 erros pré-existentes de `react-day-picker` v9 (todos `initialFocus`).
Esta versão corrige essa informação com evidência direta do comando executado na sessão.
