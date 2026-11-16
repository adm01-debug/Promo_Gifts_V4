# origin/importado/vps-fabrica/v2/n64-2610082251

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** faz o orcamento listar os mockups ja salvos do cliente (sem os que foram para a lixeira, do mais novo para o mais antigo) para anexar, e deixa isso coberto por teste automatico — ja esta funcionando em producao.
- **Tip / merge-base / main:** tip `c2aa9a225cb99b0efa6eb99b8c606e97eb1745f5` · merge-base `4cf61adaee399733236be7a418b54ae5a154cf9f` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Unico commit proprio: `c2aa9a225c — test(mockup): cobre casos de borda do servico de mockups do cliente (lixeira, pagina de 500, erro)`.

Contra o merge-base a branch entregou exatamente 2 arquivos (`git diff --stat 4cf61adaee c2aa9a225c`):

| arquivo | linhas |
| --- | --- |
| `src/hooks/mockup/useClientMockups.ts` | +138 (arquivo novo) |
| `tests/hooks/useClientMockups.edge.test.ts` | +260 (arquivo novo) |

Intencao, lida do cabecalho do proprio hook (`src/hooks/mockup/useClientMockups.ts:1-14`): "Lista os mockups salvos de um cliente do CRM (Singu) para o modulo de orcamentos anexar (plano Mockup etapa 37)". Contrato declarado: consulta `generated_mockups` por `client_id`, ignora itens com `deleted_at` (lixeira), ordena por `created_at` DESC, devolve o caminho no bucket `mockup-assets` + miniatura assinada de curta duracao, e sem `client_id` devolve `[]` sem erro. O teste de borda cobre: cliente ausente/em branco, lixeira (inclusive cliente inteiro na lixeira e coluna ainda inexistente), empate e data invalida na ordenacao, cliente com 500 mockups (pagina de 200, nao varredura) e erro do banco que nao pode virar lista vazia.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Hook `useClientMockups` (arquivo inteiro, 138 linhas) | `src/hooks/mockup/useClientMockups.ts` | `git log -S"useClientMockups" --oneline e4ab7f85d9 -- src/hooks/mockup/useClientMockups.ts` → `7307f53346 feat(mockup): cabecalho de trabalho do gerador, Meus mockups do cliente e captura de layout extraida (#3664)` |
| Teste de borda (260 linhas) | `tests/hooks/useClientMockups.edge.test.ts`, **byte a byte igual** ao da branch | `git diff c2aa9a225c e4ab7f85d9 -- tests/hooks/useClientMockups.edge.test.ts` → saida vazia; `git log --oneline e4ab7f85d9 -- tests/hooks/useClientMockups.edge.test.ts` → `7307f53346 ... (#3664)` |
| `fetchClientMockups` (filtro por `client_id`, teto de pagina 200, erro propagado) | presente, identico | diff (B) do pacote nao toca essa funcao; os unicos blocos alterados sao o `import` e o corpo de `useClientMockups` |
| `isMockupTrashed` / lixeira por `deleted_at` | presente, identico | diff (B) do pacote nao toca a funcao; usada em `src/hooks/mockup/__tests__/useClientMockups.test.ts:121-124` |
| `sortMockupsByCreatedAtDesc` (DESC, sem mutar, data invalida no fim) | presente, identico | diff (B) nao toca; `src/hooks/mockup/__tests__/useClientMockups.test.ts:127-134` |
| `extractMockupStoragePath` (caminho do bucket `mockup-assets`) | presente, identico | diff (B) nao toca; `src/hooks/mockup/__tests__/useClientMockups.test.ts:109-117` |
| `MOCKUP_BUCKET`, `MOCKUP_THUMBNAIL_TTL_SECONDS`, `DEFAULT_CLIENT_MOCKUPS_LIMIT` + miniatura assinada best-effort | presentes, identicos | diff (B) nao toca essas linhas |
| Uso real na tela (o hook nao ficou orfao) | `src/pages/mockups/mockup-generator/ClientMockupsMenu.tsx:87` → `const query = useClientMockups(clientId, { limit: CLIENT_MOCKUPS_MENU_LIMIT });` | `git grep -n "useClientMockups" e4ab7f85d9 -- src` |

**Unica diferenca da main hoje (diff B), e ela e a main indo ADIANTE, nao a branch ficando de fora:** a main acrescentou `import { useAuth }`, colocou `user?.id` na chave de cache (`queryKey: ['client-mockups', user?.id ?? null, clientId ?? null, limit]`) e `refetchOnMount: 'always'`, com comentario explicando que sem o usuario na chave trocar de conta sem recarregar a pagina devolveria mockups e URLs assinadas da conta anterior. Nada da branch foi removido: a versao da main e a da branch **mais** esses dois ajustes.

Conferi tambem que a adicao da main nao quebra o teste da branch: `useAuth` tem fallback seguro fora do provider (`src/contexts/AuthContext.tsx:557-565`), e o teste de borda nao faz assercao sobre a `queryKey` (`grep -n "queryKey" tests/hooks/useClientMockups.edge.test.ts` → nenhuma ocorrencia).

## A resgatar

Nada. Os 2 arquivos que a branch criou estao na main; o de teste e identico e o hook esta presente com melhoria posterior da main por cima.

## Risco de fechar esta branch

Nenhum risco pratico. Fechar esta branch nao remove nada de producao: o recurso "Meus mockups do cliente" ja foi para a main pela PR #3664 (commit `7307f53346`) e esta ligado a tela do gerador de mockups. A unica coisa que a branch guarda de diferente e uma versao mais ANTIGA do mesmo arquivo, sem a protecao de troca de conta que a main ja tem — ou seja, aproveitar algo dali seria piorar, nao melhorar.

## Nao verificado

- Nao executei `npm test` / `npm run qa:typecheck` nesta sessao (a tarefa e somente leitura), portanto "os testes passam na main hoje" fica como NAO VERIFICADO; o que esta verificado e que o arquivo de teste da branch existe na main identico e que a mudanca da main nao contradiz nenhuma assercao dele.
- Nao avaliei se a coluna `deleted_at` em `generated_mockups` ja foi aplicada em producao (a branch a trata como proposta e filtra no cliente). Isso nao altera o veredito: a branch nao traz migration.
