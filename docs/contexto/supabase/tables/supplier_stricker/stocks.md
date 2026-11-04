# supplier_stricker.stocks

> Estoque em tempo real dos SKUs Stricker

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
| usada por views | supplier_stricker.v_products_complete, supplier_stricker.v_stock_by_product |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `sku` | `character varying(30)` | não |  |  |  |
| 3 | `stock_quantity` | `integer` | sim | `0` |  |  |
| 4 | `next_quantity_1` | `integer` | sim |  |  |  |
| 5 | `next_date_1` | `date` | sim |  |  | Data prevista da próxima entrada de estoque |
| 6 | `next_quantity_2` | `integer` | sim |  |  |  |
| 7 | `next_date_2` | `date` | sim |  |  |  |
| 8 | `next_quantity_3` | `integer` | sim |  |  |  |
| 9 | `next_date_3` | `date` | sim |  |  |  |
| 10 | `last_sync_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| fk_stocks_optional | FOREIGN KEY | `FOREIGN KEY (sku) REFERENCES supplier_stricker.optionals(sku) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| stocks_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| stocks_sku_key | UNIQUE | `UNIQUE (sku)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_stricker_stocks_qty | btree | stock_quantity | não | sim |  | `CREATE INDEX idx_stricker_stocks_qty ON supplier_stricker.stocks USING btree (stock_quantity)` |
| idx_stricker_stocks_synced | btree | last_sync_at | não | sim |  | `CREATE INDEX idx_stricker_stocks_synced ON supplier_stricker.stocks USING btree (last_sync_at)` |
| stocks_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX stocks_pkey ON supplier_stricker.stocks USING btree (id)` |
| stocks_sku_key | btree | sku | sim | sim |  | `CREATE UNIQUE INDEX stocks_sku_key ON supplier_stricker.stocks USING btree (sku)` |


## Policies (RLS)

> ⚠️ RLS **desabilitado** nesta tabela.



## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_stocks_updated | BEFORE | UPDATE | ROW | enabled | supplier_stricker.update_timestamp |


## Grants

| role | privilégios |
|---|---|
| authenticated | SELECT |
| service_role | SELECT |
