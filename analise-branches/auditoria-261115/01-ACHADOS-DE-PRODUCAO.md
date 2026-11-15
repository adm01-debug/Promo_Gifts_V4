# Achados de produção da sessão 2026-11-15

Tudo aqui foi medido no banco canônico `doufsxqlfjyuvxuezpln` ou lido em log de
execução real. Nada é suposição; onde não deu para provar, está escrito.

## 1. Pool de conexões a dois terços em repouso — causa das falhas de login

Medido com o sistema ocioso:

| Medida | Valor |
|---|---|
| `max_connections` | 90 |
| Conexões em uso | 60 |
| Ociosas | 49 |
| Só do PostgREST 14.5 | 31, ociosas há ~20 h |

Consequência observada no CI, em `e2e/helpers/auth.ts` (que espera 150 s):

```
+6092ms  POST auth/v1/token          -> 504 (54047ms)
+1340ms  POST functions/v1/get-visitor-info -> 200 (59077ms)
+46141ms GET  rest/v1/system_settings -> 200 (14755ms)
```

O endpoint de autenticação devolveu 504 após 54 s. Com 30 conexões de folga,
um pico esgota o pool e o login é o primeiro a cair. Isso aconteceu em duas PRs
desta sessão (#3665 e #3668) e bloqueou a fila de merge.

**Não é o Playwright matando o teste.** A branch apagada
`claude/fix-auth-setup-e21-261106-0150` propunha elevar o tempo limite global;
descartado, porque o ajudante já espera 150 s e o 504 vem do servidor em 54 s.
Elevar o limite esconderia o problema.

**Ação:** reduzir o tamanho do pool do PostgREST nas configurações do projeto
Supabase, ou aumentar o compute. Não é mudança de código.

## 2. E2E do CI aponta para o banco de PRODUÇÃO

`.github/workflows/deploy-gates.yml:543` usa
`${{ secrets.VITE_SUPABASE_URL || 'https://doufsxqlfjyuvxuezpln.supabase.co' }}`.
Ou seja, o teste automatizado faz login de verdade no sistema dos vendedores em
toda PR. Combinado com o item 1, um teste pode derrubar o login real.

## 3. Refresh das views materializadas falha há dias

`cron.job_run_details`, jobid 234, últimos 7 dias: **145 de 151 execuções** com
duração igual ou maior que 119 s, contra um `statement_timeout` de 120 s.
Em 2026-11-15 foram 8 de 8; em 10, 11 e 12 de novembro, 24 de 24.

A coluna `status` diz `succeeded` porque `fn_cron_safe_run` é `SECURITY DEFINER`
com `EXCEPTION WHEN query_canceled THEN … RETURN`: ele engole o cancelamento.
Quem olhar só o `status` conclui, errado, que está tudo bem.

Correção escrita e não aplicada: migration `20261114120100`.

## 4. Número inflado no recibo do índice do sino de estoque

O recibo de `20261114160000` citava 14.871 chamadas e média de 522 ms. Esses
contadores vinham de uma janela de `pg_stat_statements` resetada em
2026-11-14 16:26 UTC. Medição própria 22,4 h depois do reset: **4.732 chamadas,
média 170,0 ms, máximo 12.163,8 ms, 805 s de CPU acumulada**. O ganho é real,
mas é cerca de 5× menor do que o texto antigo sugeria. Recibo corrigido na #3665.

## 5. Replay de migrations do zero nunca funcionou

Reproduzido num Postgres local: de 3087 arquivos, **977 falham**; 126 relações
ausentes, das quais **76 não são criadas por nenhuma migration**. A primeira
falha é `categories.display_order`, porque
`20250103080000_complete_schema.sql:46` usa `CREATE TABLE IF NOT EXISTS` numa
tabela que já existe, virando no-op: 62 colunas nunca nascem.

Por isso o check `Supabase Preview` é vermelho em toda PR que toca migrations.
O repositório já tem o mecanismo certo para banco novo: o baseline
`supabase/baseline/20261015140000_baseline_schema.sql` com 2884 versões, usado
pelo `db-schema-drift-check`. O caminho barato é o preview partir dele.

## 6. CodeQL declarado obrigatório e não aplicado

`.github/required-checks.json` lista 5 checks como obrigatórios em `main`, com
justificativa escrita. A proteção real exige **um**: `Gate Final - Deploy Ready`.
`Analyze (javascript-typescript)` (CodeQL) e `Compare GitHub × Canonical` rodam
em workflows separados e o Gate Final não os agrega. O arquivo do repositório diz
que o CodeQL existe para "prevenir merge de vulnerabilidades HIGH/CRITICAL"; hoje
não bloqueia nada.

## 7. Três regressões pegas pela revisão antirregressão

| Onde | O que | Situação |
|---|---|---|
| #3665, já mergeada | front passou a chamar RPC que não existe em produção; todo usuário logado via cartão vermelho em `/inteligencia-comercial` | corrigido na #3675 |
| #3670, antes do merge | aviso de erro do catálogo vinha antes da checagem de lista vazia; falha de paginação apagaria a grade carregada | corrigido antes de entrar |
| #3665, rollback | `20261115130200_rollback.sql` devolve `EXECUTE` a `PUBLIC` e `anon` em 106 funções, o oposto da regra que a própria PR codifica em teste | pendente, PR própria |

## 8. Corrida na análise de cor da logo

`src/hooks/simulation/useLogoColorAnalysis.ts` não verifica
`controller.signal.aborted` depois do `await` da edge: a resposta de uma análise
anterior sobrescreve uma mais nova. As cores Pantone resultantes alimentam o PDF
e o pacote de aprovação do cliente. Já estava anotado como pendente em
`tests/components/mockup/acceptance/grupo6.acceptance.test.tsx:7-11` antes desta
sessão. Pendente, PR própria.

## 9. 39 testes do gerador de mockup estavam desligados

Falhavam na `main` por mock incompleto (`useLogoColorAnalysisByArea` ausente da
fábrica `vi.mock`), e ninguém via porque a CI roda só a lista fixa de
`test:ci-core`, que não os incluía. Diagnóstico: 39 de 39 por mock, zero teste
velho, zero bug de produto. Corrigido e incluído na CI na #3672, custo de +6 s.
