# Baseline do main — sessão de análise de PRs

**SHA HEAD main:** `4c5fdd72fc301cdcd65851af30204881bab710c4`
**Data:** 2026-10-27
**Gate Final:** ❌ RED — react-day-picker v10 breaking API (10 erros TS). Causa: PR #2588 bumped v8→v10 sem atualizar consumidores.
**Fix:** PR #2667 (branch `claude_pink/sleepy-cannon-h000nc`, SHA `79ac4d6a3`) — awaiting Gate Final CI.

## Erros TS confirmados na main (SHA 4c5fdd72)

- `src/components/ui/calendar.tsx`: `caption`, `nav_button`, `nav_button_previous`, `nav_button_next`, `IconLeft`, `IconRight` → removidos na v10
- `src/components/ui/date-picker-field.tsx`: `initialFocus` → `autoFocus`
- `src/components/admin/security/keys/McpKeysFilters.tsx`: `initialFocus` ×2
- `src/components/dashboard/widget-filters/WidgetFiltersBar.tsx`: `initialFocus`
- `src/components/notifications/NotificationDrawer.tsx`: `initialFocus`
- `src/pages/admin/AdminTelemetriaPage.tsx`: `initialFocus` ×2
- `src/pages/quotes/QuoteBuilderPage.tsx`: `initialFocus`

Total: 10 erros TS no Gate 1 (TypeScript check).

## Falhas pré-existentes (não introduzidas por #2588)

- Running Copilot Code Review: bot externo irresolvível
- E2E workflows (5): infra CI pré-existente
- edge-functions-drift-check: 106 funções divergentes, aguarda aprovação PO em `environment: production`
- Uptime Monitor: transiente
