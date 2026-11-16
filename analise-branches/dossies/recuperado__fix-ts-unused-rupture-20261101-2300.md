# origin/recuperado/fix-ts-unused-rupture-20261101-2300

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Nada que ainda falte — era um conserto tecnico no painel de alertas de ruptura de estoque, e esse conserto ja esta valendo em producao desde 01/11/2026.
- **Tip / merge-base / main:** tip `54b3cf2d9c632dbbfc01d2b986555eed6ff86269` · merge-base `ec06a45724e7b907315d7b454cea63a7a38fdc91` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

A branch tem **um unico commit com conteudo proprio** (`97fdb9ea51`) e dois merges de `main` dentro dela
(`f7c6b9b79c`, `54b3cf2d9c`), que nao carregam trabalho proprio.

Diff proprio total, do merge-base ate o tip:

```
 src/hooks/stock/useRuptureAlerts.ts | 4 ++--
 1 file changed, 2 insertions(+), 2 deletions(-)
```

Pela mensagem do commit, a intencao era eliminar um erro de compilacao TypeScript (`TS2339`, 2
ocorrencias) no arquivo `src/hooks/stock/useRuptureAlerts.ts` — o hook que busca os alertas de ruptura
de estoque. O autor entendeu que o cast estava caindo sobre a `Promise` em vez de sobre o valor
resolvido, e mudou a posicao do parentese para `(await ...) as { data, error }`.

Esse diagnostico partiu de uma leitura **desatualizada do arquivo**: o commit nasceu sobre o blob
`c4327ca203` (`git rev-parse 97fdb9ea51^:src/hooks/stock/useRuptureAlerts.ts` → `c4327ca203...`), que
**ja era a versao corrigida** pela propria main. Ou seja, a branch consertou algo que ja estava
consertado, por outro caminho.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Eliminar o `TS2339` (`data`/`error` inexistentes) em `src/hooks/stock/useRuptureAlerts.ts` | **ESTA** — resolvido pelo commit proprio da main `68d809ccb9` "fix(stock): TS2339 em useRuptureAlerts — precedencia do cast as/await (SB-0003)", de 01/11/2026 20:09, cerca de 3h antes do commit da branch | `git log --oneline origin/main -- src/hooks/stock/useRuptureAlerts.ts` lista `68d809ccb9`; o patch desse commit adiciona exatamente o parentese externo: `- const { data, error } = await (supabase as any)` → `+ const { data, error } = await ((supabase as any)` e `- .limit(MAX_ROWS) as Promise<{...}>;` → `+ .limit(MAX_ROWS) as Promise<{...}>);` |
| O arquivo compila sem erro na main de hoje | **ESTA** — zero erro de tipo no projeto | `npx tsc -p tsconfig.app.json --noEmit` rodado sobre a arvore atual (identica a `origin/main` neste arquivo, conferido com `git diff --quiet origin/main -- src/hooks/stock/useRuptureAlerts.ts` → IDENTICO) terminou com `EXIT=0`, sem nenhuma saida |
| O estilo exato do cast da branch (`(await chain) as {data,error}` em vez de `await (chain as Promise<{data,error}>)`) | **NAO ESTA** — e a unica diferenca que sobrou, e e cosmetica | diff (B) do pacote: a unica mudanca entre branch e main sao os dois parenteses. Cast de TypeScript e apagado na compilacao, entao as duas formas geram **o mesmo codigo executado**; ambas tambem passam no compilador (a da main comprovada pelo `EXIT=0` acima) |
| Banco, policy, migration, edge function | nao se aplica — a branch nao toca nada disso | diff proprio completo = 1 arquivo em `src/hooks/`; nenhum caminho em `supabase/migrations` ou `supabase/functions` |

## A resgatar

Nada. Nao ha item nenhum da branch fora da main, a nao ser a posicao de dois parenteses sem efeito
em comportamento nem em compilacao.

## Risco de fechar esta branch

**Risco praticamente nulo.** Fechar esta branch nao tira nenhuma funcionalidade, nenhuma tela, nenhum
dado e nenhuma correcao do sistema: o problema que ela queria resolver (o painel de alertas de ruptura
nao compilar) ja esta resolvido na producao atual, por um conserto equivalente feito antes dela.

Observacao honesta de criterio: como a branch nao tem conteudo proprio util, o veredito
`FECHAR_SEM_VALOR` seria igualmente defensavel. Escolhi `INCORPORADA_TOTAL` porque o **objetivo** da
branch de fato existe na main hoje, com evidencia item por item. A acao pratica e a mesma nos dois
casos: fechar a branch, sem nada a resgatar.

Alerta de contexto, nao de risco: a branch esta 2123 arquivos atras da main
(`git diff --stat origin/recuperado/fix-ts-unused-rupture-20261101-2300 origin/main` → `2123 files
changed`). Tentar mergear este trabalho hoje seria muito mais caro e arriscado do que o valor zero que
ele traz.

## Nao verificado

- Nada ficou sem leitura: o pacote nao veio truncado e o diff proprio da branch e de 1 arquivo / 4
  linhas, lido por inteiro.
- Nao executei a tela de alertas de ruptura no navegador para observar o comportamento em producao;
  isso nao foi necessario porque a mudanca e exclusivamente de tipagem (apagada na compilacao) e o
  compilador da arvore atual passou limpo.
