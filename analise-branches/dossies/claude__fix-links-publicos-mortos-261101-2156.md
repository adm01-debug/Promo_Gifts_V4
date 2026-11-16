# origin/claude/fix-links-publicos-mortos-261101-2156

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** tira do sistema tres paginas de compartilhamento publico que foram desativadas em maio e so restavam como link quebrado (404) e teste de rotina falhando — isso ja esta feito no sistema em producao hoje.
- **Tip / merge-base / main:** tip `79595116ce02a5aef58f23f3269ed38ae363207e` / merge-base `d2033d9237fa72971ff9c92ca47442f7437463ff` / main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Commit unico (`79595116ce`, 01/11/2026, `fix(routes): remove rotas públicas mortas lista/coleção/comparação`).
As rotas publicas `/lista-publica`, `/colecao-publica` e `/comparar-publica` foram descontinuadas em 07/05
junto com os componentes `Share*Dialog`, mas sobraram referencias fantasma em tres lugares:

1. na matriz de permissoes de rotas (`src/lib/rbac/route-matrix.ts`), 3 entradas;
2. no catalogo e nos testes de ponta a ponta (`e2e/routes/_catalog.ts` + 2 arquivos de spec), que por isso
   falhavam no CI (o commit cita CI-002/CI-003 no smoke de E2E);
3. na interface: um icone de "compartilhar" (`Share2`) ainda aparecia na barra lateral de listas de
   favoritos quando a lista tinha `shared_token`, levando o usuario a um link morto.

Mais um ajuste de comentario em `ComparePage.tsx` removendo a mencao a "share publico".
A branch **nao** toca banco, migration, policy nem edge function.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Remover 3 entradas de rota morta (`/lista-publica`, `/colecao-publica`, `/comparar-publica`) da matriz RBAC | ESTA — `src/lib/rbac/route-matrix.ts` da main e **byte a byte identico** ao da branch | `git diff --stat <tip> origin/main -- src/lib/rbac/route-matrix.ts` → saida vazia; `git grep -E "lista-publica\|colecao-publica\|comparar-publica" origin/main -- src` → nenhuma ocorrencia |
| Remover `collection-public` e `comparison-public` do catalogo de rotas E2E | ESTA — `e2e/routes/_catalog.ts:46-51` (main) lista apenas login, reset-password, approve, proposta, kit, dossie | `git show origin/main:e2e/routes/_catalog.ts` linhas 44-54; entrou em `7ae070f5dc fix(e2e): remove rotas públicas mortas colecao/comparar/lista-publica (#2985)` via `git log -S'comparison-public'` |
| Deletar `e2e/routes/public/colecao-publica.spec.ts` | ESTA (arquivo nao existe mais na main) | `git cat-file -e origin/main:e2e/routes/public/colecao-publica.spec.ts` → `fatal: path ... does not exist in 'origin/main'` |
| Deletar `e2e/routes/public/comparar-publica.spec.ts` | ESTA (arquivo nao existe mais na main) | `git cat-file -e origin/main:e2e/routes/public/comparar-publica.spec.ts` → `fatal: path ... does not exist in 'origin/main'` |
| Remover bloco `shared_token` + icone `Share2` + import nao usado de `FavoriteListsSidebar` | ESTA — nenhuma mencao a `Share2` ou `shared_token` no arquivo da main | `git grep -E "Share2\|shared_token" origin/main -- src/components/favorites/FavoriteListsSidebar.tsx` → nenhuma ocorrencia; entrou em `5e59cb9c79 fix: trem de resgates — 16 correções recuperadas de branches de outros agentes (#3660)` via `git log -S'shared_token'` |
| Atualizar comentario de `ComparePage` (sem "share público") | ESTA — `src/pages/products/ComparePage.tsx:4` (main) = `* C2: CRM picker, export, sync, CTA orçamento.` | `git show origin/main:src/pages/products/ComparePage.tsx \| sed -n '1,8p'`; entrou em `5e59cb9c79` (#3660) via `git log -S'share público'` |

As **unicas** diferencas que restam entre a branch e a main nos 3 arquivos que ainda divergem sao cosmeticas
ou sao melhoria propria da main, nao trabalho perdido da branch:

- `e2e/routes/_catalog.ts`: a main tem a linha do `/dossie` com a indentacao de 2 espacos correta; a branch
  havia deixado a linha colada na margem (diff B do pacote: `-{ path: ... }` / `+  { path: ... }`).
- `src/components/favorites/FavoriteListsSidebar.tsx`: a branch deixou uma linha em branco orfa onde ficava
  o bloco removido; a main tambem removeu essa linha (diff B: unica mudanca e `-` de uma linha vazia).
- `src/pages/products/ComparePage.tsx`: a main reescreveu `handleCreateQuote` para passar os itens por
  estado de navegacao (`handoffSource: 'fromCompare'`, lista de itens com preco, cor e quantidade) em vez de
  querystring. Isso e trabalho **mais novo** que a branch nao tem; aplicar a branch hoje regrediria esse
  ganho.

## A resgatar

Nada. Os 6 itens do commit estao na main, com evidencia item por item na tabela acima.

## Risco de fechar esta branch

Praticamente nulo. Tudo o que a branch pedia ja esta valendo em producao: as rotas mortas sairam da matriz
de permissoes e do catalogo de testes, os dois testes obsoletos foram apagados e o icone de compartilhar que
levava a link quebrado nao aparece mais na barra lateral de listas de favoritos. O risco real e o oposto:
**reabrir ou mergear esta branch hoje** desfaria a melhoria mais recente da tela de comparacao (o envio dos
produtos comparados para o orcamento com preco, cor e quantidade) e devolveria dois defeitos de formatacao
que a main ja corrigiu. Nao mexe em banco, migration, permissao de dado nem funcao de servidor, entao nao ha
risco de dado.

## Nao verificado

- Nao foi reexecutado o CI/E2E para confirmar que os erros CI-002/CI-003 citados no commit estao de fato
  resolvidos na main — a verificacao aqui foi so de codigo (as referencias que causavam a falha nao existem
  mais na main). Nenhum comando foi rodado contra o working tree.
- Nao foi aberto o historico da PR original desta branch no GitHub; a atribuicao a `#2985` e `#3660` vem de
  `git log -S` sobre `origin/main`, nao da pagina da PR.
