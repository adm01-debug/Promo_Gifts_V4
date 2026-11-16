# origin/importado/vps-fabrica/v2/refazer-f5f7f446

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** permite que o orcamento mostre e anexe os mockups ja aprovados daquele cliente, em vez de a pessoa procurar o arquivo na mao — e isso **ja esta no ar**.
- **Tip / merge-base / main:** tip `08378cd7c826b5212df653acfc287e905ce73205` · merge-base `4cf61adaee399733236be7a418b54ae5a154cf9f` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Commit unico `08378cd7c8` — "feat(mockup): servico de mockups do cliente (consulta por client_id do CRM)".
A mensagem diz que e o reaproveitamento de uma entrega anterior (`t_f5f7f446`, branch `v2/s37-2610081949`)
que havia sido recusada por timeout de um guarda de CI (`ratchet_indexed_access`), **nao por problema no codigo**.

Entrega pretendida (etapa 37 do plano Mockup; decisoes Q4/Q22): um servico/hook que lista os mockups
salvos de um cliente do CRM (Singu) para o modulo de orcamentos anexar. Contrato declarado:
consulta `generated_mockups` por `client_id`, ignora itens na lixeira (`deleted_at`), ordena por
`created_at` DESC, devolve o caminho no bucket `mockup-assets` (para `quote_items.mockup_urls`) mais
uma miniatura assinada de curta duracao, e sem `client_id` devolve lista vazia sem consultar o banco.

A branch tocou **2 arquivos**, os dois novos (`git diff --name-status 4cf61ada 08378cd7`):

- `A src/hooks/mockup/useClientMockups.ts` (138 linhas)
- `A src/hooks/mockup/__tests__/useClientMockups.test.ts`

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Arquivo `src/hooks/mockup/useClientMockups.ts` | Na main, com o mesmo conteudo + 2 melhorias da main | `git diff --numstat 08378cd7 origin/main -- src/hooks/mockup/useClientMockups.ts` → `19 2` (main so adiciona; nenhuma linha de logica da branch removida) |
| Arquivo de teste `src/hooks/mockup/__tests__/useClientMockups.test.ts` | Na main, **byte-identico** ao da branch | `git diff --stat 08378cd7 origin/main -- src/hooks/mockup/__tests__/useClientMockups.test.ts` → saida vazia |
| `fetchClientMockups` (consulta por `client_id`, `select('*')` via `untypedFrom`, `.limit`) | main, `src/hooks/mockup/useClientMockups.ts:108` | `git show origin/main:src/hooks/mockup/useClientMockups.ts \| grep -c fetchClientMockups` → 2 |
| `useClientMockups` (react-query, `staleTime` 5 min) | main, `src/hooks/mockup/useClientMockups.ts:143` | idem, `grep -c useClientMockups` → 3 |
| `isMockupTrashed` (ignora lixeira `deleted_at`) | main, `useClientMockups.ts:58` | `grep -c isMockupTrashed` → 2 |
| `sortMockupsByCreatedAtDesc` (ordem `created_at` DESC) | main, `useClientMockups.ts:63` | `grep -c sortMockupsByCreatedAtDesc` → 2 |
| `extractMockupStoragePath` (caminho no bucket, para `quote_items.mockup_urls`) | main | `grep -c extractMockupStoragePath` → 2 |
| Constantes `MOCKUP_BUCKET`, `MOCKUP_THUMBNAIL_TTL_SECONDS`, `DEFAULT_CLIENT_MOCKUPS_LIMIT` (miniatura assinada de curta duracao) | main | `grep -c` → 2 / 2 / 3 |
| Tipos exportados `ClientMockup`, `FetchClientMockupsOptions`, `UseClientMockupsOptions` | main | `grep -c` → 14 / 2 / 2 |
| Sem `client_id` devolve `[]` sem consultar o banco | main, coberto por teste | `tests/hooks/useClientMockups.edge.test.ts:152` `expect(await fetchClientMockups(vazio)).toEqual([])` |
| Uso ponta a ponta (a intencao da branch de fato virou tela) | main, **alem** do que a branch entregou: painel de UI + barra do gerador + testes | `src/pages/mockups/mockup-generator/ClientMockupsMenu.tsx:17` e `:87` (`useClientMockups(clientId, { limit: CLIENT_MOCKUPS_MENU_LIMIT })`); `src/pages/mockups/mockup-generator/__tests__/MockupToolbar.header.test.tsx:29`; `tests/hooks/useClientMockups.edge.test.ts` |
| Como entrou | Squash-merge da PR #3664 | `git log -S"fetchClientMockups" --oneline origin/main -- src/hooks/mockup/useClientMockups.ts` → `7307f53346 feat(mockup): cabecalho de trabalho do gerador, Meus mockups do cliente e captura de layout extraida (#3664)`, de 2026-11-15 |

### O que a main tem que a branch nao tinha (main esta na frente, nao atras)

Diff (B) do pacote, bloco em `useClientMockups`:

- `queryKey: ['client-mockups', user?.id ?? null, clientId ?? null, limit]` + `import { useAuth } from '@/contexts/AuthContext'` — correcao de **vazamento entre contas**: sem o usuario na chave do cache, trocar de conta sem recarregar a pagina mostraria por ate 5 minutos os mockups e as URLs assinadas da conta anterior.
- `refetchOnMount: 'always'` — mockup recem-salvo ou recem-excluido aparece na hora, sem esperar os 5 minutos de cache.

Ou seja: a versao da main e **superior** a da branch. Levar a branch de volta seria regressao de seguranca.

## A resgatar

Nada. Os 2 arquivos da branch estao na main (um identico, o outro com acrescimos da main), e todos os
simbolos exportados foram conferidos um por um na main.

## Risco de fechar esta branch

Praticamente nulo. A funcionalidade que essa branch queria entregar — "Meus mockups do cliente" no
gerador de mockups — ja esta na producao desde a PR #3664 (15/11/2026), com tela, testes e uma correcao
de privacidade que a branch nao tinha. Fechar a branch nao tira nada do ar e nao perde codigo.
Unico efeito de manter aberta: ruido para os proximos agentes e risco de alguem reintroduzir a versao
antiga do hook, que vaza mockups entre contas na troca de usuario.

## Nao verificado

- Nao executei `npm test` / `npm run qa:typecheck` nesta sessao (a tarefa e somente leitura); a afirmacao de que os testes passam na main nao foi medida — apenas que os arquivos de teste existem na main e cobrem o contrato.
- Nao conferi o comportamento no navegador (bucket `mockup-assets` privado, etapa 9, e coluna `deleted_at` da etapa 6 seguem como PROPOSTA segundo o proprio comentario do arquivo em `src/hooks/mockup/useClientMockups.ts:10-13`).
- Arquivos sem leitura por truncamento: 0 (o pacote nao veio truncado; 1 arquivo diferente, lido integralmente nos dois sentidos).
