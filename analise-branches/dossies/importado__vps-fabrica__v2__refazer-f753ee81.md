# origin/importado/vps-fabrica/v2/refazer-f753ee81

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** garante, por teste automatico, que o menu "Meus mockups do cliente" sempre mostre os mockups certos daquele cliente — sem trazer os que foram para a lixeira, com os mais novos primeiro, e mostrando erro em vez de uma lista vazia enganosa quando o banco falha.
- **Tip / merge-base / main:** tip `b3abcee7501e89606e398468633d79ad48a5230a` · merge-base `a3d86a725bbf17194501f83da0aa97a61ff5aceb` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit, `b3abcee750` ("Fabrica Hermes 2026-10-13"), com a mensagem
`test(mockup): cobre casos de borda do servico de mockups do cliente (lixeira, pagina de 500, erro)`.

A branch adicionou **dois arquivos novos** (nenhuma linha removida, nenhum arquivo alterado) —
`git diff --name-status a3d86a72 b3abcee750`:

| | arquivo | linhas |
|---|---|---|
| A | `src/hooks/mockup/useClientMockups.ts` | +138 |
| A | `tests/hooks/useClientMockups.edge.test.ts` | +260 |

Intencao, lida do cabecalho do proprio teste (`tests/hooks/useClientMockups.edge.test.ts:1-11`):
e o **cartao de borda `t_f753ee81`, filho do cartao de implementacao `t_f5f7f446`** (plano Mockup
etapa 37). O caminho feliz vem do cartao pai (`src/hooks/mockup/__tests__/useClientMockups.test.ts`);
esta branch cobre os limites: cliente ausente/em branco, lixeira (`deleted_at`) inclusive
pre-migration, ordenacao com empate e data invalida, cliente com 500 mockups (paginacao, nao
varredura) e falha de consulta. O arquivo de hook veio junto porque, no ponto de partida da branch,
ele ainda nao existia — era o codigo sob teste.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Teste de borda com os 10 casos (`tests/hooks/useClientMockups.edge.test.ts`, 260 linhas) | **ESTA, byte a byte identico** | `git rev-parse b3abcee750:tests/hooks/useClientMockups.edge.test.ts` e `e4ab7f85:<mesmo caminho>` devolvem **o mesmo blob `e9521f31704d40ad1256ce1d5c39ad7095e64277`**; `git diff b3abcee750 e4ab7f85 -- tests/hooks/useClientMockups.edge.test.ts` sai vazio |
| Hook/servico `useClientMockups.ts` (138 linhas) | **ESTA, e a main acrescentou melhorias** — nenhuma linha da branch foi perdida | o diff branch→main desse arquivo tem **apenas dois trechos de adicao** (import de `useAuth`, comentario, `user?.id` na chave do cache, `refetchOnMount`), zero remocoes — ver `src/hooks/mockup/useClientMockups.ts:150` e `:153` na main |
| `MOCKUP_BUCKET`, `MOCKUP_THUMBNAIL_TTL_SECONDS`, `DEFAULT_CLIENT_MOCKUPS_LIMIT` | ESTA | `src/hooks/mockup/useClientMockups.ts:22` em diante |
| `isMockupTrashed` (filtro de lixeira) | ESTA | `src/hooks/mockup/useClientMockups.ts:58` |
| `sortMockupsByCreatedAtDesc` (mais recente primeiro) | ESTA | `src/hooks/mockup/useClientMockups.ts:63` |
| `extractMockupStoragePath` (caminho no bucket `mockup-assets`) | ESTA | `src/hooks/mockup/useClientMockups.ts:72` |
| `fetchClientMockups` (consulta por `client_id`, limite de pagina, erro propagado) | ESTA | `src/hooks/mockup/useClientMockups.ts:108` |
| `useClientMockups` (hook React) | ESTA, **e ligado ponta a ponta na tela** | `src/hooks/mockup/useClientMockups.ts:143`; consumido em `src/pages/mockups/mockup-generator/ClientMockupsMenu.tsx:17` e `:87` |
| Quando os dois arquivos entraram na main | PR **#3664**, squash-merge `7307f53346`, 2026-11-15 | `git log e4ab7f85 -- <cada arquivo>` devolve so `7307f53346 feat(mockup): cabecalho de trabalho do gerador, Meus mockups do cliente e captura de layout extraida (#3664)` para ambos |
| O teste da branch realmente passa contra o codigo de **hoje** da main | SIM — 10/10 | os dois arquivos na arvore de trabalho sao o blob identico ao da main (`git hash-object` = `git rev-parse e4ab7f85:<arquivo>`); `npx vitest run tests/hooks/useClientMockups.edge.test.ts` → `Test Files 1 passed (1) · Tests 10 passed (10)` |

Por que a main difere e isso **nao** e trabalho perdido: a main evoluiu o mesmo hook depois do
merge, somando duas protecoes que a branch nao tinha — o ID do usuario logado entra na chave do
cache (trocar de conta sem recarregar a pagina nao mostra mais os mockups da conta anterior) e
`refetchOnMount: 'always'` (um mockup recem-salvo aparece na hora, sem esperar 5 minutos). Sao
adicoes por cima do que a branch escreveu, nao substituicoes.

Risco que eu verifiquei de proposito, por ser o unico jeito desse "ja esta na main" esconder um
defeito: a main passou a chamar `useAuth()` dentro do hook, mas o teste de borda — identico — nao
simula o `AuthProvider`. Nao quebra: `useAuth` devolve `FALLBACK_AUTH` fora do provider
(`src/contexts/AuthContext.tsx:557-568`), e a execucao dos 10 testes confirma.

## A resgatar

Nada. Os dois arquivos da branch estao na main: o teste identico, o hook como superconjunto.

## Risco de fechar esta branch

Nenhum risco pratico. Tudo o que a branch produziu ja esta em producao e protegido por teste que
roda verde contra o codigo atual. Fechar a branch nao remove nada do sistema, nao altera banco,
nao altera tela e nao desliga teste nenhum: `tests/hooks/useClientMockups.edge.test.ts` continua
na main, na suite, cobrindo os mesmos 10 casos. O unico efeito de manter a branch aberta e ruido
na lista de branches.

## Nao verificado

- Nao executei a suite inteira nem o typecheck do repo: irrelevante para este veredito, porque a
  branch nao altera nenhum arquivo que a main ja tivesse (so acrescenta dois arquivos novos que
  hoje ja estao na main).
- Nao abri a PR #3664 no GitHub para confirmar que foi esta branch a origem do squash. Isso nao
  muda nada: o conteudo esta provado por blob identico e por teste executado, que e evidencia mais
  forte do que a autoria do merge.
- Arquivos sem leitura por truncamento do pacote: zero (o pacote trouxe os dois diffs completos do
  unico arquivo que difere, e eu li o segundo arquivo direto do git).
