# Autoheal ESLint

O workflow `lovable-autoheal.yml` seleciona arquivos TS/TSX adicionados,
modificados ou renomeados no commit em checkout, sob `src/`, `tests/` e `e2e/`.
Delecoes ficam fora. Nomes sao transportados em JSON, sem interpolacao em shell.
Um SHA manual diferente do checkout e recusado para nao analisar arquivos do
commit errado; a ausencia do commit pai tambem falha explicitamente.

O fix e seguido obrigatoriamente de ESLint sem escrita e com zero warnings.
Avisos de arquivos ignorados explicitamente sao suprimidos com `--no-warn-ignored`;
warnings reais continuam bloqueantes com `--max-warnings 0`.
Erros de configuracao, parser ou ocorrencias remanescentes bloqueiam o workflow
antes de anunciar codigo limpo ou abrir PR. TypeScript continua obrigatorio.

Teste: `node --test scripts/autoheal-eslint/run.test.mjs`.
