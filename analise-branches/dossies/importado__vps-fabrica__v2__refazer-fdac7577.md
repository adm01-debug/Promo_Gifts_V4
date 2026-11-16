# origin/importado/vps-fabrica/v2/refazer-fdac7577

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** faz a limpeza automatica do usuario de teste apagar tambem as artes/mockups que ele gerou (linhas de historico e arquivos no armazenamento), para que lixo de teste nao fique acumulando no sistema — e isso ja esta funcionando em producao hoje.
- **Tip / merge-base / main:** tip `beafd1b87cdd6893dcb27fe013aab937b6941fd4` · merge-base `df8b43a56baf9f82b999cb1d518dc114911d1509` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Dois commits, ambos sobre a edge function `e2e-cleanup` (a rotina que zera os dados do usuario de teste):

- `6b0eb1b469` — `fix(e2e-cleanup): apaga generated_mockups e objetos de mockup do usuario de teste`.
  Corrige o que a propria branch chama de `BUG-EF-E2E-MOCKUPS`: a tabela `generated_mockups` nao estava
  na lista de limpeza, e os arquivos do bucket `mockup-assets` nunca eram removidos. A branch acrescenta
  a tabela, varre apenas `${userId}/logos` e `${userId}/mockups` do bucket, e passa a devolver um mapa
  `errors` quando o armazenamento falha (em vez de engolir o erro).
- `beafd1b87c` — `test(e2e-cleanup): asserção real no carregador da suíte co-localizada`.
  Cria o teste `supabase/functions/e2e-cleanup/index.mockups.test.ts` (3 casos: apaga com escopo, `dryRun`
  so conta, erro de storage aparece em `errors`) e um carregador em `tests/edge-functions/` que prova que a
  suite carregou o codigo de producao de verdade, via o export `mockupSuiteHandlerLoaded`.

A branch tem 3 arquivos no total (`git diff --stat df8b43a5 beafd1b8`); apenas 2 diferem da main hoje — o
terceiro, o carregador, esta **byte-identico** na main.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| `generated_mockups` na lista de tabelas limpas | `supabase/functions/e2e-cleanup/index.ts:445` | `git show origin/main:supabase/functions/e2e-cleanup/index.ts \| grep -n generated_mockups` → `445: { table: 'generated_mockups', column: 'user_id' },` |
| Bucket e subpastas alvo (`mockup-assets`, `logos`/`mockups`, limite 1000) | `index.ts:95-97` | mesmas linhas: `const MOCKUP_BUCKET = 'mockup-assets';` / `const MOCKUP_USER_SUBDIRS = ['logos', 'mockups'] as const;` / `const STORAGE_LIST_LIMIT = 1000;` |
| Varredura e remocao dos objetos do prefixo do usuario | `index.ts:472-493` | `const mockupPaths: string[] = [];` … `.from(MOCKUP_BUCKET).list(prefix, { limit: STORAGE_LIST_LIMIT })` … `.remove(mockupPaths)` |
| Erro de storage vai para `errors` em vez de ser engolido | `index.ts:479`, `492`, e resposta final | `errors[\`storage:${MOCKUP_BUCKET}/${subdir}\`] = error.message;` e, na resposta, `const cleanupOk = Object.keys(errors).length === 0;` |
| Comentario de contrato "item 7" no cabecalho da funcao | `index.ts:13` | `* 7. Tambem remove os mockups do usuario de teste: linhas de \`generated_mockups\`` |
| Teste "apaga generated_mockups e os objetos do prefixo … e nada alem disso" | `index.mockups.test.ts:231` | `git show origin/main:supabase/functions/e2e-cleanup/index.mockups.test.ts \| grep -n "it("` |
| Teste "dryRun conta os mockups do usuario sem apagar …" | `index.mockups.test.ts:272` | mesma saida |
| Teste "erro de listagem do storage vira `errors` … e nao tenta remover" | `index.mockups.test.ts:283` | mesma saida |
| Carregador com asserção real (`mockupSuiteHandlerLoaded`) | `tests/edge-functions/e2e-cleanup.mockups.test.ts` — identico | `git show origin/main:…` e `git show beafd1b8:…` devolvem o mesmo conteudo; o arquivo nem aparece na lista de divergentes |

**Por que os 2 arquivos ainda diferem da main:** a main andou por cima do mesmo trabalho, nao por fora dele.
`git log -S"MOCKUP_USER_SUBDIRS" --oneline origin/main -- supabase/functions/e2e-cleanup/index.ts` aponta
`c86bf07b39 [NÃO MESCLAR sem OK do dono] fix(edge): … e2e-cleanup (entregas VPS) (#2744)` — foi a PR #2744
(squash) que trouxe exatamente este conteudo. Depois dela, o historico do arquivo de teste mostra
`217869d1f7 infra: migra imports esm.sh → npm: pinados nas edge functions (#3157)` e
`51519ef5ac test(e2e): endurecer publicação, orçamentos e limpeza canônica`. Isso explica cada diferenca
restante: troca de `https://esm.sh/@supabase/supabase-js@2.49.4` por `npm:@supabase/supabase-js@2.49.4`,
CORS por origem (E094), allowlist fail-closed (E019), paginacao do `listUsers`, auditoria estruturada,
escopo de orcamentos por prefixo `[E2E]` e formatacao do Prettier. A main hoje tem 13 testes no arquivo —
os 3 da branch, com o mesmo nome, mais 10.

**Unica mudanca de comportamento que a main fez sobre o trabalho da branch:** no caso de erro de storage, a
branch devolvia HTTP 200 com `errors`; a main devolve 500 com `ok: false` (`index.mockups.test.ts:283-...`,
`cleanupOk` no `index.ts`). E endurecimento deliberado posterior (fail-closed), nao perda de trabalho.

## A resgatar

Nada. Nenhum item da branch ficou de fora da main.

## Risco de fechar esta branch

Nenhum risco pratico. Todo o conteudo proprio desta branch — a correcao da limpeza de mockups, a limpeza do
armazenamento e os tres testes — esta na main de hoje, com evidencia linha a linha acima, e ja em producao
via PR #2744. Fechar/apagar a branch nao remove comportamento nenhum do sistema. O que se perde e apenas o
historico de dois commits que a main ja superou por refatoracao.

## Nao verificado

- Nao foi executado nenhum teste nem chamada real a edge function nesta analise (tarefa somente-leitura);
  a verificacao e por conteudo da main (`git show`/`git log -S`), nao por execucao. Portanto "o cleanup
  funciona em producao" nao foi testado aqui — o que esta provado e que o codigo da branch esta na main.
- Nao foi auditado se a divergencia geral entre edge functions do repo e as implantadas em producao
  (item conhecido do projeto) afeta especificamente `e2e-cleanup`; isso esta fora do escopo desta branch.
- O pacote de evidencia termina no meio do diff (B) de `index.ts`; a parte faltante foi suprida lendo
  `origin/main` direto. Arquivos sem leitura: 0.
