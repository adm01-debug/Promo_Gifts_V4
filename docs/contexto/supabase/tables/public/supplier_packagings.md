# public.supplier_packagings

> Fornecedores que vendem cada embalagem

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
| usada por views | public.vw_packaging_health, public.vw_packaging_suppliers, public.vw_product_packaging_options |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `supplier_id` | `uuid` | não |  |  |  |
| 3 | `packaging_id` | `uuid` | não |  |  |  |
| 4 | `supplier_code` | `character varying(50)` | sim |  |  |  |
| 5 | `supplier_name` | `character varying(200)` | sim |  |  |  |
| 6 | `unit_price` | `numeric(10,4)` | sim |  |  |  |
| 7 | `currency` | `character varying(3)` | sim | `'BRL'::character varying` |  |  |
| 8 | `min_order_quantity` | `integer` | sim | `1` |  |  |
| 9 | `is_available` | `boolean` | sim | `true` |  |  |
| 10 | `lead_time_days` | `integer` | sim |  |  |  |
| 11 | `last_price_update` | `timestamp with time zone` | sim |  |  |  |
| 12 | `active` | `boolean` | sim | `true` |  |  |
| 13 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| supplier_packagings_packaging_id_fkey | FOREIGN KEY | `FOREIGN KEY (packaging_id) REFERENCES packagings(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| supplier_packagings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| supplier_packagings_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| supplier_packagings_unique | UNIQUE | `UNIQUE (supplier_id, packaging_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_supplier_packagings_packaging_id | btree | packaging_id | não | sim |  | `CREATE INDEX idx_supplier_packagings_packaging_id ON public.supplier_packagings USING btree (packaging_id)` |
| supplier_packagings_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX supplier_packagings_pkey ON public.supplier_packagings USING btree (id)` |
| supplier_packagings_unique | btree | supplier_id, packaging_id | sim | sim |  | `CREATE UNIQUE INDEX supplier_packagings_unique ON public.supplier_packagings USING btree (supplier_id, packaging_id)` |


## Policies (RLS)

### `auth_read_supplier_packagings`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
