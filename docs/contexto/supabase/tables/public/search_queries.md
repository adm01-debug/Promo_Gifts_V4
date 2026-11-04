# public.search_queries

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | sim |  |  |  |
| 3 | `query` | `text` | não |  |  |  |
| 4 | `results_count` | `integer` | sim |  |  |  |
| 5 | `clicked_product_id` | `uuid` | sim |  |  |  |
| 6 | `filters_applied` | `jsonb` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| search_queries_clicked_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (clicked_product_id) REFERENCES products(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| search_queries_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_search_queries_clicked_product_id | btree | clicked_product_id | não | sim |  | `CREATE INDEX idx_search_queries_clicked_product_id ON public.search_queries USING btree (clicked_product_id)` |
| search_queries_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX search_queries_pkey ON public.search_queries USING btree (id)` |


## Policies (RLS)

### `search_queries_insert_self`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `search_queries_self_or_coord`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
