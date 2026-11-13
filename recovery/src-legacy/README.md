# recovery/src-legacy

Cópias **antigas** (layout plano pré-reorganização, ex.: `src/hooks/useX.ts`) que a #3361 registrou em `src/`
junto com os arquivos "não rastreados de sessões anteriores". Nenhum arquivo daqui é alcançável a partir de
`src/main.tsx` nem de qualquer teste/script versionado; ao viverem em `src/` eles entravam no `tsc -p tsconfig.app.json`
(360 erros) e no ESLint (+369 problemas), derrubando `Gate 1 - Lint + TypeScript` e o `Gate Final`.

O caminho original está espelhado dentro desta pasta (`recovery/src-legacy/<caminho original>`).
Para restaurar um arquivo: `git mv recovery/src-legacy/src/hooks/useX.ts src/hooks/useX.ts`.

## Edições da PR #3390 arquivadas aqui

A PR #3390 (codex, "restaurar contratos e preservar implementações do Gate 1") corrigia esses mesmos
arquivos legados ainda em `src/`. Como a main já os moveu para cá, as versões corrigidas pela PR foram
gravadas nos caminhos espelhados desta pasta (193 arquivos atualizados + 47 auxiliares/testes que só
servem ao código legado, ex.: `tests/hooks/*legacy*`, `src/hooks/*/state-types.ts`,
`src/pages/quote-view/quoteBitrixId.ts`). Nada daqui entra no `tsc`, no ESLint nem no Vitest; para
reativar um arquivo, mova-o de volta com `git mv` junto com os auxiliares que ele importa.
Em `src/pages/seller-carts/` prevaleceu a versão da main nos trechos em conflito (lote B #3368).
