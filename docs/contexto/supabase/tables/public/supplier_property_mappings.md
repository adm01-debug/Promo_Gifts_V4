# public.supplier_property_mappings

> Mapeamento de properties brutas do fornecedor para códigos normalizados

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
| usada por views | public.vw_supplier_mapping_statistics |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `supplier_id` | `uuid` | sim |  |  |  |
| 3 | `supplier_code` | `text` | não |  |  | Código do fornecedor (spot, giftscorp, crown, etc.) |
| 4 | `raw_pattern` | `text` | não |  |  | Padrão para ILIKE (ex: %bebidas frias%) |
| 5 | `property_code` | `text` | não |  |  |  |
| 6 | `priority` | `integer` | sim | `0` |  | Ordem de avaliação - maior número = avaliado primeiro |
| 7 | `notes` | `text` | sim |  |  |  |
| 8 | `active` | `boolean` | sim | `true` |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| supplier_property_mappings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| supplier_property_mappings_supplier_code_raw_pattern_key | UNIQUE | `UNIQUE (supplier_code, raw_pattern)` |  |  | sim |
| supplier_property_mappings_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_supplier_property_mappings_property | btree | property_code | não | sim |  | `CREATE INDEX idx_supplier_property_mappings_property ON public.supplier_property_mappings USING btree (property_code)` |
| idx_supplier_property_mappings_supplier_id | btree | supplier_id | não | sim |  | `CREATE INDEX idx_supplier_property_mappings_supplier_id ON public.supplier_property_mappings USING btree (supplier_id)` |
| supplier_property_mappings_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX supplier_property_mappings_pkey ON public.supplier_property_mappings USING btree (id)` |
| supplier_property_mappings_supplier_code_raw_pattern_key | btree | supplier_code, raw_pattern | sim | sim |  | `CREATE UNIQUE INDEX supplier_property_mappings_supplier_code_raw_pattern_key ON public.supplier_property_mappings USING btree (supplier_code, raw_pattern)` |


## Policies (RLS)

### `auth_read_supplier_property_mappings`

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
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
