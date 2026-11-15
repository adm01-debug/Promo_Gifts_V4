# 2026-11-14 — schema `net` estava exposto na API pública (corrigido)

## O que estava acontecendo

A API pública do projeto (`/rest/v1/`, a mesma que o site usa com a chave publicável que está no
navegador de qualquer visitante) atendia o schema interno **`net`**. Esse schema é do `pg_net`, a
extensão que o banco usa para fazer chamadas HTTP. Ele tem duas tabelas:

- `net._http_response` — as **respostas** de todas as chamadas HTTP que o banco faz
- `net.http_request_queue` — as **requisições** que o banco vai disparar, com os cabeçalhos

Qualquer pessoa com a chave publicável podia ler as duas. Confirmado com requisição real em
2026-11-14, antes da correção:

```
GET /rest/v1/_http_response?select=*&limit=1
    apikey: <chave publicável>
    Accept-Profile: net
→ HTTP 200, com conteúdo
```

E o ACL mostrava que **PUBLIC** (ou seja, qualquer papel, incluindo `anon`) tinha nas duas tabelas:

```
SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN   (concedido por supabase_admin)
```

## Por que isso era grave

1. **Leitura**: 8 funções do schema `public` chamam `net.http_*` passando cabeçalho `Authorization`
   (verificado em `pg_proc`). Essas requisições passam pela fila. Quem fizesse leitura repetida do
   endpoint capturaria credenciais em trânsito.
2. **Escrita**: com `INSERT` na fila, dava para fazer o banco disparar requisição HTTP para qualquer
   URL com qualquer cabeçalho — requisição partindo de dentro da infraestrutura.
3. **Destruição**: com `DELETE`/`TRUNCATE`, dava para esvaziar a fila e quebrar as integrações
   (webhooks, enriquecimento de produto, CRM) sem deixar rastro na aplicação.

O conteúdo efetivamente presente nas 104 linhas no momento da descoberta era de baixo risco
(respostas JSON curtas, até 90 caracteres, nenhuma com credencial no corpo; 100 cabeçalhos
`set-cookie`). O risco estava no acesso contínuo, não no que estava lá naquele instante.

## Por que a migration de revogação não resolveu

A migration `20261113225000_sec_revoke_anon_authenticated_net_supabase_functions.sql` foi aplicada em
produção em 2026-11-14 e **passou**, mas o `REVOKE` no schema `net` não teve efeito:

- os privilégios foram concedidos por **`supabase_admin`**;
- o workflow `db-apply-migration.yml` aplica como **`postgres`**, que neste projeto **não é
  superusuário nem membro de `supabase_admin`** (verificado: `rolsuper = false`,
  `pg_has_role('postgres','supabase_admin','USAGE') = false`).

No PostgreSQL, `REVOKE` executado por quem não concedeu o privilégio não falha — ele simplesmente
não faz nada. A própria migration já previa parte disso e emitia `RAISE WARNING` dizendo que `net.*`
continuaria acessível e que o fechamento viria "pelo `db_schema` do PostgREST".

A parte da migration que **funcionou** foi em `supabase_functions.hooks` e
`supabase_functions.migrations`: lá os privilégios eram revogáveis, e `anon`/`authenticated`
perderam acesso (hoje a API responde `permission denied for table hooks`).

## A correção aplicada

Removido `net` da lista de schemas expostos da API do projeto (configuração do PostgREST), via API de
administração do Supabase, em 2026-11-14, por decisão do dono:

```
antes:  public, graphql_public, graphql, cron, pgmq, net, supabase_functions, api
depois: public, graphql_public, graphql, cron, pgmq, supabase_functions, api
```

`net` **continua** em `db_extra_search_path`, de propósito: as 8 funções `SECURITY DEFINER` precisam
resolver `net.http_post` e deixariam de funcionar sem isso. Nenhum privilégio de banco foi alterado.

### Verificação depois da correção

```
net._http_response        → HTTP 406  PGRST106 "Only the following schemas are exposed: ..."
net.http_request_queue    → HTTP 406  PGRST106
public.products           → HTTP 200  (site funcionando)
public.categories         → HTTP 200  (site funcionando)
public.orders             → HTTP 401  permission denied (correto: anônimo não lê pedido)
```

Nenhum uso de `net` pela API existia no código: `grep` por `schema('net')`, `Accept-Profile: net` e
`Content-Profile: net` em `src/` e `supabase/functions/` não encontrou nada. Por isso a mudança não
quebra nenhum caminho do produto.

## O que ficou e o que vigiar

- Os privilégios de **PUBLIC** nas tabelas `net` **continuam no banco**. O acesso pela API está
  cortado, mas qualquer coisa que volte a expor o schema reabre a brecha. Só `supabase_admin` pode
  revogar esses privilégios, e nenhum agente tem esse papel — é ação de dono pelo painel, se um dia
  se quiser defesa em profundidade.
- `cron`, `pgmq` e `supabase_functions` seguem na lista de expostos, mas **negam acesso**
  (`permission denied for schema`), então não são brecha. Foram deixados como estavam para não mexer
  no que não é problema.
- Se algum dia a lista de schemas expostos for alterada, conferir que `net` não voltou.
