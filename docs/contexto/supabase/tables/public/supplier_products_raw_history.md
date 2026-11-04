# public.supplier_products_raw_history

> Versões anteriores de raw_data quando content_hash canônico muda (trg_spr_history). Particionada por mês; retenção via DROP PARTITION em fn_purge_spr_history. Legado pré-2026-06-10 em supplier_products_raw_history_legacy.

| propriedade | valor |
|---|---|
| tipo | partitioned |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| chave de partição | `RANGE (captured_at)` |


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
| supplier_products_raw_history_pkey1 | PRIMARY KEY | `PRIMARY KEY (id, captured_at)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| supplier_products_raw_history_pkey1 | btree | id, captured_at | sim | sim |  | `CREATE UNIQUE INDEX supplier_products_raw_history_pkey1 ON ONLY public.supplier_products_raw_history USING btree (id, captured_at)` |


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
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | SELECT |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
