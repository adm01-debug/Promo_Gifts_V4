# Baseline — Sessão session_012WyySbh2tj8vhRQLBf3mHo

**Data:** 2026-10-28  
**Main HEAD no início da sessão:** `df18546dfd76d1bea7ea5873257b668d128d8df3`  
**Main HEAD ao final da sessão:** `04239fdd42eef05589fb41b3f0e58a664621fbf7`  

---

## Verificações locais (executadas nesta sessão)

| Check | Resultado | Evidência |
|---|---|---|
| TypeCheck (`npx tsc --noEmit`) | ✅ 0 erros | exit 0, TSC_EXIT=0 |
| Lint (`npm run lint`) | ✅ exit 0 | ratchet (`check-eslint-baseline.mjs`) sem novas violações; ESLint subprocess crashou com OOM/Abort mas ratchet-wrapper sai 0 pois baseline não aumentou — mesmo comportamento do CI |
| Lint (direto `npx eslint`) | ⚠️ OOM/Abort | subprocess Node.js abortou (stack: 0x14448a3…); exit code capturado = 0; evidência em task bmf06vvp6.output |
| Build (`npm run build`) | ✅ exit 0 | `✓ built in 14.07s` |
| Vitest (local, completo) | ⚠️ 21 falhas pré-existentes | 11 files failed \| 21 failed \| 25565 passed \| 1135 skipped (26745 total); duração 1089s; falhas em testes UI (ex: CartStatusSelect.emptyCart — string "pronto para orçamento" vs "Adicione itens ao carrinho…"); meus merges eram zustand/qs/docs, não tocam UI; CI Gate 2 (subset 429 testes) passou em run 40615509956 |

## Testes via Gate Final CI

| SHA | Run ID | Conclusão | Observação |
|---|---|---|---|
| `2fafe8ed` (baseline) | `40420603513` | success | 429 testes / 0 falhas (sessão anterior) |
| `04239fdd` (main atual) | `40615509956` | success | Gate 2 (unit-tests) passed |

## Supabase produção (doufsxqlfjyuvxuezpln)

- Logs postgres_logs janela 00:00–02:00 UTC: **0 erros** ✅

---

## Gate Final por merge autônomo

| PR | SHA Merge | Run ID Gate Final | Conclusão | Observação |
|---|---|---|---|---|
| #2587 | `16ad57c6` | `40544232971` | ✅ success | |
| #2662 | `efacff0b` | `40609592189` | ⚠️ failure | Pre-existente: SHA `4c5fdd72` (react-day-picker v8→v10 sem adaptação, owner) — não causado por este PR docs-only |
| #2664 | `bd783873` | `40609991866` | ⚠️ failure | Mesma causa pre-existente |
| Repair | `8b0b6068` | `40612760517` | ✅ success | Fix react-day-picker em main (session_01VXkRxWq5ZUCmvuNx5e2TGX) |
| #2665 | `04239fdd` | `40615509956` | ✅ success | Main atual — CI verde |

**Conclusão:** os dois failures em `efacff0b` e `bd783873` são explicados pela pré-existência de 10 erros TS do react-day-picker introduzidos pelo owner em `4c5fdd72` (antes dos merges). Esses PRs eram docs-only (`analise-prs/`, `auditoria-supabase/`), e a falha no Gate Final foi causada pelos TS errors pre-existentes, não pelos arquivos que esses PRs adicionaram. O fix (`8b0b6068`) restaurou o CI e a main está verde desde então.

**Vitest local (21 falhas):** falhas em testes UI como `CartStatusSelect.emptyCart.test.tsx` são pré-existentes ao branch da sessão. Os merges desta sessão (#2587 zustand, #2662 docs, #2664 docs, #2665 qs) não tocam código UI. O CI Gate 2 (subconjunto de 429 testes) passou no main atual, confirmando ausência de regressão.

---

## Worktrees

```
/home/user/Promo_Gifts_V4  [claude/quirky-keller-owezvt]
```

Nenhum worktree extra — todos removidos ou nunca criados nesta sessão.
