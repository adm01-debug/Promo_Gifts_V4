# origin/claude/feat-crm-vendedor-sem-dono-261115-1622

- **Veredito:** DECISAO_HUMANA  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** faz o vendedor passar a ver, alem da carteira dele, os clientes que ainda nao tem vendedor dono — continuando proibido de editar ou tomar esse cliente para si.
- **Tip / merge-base / main:** tip `7a923ad375975943a8c110e42a935a49256e39f2` · merge-base `ef2a7fa15458f830584c78d83c4ada450b864f7e` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`
- **PR aberta:** [#3683](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3683) — `state: OPEN`, `merged: false` (consulta `github_graphql`, 2026-11-16). Nada desta branch foi mergeado.

## O que a branch quis fazer

Dois commits, com uma unica intencao de negocio por tras.

1. `c187b0db33 feat(crm): vendedor com vínculo vê a carteira dele e os clientes sem dono`
   O proprio corpo do commit se declara uma reversao: *"Decisão do dono de 2026-11-15, que reverte a de
   2026-11-14"*. Na regra de 14/11, o vendedor ve **somente** os clientes em que ele e o dono
   (`vendedor_id = sellerId`). A branch passa a mostrar tambem os clientes **sem dono**
   (`vendedor_id IS NULL`). Tres limites foram mantidos de proposito: vendedor **sem** vinculo no CRM
   continua sem ver nada (sentinela `-1`); papeis amplos nao mudam; fornecedor e transportadora seguem
   sem recorte.
2. `7a923ad375 test(crm): trava que vendedor nao edita nem assume cliente sem dono`
   Nao muda comportamento nenhum: amarra com testes o que **ja vale hoje** — o vendedor nao pode gravar
   nada no CRM, logo nao pode editar nem "assumir" (gravar o proprio nome em) o cliente sem dono. O
   proprio commit explica por que o bloco existe: *"agora que o vendedor VE o cliente sem dono, 'deixa
   ele assumir' e a proxima mudanca tentadora"*.

Alem disso, a branch poe o arquivo de teste de seguranca do CRM dentro do portao `test:ci-core` do
`package.json`, para que ele passe a rodar em todo PR.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Vendedor com vinculo ve carteira **+** clientes sem dono | **NAO ESTA.** A main faz o oposto: filtra so pelo dono. | `git show origin/main:supabase/functions/crm-db-bridge/index.ts` linha 450: `if (scopeFilter) query = query.eq(scopeFilter.column, sellerId ?? -1);` |
| Funcao `sellerScopeOrFilter` (monta o "dele OU sem dono" no formato que o PostgREST aceita em coluna embutida) | **NAO ESTA, e nunca esteve.** | `git grep -n sellerScopeOrFilter origin/main` → vazio; `git log -S"sellerScopeOrFilter" --oneline origin/main` → vazio (o simbolo nunca entrou na historia da main) |
| Teste que trava a querystring do "ou sem dono" nas 4 formas de coluna, com o supabase-js real | **NAO ESTA.** A main tem o teste **contrario**, que proibe exatamente isso. | `git show origin/main:tests/security/crm-db-bridge-ownership.test.ts` linha 109: `it('nenhum escopo "ou sem dono": sem .or( nem is.null no handler'` e linha 103: `it('o handler aplica o escopo com .eq, não com .or'` |
| Vendedor **sem** vinculo continua sem ver nada (sentinela `-1`) | **ESTA**, por outro caminho: a main usa `sellerId ?? -1`, que ja cai em `-1` quando nao ha vendedor. Nao ha divergencia de negocio aqui. | main `index.ts:450` (acima) |
| Fornecedor/transportadora seguem sem recorte | **ESTA.** A branch so reescreveu o comentario da guarda; a regra e identica. | diff (A) do pacote em `query-policy.ts`: a mudanca nas linhas 335-343 e apenas texto de comentario; `\| { kind: 'none' }` nao muda |
| Vendedor nao pode editar nem assumir cliente (comportamento) | **ESTA.** Nenhuma tabela e gravavel por vendedor, entao todo insert/update/delete de papel restrito cai em 403. | main `index.ts:226`: `const VENDOR_WRITE_TABLES: string[] = [];` · `index.ts:1008-1011`: lista `["insert","update","delete"]`, `if (mutatingOperation && restrictedWriter)`, mensagem `Permissao insuficiente para modificar esta tabela` · `handleBatch` (linha 617) usa `buildReadQuery` e nao tem `.insert(`/`.update(`/`.delete(` |
| Os **testes** que travam esse "nao edita, nao assume" | **NAO ESTAO.** O bloco inteiro falta na main. | `git show origin/main:tests/security/crm-db-bridge-ownership.test.ts \| grep "assumir"` → vazio. O bloco esta no diff (A) do pacote: `describe('crm-db-bridge — ver sim, editar e assumir NAO (decisao do dono, 2026-11-15)')` |
| Arquivo de teste de seguranca do CRM dentro do portao de CI | **NAO ESTA.** Nenhum portao da main roda esse arquivo por nome. | `git show origin/main:package.json` nao contem `tests/security/crm-db-bridge-ownership.test.ts`; `git grep -n crm-db-bridge-ownership origin/main -- .github package.json scripts` → vazio. Na main ele so roda no `npm test` completo (`package.json:94`) |

**Nao houve refatoracao nem renomeacao que pudesse esconder o trabalho:** a main nao tocou nenhum desses
arquivos desde o ponto de partida da branch — `git log --oneline ef2a7fa..origin/main -- supabase/functions/crm-db-bridge tests/security/crm-db-bridge-ownership.test.ts` retorna vazio. O diff (B) do pacote
(branch→main) e o inverso exato do diff (A) (merge-base→branch), ou seja: a main de hoje e, nesses
arquivos, identica ao ponto de partida. A branch tem 1 dia (merge-base e tip ambos de 2026-11-15), entao
tambem nao e defasagem.

## A resgatar

Em dois blocos, porque so o primeiro depende de decisao do dono.

**1. Precisa da palavra do dono — "o vendedor ve o cliente sem dono?"**
- `supabase/functions/crm-db-bridge/index.ts` + `supabase/functions/crm-db-bridge/query-policy.ts` —
  a regra nova (`sellerScopeOrFilter` e o ramo `.or(...)` para vendedor com vinculo).
- `tests/security/crm-db-bridge-ownership.test.ts` — o teste que prova a querystring correta nas 4
  formas de coluna, usando o supabase-js de verdade.
  Por que importa: muda **quem ve quais clientes** em producao. E as duas versoes se contradizem no
  papel: a main nao so faz o contrario, ela tem um teste que **proibe** o que a branch faz. Para
  incorporar, alguem tem de derrubar de proposito dois testes de seguranca existentes
  (`origin/main:tests/security/crm-db-bridge-ownership.test.ts:103` e `:109`) — e essa e exatamente a
  trava que foi posta ali para forcar a decisao a voltar ao dono. Sem a decisao registrada, nao se
  mergeia; com a decisao, mergeia-se a PR #3683.

**2. Nao depende de decisao nenhuma — vale resgatar ja (ganho puro, zero mudanca de comportamento)**
- `tests/security/crm-db-bridge-ownership.test.ts` — o bloco `describe('crm-db-bridge — ver sim, editar
  e assumir NAO ...')`, 4 casos.
  Por que importa: ele amarra o que **ja e verdade na main e em producao** (vendedor nao grava no CRM,
  nem para tomar um cliente para si). Verifiquei as 4 assercoes contra o `index.ts` da main de hoje:
  todas passam (`VENDOR_WRITE_TABLES` vazia na linha 226; lista de operacoes e o `if` nas linhas
  1008-1009; mensagem de 403 na linha 1011; `handleBatch` na linha 617 sem nenhuma escrita). Hoje nada
  impede um proximo agente de liberar escrita para vendedor sem que o dono saiba.
- `package.json` — por o arquivo de teste de seguranca do CRM no portao `test:ci-core`.
  Por que importa: essas travas de privacidade de carteira hoje nao sao verificadas em nenhum portao de
  PR da main. Elas so rodam em `npm test` completo, que nao e o portao obrigatorio — ou seja, a regra de
  "quem ve quais clientes" pode ser quebrada por um PR sem nada acender.

## Risco de fechar esta branch

Perde-se a decisao de negocio de 15/11 e as travas que vinham com ela.

1. **A regra fica como a de 14/11:** o vendedor continua vendo somente os clientes em que ele ja e o
   dono. Os clientes sem vendedor ficam invisiveis para quem vende — ninguem os trabalha por falta de
   quem os veja. Se essa foi a decisao do dono, fechar e correto; se nao foi, a decisao de 15/11
   simplesmente nao aconteceu no sistema.
2. **Perde-se a trava do "ver sim, editar nao":** o comportamento seguro continua valendo por sorte, nao
   por contrato. Nenhum teste na main impede um proximo agente de liberar escrita de vendedor no CRM —
   e e precisamente isso que permitiria um vendedor tomar para si um cliente de outro.
3. **Perde-se o unico lugar onde a forma correta da consulta esta documentada e provada.** O "dele OU sem
   dono" em coluna embutida so funciona com o `or` prefixado pelo caminho do embed; o teste da branch
   prova isso com o cliente real. Quem tentar essa regra de novo daqui a um mes vai redescobrir esse
   detalhe errando em producao, com a leitura do CRM quebrando para todo vendedor.

O fechamento tambem apagaria a PR #3683, que e hoje o lugar natural para o dono dar essa resposta.

## Nao verificado

- **Qual das duas regras o dono realmente quer.** Os dois commits afirmam "decisao do dono de 2026-11-15"
  e a main implementa, com teste explicito, a de 2026-11-14. Nao existe no repositorio um registro de
  decisao fora das proprias mensagens de commit que permita dizer qual vence. E isso, e so isso, que
  torna este caso DECISAO_HUMANA.
- **Quantos clientes sem dono existem hoje.** O teste removido da main cita "13.501 clientes sem
  vendedor" (`origin/main:tests/security/crm-db-bridge-ownership.test.ts:111`), mas esse numero vem de um
  comentario, nao de consulta. O CRM fica em banco externo (`pgxfvjmuubtbowutlide`), acessivel so pela
  propria edge function, e nao o consultei.
- **Aviso separado, achado durante esta analise (nao e da branch):** a edge `crm-db-bridge` que esta
  **no ar hoje** nao e nem a versao da main nem a da branch. Ela roda o mecanismo antigo e revogado, que
  descobre o vendedor pelo e-mail a cada requisicao (`resolveCrmUserId`, `crmOwnerScope`,
  `ownerOrExpression` — 1 ocorrencia de cada no codigo publicado; `sellerScopeFilter`,
  `OWNERSHIP_RULES` e `crm_seller_identity_links` tem **zero** ocorrencias, contra 2, 1 e 1 na main).
  Evidencia: leitura da funcao publicada via MCP `get_edge_function` no projeto `doufsxqlfjyuvxuezpln`,
  2026-11-16. Efeito pratico: em producao o vendedor **ja ve** os clientes sem dono hoje, mas pelo
  caminho errado — o que o dono ve no ar nao corresponde a nenhuma das duas decisoes. Isso nao muda o
  veredito desta branch e deve ser tratado no item de divergencia das edges publicadas; mas significa
  que decidir esta PR sem republicar a funcao nao muda nada para o vendedor.
