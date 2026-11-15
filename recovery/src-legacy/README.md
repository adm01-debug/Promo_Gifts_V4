# recovery/src-legacy

Cópias **antigas** (layout plano pré-reorganização, ex.: `src/hooks/useX.ts`) que a #3361 registrou em `src/`
junto com os arquivos "não rastreados de sessões anteriores". Nenhum arquivo daqui é alcançável a partir de
`src/main.tsx` nem de qualquer teste/script versionado; ao viverem em `src/` eles entravam no `tsc -p tsconfig.app.json`
(360 erros) e no ESLint (+369 problemas), derrubando `Gate 1 - Lint + TypeScript` e o `Gate Final`.

O caminho original está espelhado dentro desta pasta (`recovery/src-legacy/<caminho original>`).
Para restaurar um arquivo: `git mv recovery/src-legacy/src/hooks/useX.ts src/hooks/useX.ts`.
