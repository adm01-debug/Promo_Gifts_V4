# Baseline do main — SHA c344508711797a730893644449b16a05f12f4fce

## Contexto
- node_modules NÃO instalados no ambiente CI de análise
- tsc global versão 6.0.2 disponível, mas sem node_modules não resolve imports de libs
- Tests: NÃO EXECUTADOS localmente (sem node_modules/vitest)
- Lint: NÃO EXECUTADO localmente (sem node_modules/eslint)
- TypeCheck (tsc --noEmit com tsconfig.app.json): produz erros PRÉ-EXISTENTES em undoToast.tsx

## Erros pré-existentes no main (undoToast.tsx)
Todos os erros TS2307/TS7026 em src/utils/undoToast.tsx são pré-existentes no main.
Qualquer PR que ADICIONE novos erros fora deste arquivo → regressão.

## Estratégia de baseline
Regressão será medida via:
1. Diff de arquivos: se PR toca undoToast.tsx → NÃO VERIFICADO
2. Verificação de CI do GitHub: checks do PR vs CI do main
3. Análise semântica do diff

## Referência CI do main
Verificar runs recentes em main para saber quais gates estão vermelhos.
