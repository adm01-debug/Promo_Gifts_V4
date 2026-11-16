# origin/importado/vps-fabrica/v2/refazer-cab127be

- **Veredito:** INCORPORADA_TOTAL  ·  **Confiança:** alta
- **O que isso faz pelo negócio:** garante que a limpeza automática do usuário de teste apague também o histórico e as imagens de mockup dele, para que lixo de teste não fique acumulando no sistema nem nas pastas de arquivos.
- **Tip / merge-base / main:** tip `bb9d65409e0ee90e92adffa8a47661635ab84e47` · merge-base `8491f623efb9d4aef08092764622dee49966ae65` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Dois commits, ambos sobre a edge function `e2e-cleanup` (a rotina que zera os dados do usuário de teste):

- `9389b52a3f` — `fix(e2e-cleanup): apaga generated_mockups e objetos de mockup do usuario de teste`.
  Corrige o bug anotado no próprio código como `BUG-EF-E2E-MOCKUPS`: a tabela `generated_mockups`
  não estava na lista de limpeza e os arquivos do bucket `mockup-assets` nunca eram removidos.
  Adiciona o apagamento das linhas (filtrado por `user_id`) e dos objetos sob o prefixo
  `${userId}/logos` e `${userId}/mockups`, mais um campo `errors` na resposta para falha de storage.
- `bb9d65409e` — `test(e2e-cleanup): asserção real no carregador da suíte co-localizada`.
  Cria o teste co-localizado `index.mockups.test.ts` (prova que apaga só o que é do usuário de
  teste e nada de outro usuário; que `dryRun` só conta; que erro de storage aparece em `errors`)
  e um carregador em `tests/edge-functions/` que só passa se o código de produção real tiver sido
  carregado — isto é, nada de teste falso-verde.

A branch mexeu em 3 arquivos no total (`git diff --stat 8491f623 bb9d6540`): os dois listados como
divergentes mais `tests/edge-functions/e2e-cleanup.mockups.test.ts`.

## Item por item: está na main?

| item | onde está na main (ou NÃO ESTÁ) | evidência |
|---|---|---|
| `generated_mockups` na lista de tabelas limpas | está | `supabase/functions/e2e-cleanup/index.ts:445` da main: `{ table: 'generated_mockups', column: 'user_id' }` |
| Constantes de escopo do bucket (`MOCKUP_BUCKET`, `MOCKUP_USER_SUBDIRS`, `STORAGE_LIST_LIMIT`) | está | main `index.ts:95-97`, com o mesmo comentário explicativo da branch |
| Listagem restrita a `${userId}/logos` e `${userId}/mockups` | está | main `index.ts:473-477`: `for (const subdir of MOCKUP_USER_SUBDIRS)` → `.from(MOCKUP_BUCKET).list(prefix, { limit: STORAGE_LIST_LIMIT })` |
| Remoção dos objetos de mockup + contagem em `dryRun` | está | main `index.ts:489-493`: `.remove(mockupPaths)`, `deleted[\`storage:${MOCKUP_BUCKET}\`]` |
| Erro de storage reportado em `errors`, não engolido | está, e mais forte | main `index.ts:479` grava `errors[\`storage:${MOCKUP_BUCKET}/${subdir}\`]`; main `index.ts:498-534` passou a devolver HTTP 500 com `ok: false` quando há erro (a branch devolvia 200) |
| Item 7 do cabeçalho documentando o comportamento | está | main `index.ts:13`: `7. Tambem remove os mockups do usuario de teste: linhas de 'generated_mockups'…` |
| Suíte co-localizada `index.mockups.test.ts` | está | arquivo existe na main; os 3 testes da branch estão lá com o mesmo nome (`index.mockups.test.ts:231`, `:272`, `:283`), mais 9 testes adicionais criados depois |
| Export `mockupSuiteHandlerLoaded` (anti falso-verde) | está | main `supabase/functions/e2e-cleanup/index.mockups.test.ts:81` |
| Carregador com asserção real em `tests/edge-functions/` | está, byte a byte | `git diff --stat bb9d6540 origin/main -- tests/edge-functions/e2e-cleanup.mockups.test.ts` → saída vazia; main `tests/edge-functions/e2e-cleanup.mockups.test.ts:11`: `expect(mockupSuiteHandlerLoaded).toBe(true)` |

Por onde entrou: `git log origin/main -- supabase/functions/e2e-cleanup/index.mockups.test.ts` mostra
`c86bf07b39` (2026-11-01, PR #2744, "entregas VPS") como o commit que trouxe os três arquivos. Depois
disso a main continuou evoluindo o mesmo código: `217869d1f7` (#3157) trocou os imports `esm.sh` por
`npm:` pinados — é essa a origem da diferença na linha `vi.mock(...)` — e `51519ef5ac` (2026-11-08)
endureceu a função (falha fechada na auditoria e no rate limiter, paginação na busca do usuário,
escopo `quotes-prefix`, CORS por origem).

Conclusão: os dois arquivos que "diferem" diferem porque a main andou **para frente** por cima do
trabalho desta branch, não porque o trabalho tenha ficado de fora.

## A resgatar

Nada. Nenhum item da branch está ausente da main.

Observação sem ação necessária: a única divergência de comportamento é que a branch considerava
sucesso (HTTP 200) uma limpeza em que o storage falhou, e a main passou a considerar falha
(HTTP 500, `ok: false`, auditoria com `reason: 'partial_cleanup_error'`). A versão da main é a mais
segura; a da branch é a mais antiga. Não é escolha de negócio, é correção posterior.

## Risco de fechar esta branch

Nenhum risco prático. Tudo o que a branch entregou — a limpeza do histórico de mockups, a remoção
dos arquivos do usuário de teste, o escopo que nunca toca pastas de outro usuário e os testes que
provam isso — já está rodando na main e continuou sendo melhorado lá. Fechar a branch não apaga
nenhum comportamento do sistema.

## Não verificado

- Não foi executado nenhum teste nem comando de build nesta análise (a tarefa é somente leitura):
  a afirmação de que a suíte passa na main hoje é NÃO VERIFICADO; o que está verificado é que o
  código e os testes da branch existem na main, por leitura dos arquivos em `origin/main`.
- O pacote de evidência termina no meio do diff (B) de `index.ts` (fim do arquivo em 973 linhas). A
  parte faltante foi coberta lendo `origin/main:supabase/functions/e2e-cleanup/index.ts` direto. Nenhum
  arquivo ficou sem leitura.
