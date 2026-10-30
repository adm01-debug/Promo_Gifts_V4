# Baseline: Testes Falhos em main

**Main HEAD:** `62af0798dd71812979667ac29f596d25f3ef191b`  
**Data:** 2026-10-28  

## Testes que falham em main (por nome)

### Arquivo: `src/components/ui/__tests__/calendar.redesign.test.tsx`

1. **`day_selected: bg-destructive + text-primary-foreground`**
   - Causa: seletor `button[aria-selected="true"]` invalido no react-day-picker v10
   - DOM v10: `aria-selected` vai para `<td>`, nao `<button>`

2. **`day_outside e oculto (invisible + pointer-events-none)`**
   - Causa: seletor `button[name="day"]` invalido no react-day-picker v10
   - DOM v10: botoes de dia sao filhos de `td[role="gridcell"]`, sem `name`

## Status

Estas 2 falhas fazem parte do **baseline de main** - nao sao regressao de nenhuma PR.
PR #2681 foi fechada sem merge em 04:14Z. Problema persiste.
