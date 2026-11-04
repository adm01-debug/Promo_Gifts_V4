# public.product_supply

> [fix_version:satellite_supply_20260627] Satélite 1:1 de dados de fornecimento/sincronização.
 Colunas: supply_mode, lead_time_days, is_imported, origin_country,
 last_sync_at, sync_status, supplier_updated_at.
 Sincronizado por trg_sync_product_supply.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `product_id` | `uuid` | não |  |  |  |
| 3 | `supply_mode` | `character varying(50)` | sim |  |  |  |
| 4 | `lead_time_days` | `integer` | sim |  |  |  |
| 5 | `is_imported` | `boolean` | sim | `false` |  |  |
| 6 | `origin_country` | `character varying(10)` | sim |  |  |  |
| 7 | `last_sync_at` | `timestamp with time zone` | sim |  |  |  |
| 8 | `sync_status` | `character varying(20)` | sim |  |  |  |
| 9 | `supplier_updated_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_supply_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_supply_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_supply_product_id_key | UNIQUE | `UNIQUE (product_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_product_supply_sync_status | btree | sync_status | não | sim |  | `CREATE INDEX idx_product_supply_sync_status ON public.product_supply USING btree (sync_status)` |
| product_supply_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_supply_pkey ON public.product_supply USING btree (id)` |
| product_supply_product_id_key | btree | product_id | sim | sim |  | `CREATE UNIQUE INDEX product_supply_product_id_key ON public.product_supply USING btree (product_id)` |


## Policies (RLS)

### `product_supply_authenticated_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `product_supply_service_all`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |

### `rls_restrictive_product_supply`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | authenticated, service_role |
| USING | `true` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
