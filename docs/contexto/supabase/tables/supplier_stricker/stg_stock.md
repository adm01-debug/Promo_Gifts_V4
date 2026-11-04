# supplier_stricker.stg_stock

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | não |
| RLS forçado (owner) | não |
| policies | 0 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `sku` | `character varying(50)` | não |  |  |  |
| 3 | `stock_quantity` | `integer` | sim | `0` |  |  |
| 4 | `next_quantity_1` | `integer` | sim |  |  |  |
| 5 | `next_date_1` | `date` | sim |  |  |  |
| 6 | `next_quantity_2` | `integer` | sim |  |  |  |
| 7 | `next_date_2` | `date` | sim |  |  |  |
| 8 | `next_quantity_3` | `integer` | sim |  |  |  |
| 9 | `next_date_3` | `date` | sim |  |  |  |
| 10 | `raw_json` | `jsonb` | sim |  |  |  |
| 11 | `synced_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| stg_stock_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| stg_stock_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX stg_stock_pkey ON supplier_stricker.stg_stock USING btree (id)` |
| stg_stock_sku_uidx | btree | sku | sim | sim |  | `CREATE UNIQUE INDEX stg_stock_sku_uidx ON supplier_stricker.stg_stock USING btree (sku)` |


## Policies (RLS)

> ⚠️ RLS **desabilitado** nesta tabela.



## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | SELECT |
