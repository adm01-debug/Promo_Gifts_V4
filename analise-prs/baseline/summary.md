# Baseline main — SHA a7c02ac15934d75c623b8f5792313b471c320258

Data: 2026-10-30

## TypeScript (npx tsc --noEmit)
- Exit: 0
- Erros: 0

## ESLint (npx eslint --quiet src/)
- Exit: 0
- Warnings: 0 blocking

## Vitest (subset: stores, types tests)
- 3 arquivos, 46 testes: TODOS PASSARAM
- stderr esperado: [BadgeVisibilityStore] Sync failed (erro de teste de rede — esperado, não falha)

## CI em main
- Gate 1.3 (Migration contracts): FALHA PRÉ-EXISTENTE — .migration-refs-baseline.json dessincronizado
- Gate Final: vermelho por Gate 1.3
- Medição de regressão: delta vs este baseline (não absoluto)
