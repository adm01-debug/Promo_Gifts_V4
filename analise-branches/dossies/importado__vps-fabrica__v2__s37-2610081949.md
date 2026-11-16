# origin/importado/vps-fabrica/v2/s37-2610081949

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** permite que, ao atender um cliente, o sistema liste os mockups (artes de produto) ja salvos daquele cliente para serem anexados — e isso ja esta funcionando na producao de hoje.
- **Tip / merge-base / main:** tip `c10ea465f3dd53dbd9780b545936386e94615e0c` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Commit unico `c10ea465f3` — "feat(mockup): servico de mockups do cliente (consulta por client_id do CRM)".
Pela mensagem e pelo codigo, o agente quis entregar **o servico de leitura** (um hook React) que:

1. lista os mockups salvos de um cliente do CRM consultando a tabela `generated_mockups` por `client_id`;
2. ignora os itens na lixeira (`deleted_at`), coluna que ainda nao existia no schema — por isso `select('*')` + filtro no cliente;
3. ordena do mais novo para o mais antigo (`created_at` DESC);
4. devolve o caminho do arquivo no bucket `mockup-assets` (para depois gravar em `quote_items.mockup_urls`) mais uma miniatura assinada de curta duracao;
5. sem `client_id`, devolve lista vazia sem nem consultar o banco.

A branch mexeu em **exatamente 2 arquivos**, ambos novos, nenhum deles de banco/edge/infra:

```
$ git diff --stat c194982c5f1f32234b769c00bc4e0703e8450a1d c10ea465f3dd53dbd9780b545936386e94615e0c
 .../mockup/__tests__/useClientMockups.test.ts      | 239 +++++++++++++++++++++
 src/hooks/mockup/useClientMockups.ts               | 138 ++++++++++++
 2 files changed, 377 insertions(+)
```

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Arquivo do hook `src/hooks/mockup/useClientMockups.ts` | **Esta** na main | `git cat-file -e e4ab7f85d9:src/hooks/mockup/useClientMockups.ts` → OK |
| Testes `src/hooks/mockup/__tests__/useClientMockups.test.ts` (239 linhas) | **Esta na main, byte a byte igual ao da branch** | `git diff c10ea465f3 e4ab7f85d9 -- src/hooks/mockup/__tests__/useClientMockups.test.ts` → saida **vazia** |
| Consulta a `generated_mockups` por `client_id`, com `order created_at desc` e `limit` | **Esta** | `fetchClientMockups` em main `src/hooks/mockup/useClientMockups.ts:108`; corpo da funcao identico ao da branch (nao aparece no diff branch→main) |
| Filtro de lixeira `deleted_at` (`isMockupTrashed`) | **Esta** | main `src/hooks/mockup/useClientMockups.ts:58` |
| Ordenacao defensiva `sortMockupsByCreatedAtDesc` | **Esta** | main `src/hooks/mockup/useClientMockups.ts:63` |
| Extracao do caminho no bucket `extractMockupStoragePath` | **Esta** | main `src/hooks/mockup/useClientMockups.ts:72` |
| Constantes `MOCKUP_BUCKET` / `MOCKUP_THUMBNAIL_TTL_SECONDS` / `DEFAULT_CLIENT_MOCKUPS_LIMIT` | **Esta** | main `src/hooks/mockup/useClientMockups.ts:22-24` |
| Miniatura assinada best-effort (`signMockupThumbnail`, nao derruba a lista se falhar) | **Esta** | nao aparece no diff branch→main, logo identico na main |
| Sem `client_id` → lista vazia sem consultar o banco | **Esta** | nao aparece no diff branch→main, logo identico na main |
| Hook `useClientMockups` exportado | **Esta, e evoluido** | main `:143`; a main **acrescentou** `user?.id` na chave de cache (`:150`) e `refetchOnMount: 'always'` (`:153`) |

O diff `branch → main` desse unico arquivo tem **somente 2 hunks e nenhuma logica removida**: a main importa `useAuth`, poe o id do usuario na chave do cache e forca refetch ao abrir o painel. Ou seja, a main e **superconjunto** do que a branch escreveu — inclusive com duas correcoes de seguranca/frescor que a branch nao tinha (sem o usuario na chave, trocar de conta sem recarregar a pagina mostraria por ate 5 minutos os mockups e as URLs assinadas da conta anterior).

Alem de ter o codigo, a main **ligou o servico ponta a ponta**, o que a branch nao fez:

- `src/pages/mockups/mockup-generator/ClientMockupsMenu.tsx:87` → `const query = useClientMockups(clientId, { limit: CLIENT_MOCKUPS_MENU_LIMIT });`
- testes de tela: `src/pages/mockups/mockup-generator/__tests__/ClientMockupsMenu.test.tsx` e `.../MockupToolbar.header.test.tsx`
- entrou pela PR #3664, commit `7307f53346` (2026-11-15), "feat(mockup): cabecalho de trabalho do gerador, Meus mockups do cliente e captura de layout extraida"
  (`git log -S"fetchClientMockups" --oneline e4ab7f85d9 -- src/hooks/mockup/useClientMockups.ts`)

## A resgatar

Nada. Nenhum item da branch ficou de fora da main.

Observacao que **nao** e item a resgatar: a mensagem do commit diz que o servico era "para o modulo de orcamentos anexar" (`quote_items.mockup_urls`). Hoje a main consome o hook no gerador de mockups ("Meus mockups do cliente"), nao na tela de orcamentos. Isso nao e trabalho perdido desta branch — a branch nunca escreveu nenhuma linha de orcamento (so os 2 arquivos acima). Se a tela de orcamentos precisa desse anexo, e trabalho novo, nao resgate.

## Risco de fechar esta branch

Praticamente nulo. Tudo que a branch produziu ja esta na producao de hoje, com a mesma logica mais duas melhorias. Fechar a branch nao tira nenhuma funcionalidade do ar e nao perde nenhum teste.

Unico cuidado: a branch **nao deve ser mergeada**. Se alguem tentar aplica-la sobre a main, o arquivo da branch e mais antigo e **desfaria** as duas protecoes que a main ja tem (separacao de cache por usuario logado e atualizacao da lista ao abrir o painel) — o que poderia fazer um usuario ver, por alguns minutos, os mockups do cliente atendido pela conta anterior naquele mesmo navegador. O caminho certo e fechar/apagar a branch, nao mergear.

## Nao verificado

- Nao executei `npm test`, lint ou build (a tarefa e somente leitura do git); a afirmacao de que os testes passam na main nao foi verificada por execucao — apenas que o arquivo de teste da branch existe na main identico.
- Nao verifiquei no banco de producao se a coluna `deleted_at` de `generated_mockups` ja foi criada (a branch tratava isso como proposta futura). Irrelevante para o veredito: o codigo funciona antes e depois da migration, e e o mesmo codigo nos dois lados.
- Nao existe PR identificada desta branch no GitHub (nao consultei a API); a rastreabilidade usada foi o commit `7307f53346` / PR #3664 que trouxe o mesmo conteudo para a main.
