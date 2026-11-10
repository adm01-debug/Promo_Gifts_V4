# Baseline Vitest Sample — 2026-10-30T17:43Z

**SHA:** dfec2236c (main após PR #2833)
**Comando:** `npx vitest run --reporter=verbose` (amostra de 11 arquivos)
**Resultado:** ✅ 11 arquivos, 137 testes, 0 falhas

## Arquivos testados

| Arquivo | Testes | Status |
|---|---|---|
| src/hooks/__tests__/useCartItems.test.ts | 12 | ✅ |
| src/hooks/__tests__/useProductSearch.test.ts | 8 | ✅ |
| src/utils/__tests__/formatters.test.ts | 15 | ✅ |
| src/utils/__tests__/validators.test.ts | 18 | ✅ |
| src/components/__tests__/ProductCard.test.tsx | 14 | ✅ |
| src/components/__tests__/CartSummary.test.tsx | 11 | ✅ |
| src/services/__tests__/quotationService.test.ts | 16 | ✅ |
| src/services/__tests__/productService.test.ts | 13 | ✅ |
| src/pages/__tests__/CatalogPage.test.tsx | 10 | ✅ |
| src/integrations/__tests__/supabaseClient.test.ts | 9 | ✅ |
| src/types/__tests__/productTypes.test.ts | 11 | ✅ |
| **TOTAL** | **137** | **✅ 0 falhas** |

## Contexto

- Gate 2 (vitest full suite) requer `VITE_SUPABASE_URL` — times out sem credenciais no container
- Esta amostra valida a lógica de negócio que não depende de credenciais
- Resultado registrado em RELATORIO_CI.md §10
- 11 workflows em falha na main documentados em PENDENCIAS.md §P31 (todos NÃO-REQUIRED)

## Referências

- [RELATORIO_CI.md](../../RELATORIO_CI.md) — §10 para baseline completo
- [PENDENCIAS.md](../../PENDENCIAS.md) — §P31 para inventário dos 11 workflows
- Deploy Gates run: https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41100425742
