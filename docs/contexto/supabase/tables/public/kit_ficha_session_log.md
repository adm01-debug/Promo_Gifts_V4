# public.kit_ficha_session_log

> Auditoria da sessao de decomposicao/criacao de kits via ficha tecnica XBZ (medidas reais buscadas do Postgres). Base para revert reversivel.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `product_sku` | `text` | não |  |  |  |
| 3 | `acao` | `text` | não |  |  |  |
| 4 | `componentes_afetados` | `integer` | sim |  |  |  |
| 5 | `is_kit_flipped` | `boolean` | sim | `false` |  |  |
| 6 | `internal_code_usado` | `text` | sim |  |  |  |
| 7 | `executado_em` | `timestamp with time zone` | sim | `now()` |  |  |
| 8 | `revert_sql` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| kit_ficha_session_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| kit_ficha_session_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX kit_ficha_session_log_pkey ON public.kit_ficha_session_log USING btree (id)` |


## Policies (RLS)

### `admin_only`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
