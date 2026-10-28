# Baseline — Testes Falhos em main

**SHA:** `62af0798dd71812979667ac29f596d25f3ef191b`  
**Data:** 2026-10-28  
**Sessão:** https://claude.ai/code/session_012WyySbh2tj8vhRQLBf3mHo

## Resultado: `npx vitest run src/components/ui/__tests__/calendar.redesign.test.tsx src/components/ui/__tests__/date-picker-field.test.tsx`

```
Test Files  1 failed | 1 passed (2)
      Tests  2 failed | 18 passed (20)
   Duration  2.62s
```

### Falhas confirmadas em main

| Arquivo | Teste | Status |
|---------|-------|--------|
| `calendar.redesign.test.tsx` | `day_selected: bg-destructive + text-primary-foreground` | ❌ FAIL |
| `calendar.redesign.test.tsx` | `day_outside é oculto (invisible + pointer-events-none)` | ❌ FAIL |

### Aprovados em main

| Arquivo | Status |
|---------|--------|
| `date-picker-field.test.tsx` (18 testes) | ✅ PASS |
| `calendar.redesign.test.tsx` (7/9 testes) | ✅ PASS parcial |

## TypeScript

```
npx tsc --noEmit → 0 erros (confirmado em sessão anterior)
```

## Causa raiz das falhas

Commit `8b0b6068` (PR #2667) migrou react-day-picker v8→v10 no componente `Calendar.tsx`,
mas não atualizou os seletores DOM nos testes. Os testes do `calendar.redesign.test.tsx`
ainda usam seletores da API v8 que não existem em v10.

PRs #2681 e #2679 corrigem esses seletores.