# public.anon_insert_rate

> Contadores (tabela|ip|minuto) do guard fn_anon_insert_rate_guard. Só o trigger (SECURITY DEFINER) escreve; purga via cron anon-insert-rate-purge.

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
| 1 | `bucket_key` | `text` | não |  |  |  |
| 2 | `n` | `integer` | não | `0` |  |  |
| 3 | `window_start` | `timestamp with time zone` | não |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| anon_insert_rate_pkey | PRIMARY KEY | `PRIMARY KEY (bucket_key)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| anon_insert_rate_pkey | btree | bucket_key | sim | sim |  | `CREATE UNIQUE INDEX anon_insert_rate_pkey ON public.anon_insert_rate USING btree (bucket_key)` |


## Policies (RLS)

### `anon_insert_rate_service_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
