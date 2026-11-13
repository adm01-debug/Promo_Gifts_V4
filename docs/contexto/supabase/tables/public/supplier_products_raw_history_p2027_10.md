# public.supplier_products_raw_history_p2027_10

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
| partição de | public.supplier_products_raw_history |
| bound | `FOR VALUES FROM ('2027-10-01 00:00:00+00') TO ('2027-11-01 00:00:00+00')` |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `raw_id` | `uuid` | sim |  |  |  |
| 3 | `supplier_id` | `uuid` | sim |  |  |  |
| 4 | `supplier_reference` | `character varying` | sim |  |  |  |
| 5 | `content_hash` | `text` | sim |  |  |  |
| 6 | `raw_data` | `jsonb` | sim |  |  |  |
| 7 | `captured_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| supplier_products_raw_history_p2027_10_pkey | PRIMARY KEY | `PRIMARY KEY (id, captured_at)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| supplier_products_raw_history_p2027_10_pkey | btree | id, captured_at | sim | sim |  | `CREATE UNIQUE INDEX supplier_products_raw_history_p2027_10_pkey ON public.supplier_products_raw_history_p2027_10 USING btree (id, captured_at)` |


## Policies (RLS)

### `hist_all_service`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |

### `hist_select_admin`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | REFERENCES, TRIGGER |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
