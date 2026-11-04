# public.supplier_field_mappings

> Define qual campo do fornecedor mapeia para qual campo interno

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
| usada por views | public.vw_supplier_field_mappings_summary |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `supplier_id` | `uuid` | não |  |  |  |
| 3 | `source_field` | `character varying(100)` | não |  |  | Nome do campo na API do fornecedor |
| 4 | `source_path` | `character varying(255)` | sim |  |  | Caminho JSONB se campo aninhado (ex: dimensions.length) |
| 5 | `target_table` | `character varying(50)` | não |  |  | Tabela destino: products, product_variants |
| 6 | `target_field` | `character varying(100)` | não |  |  | Campo destino na tabela normalizada |
| 7 | `transform_type` | `character varying(50)` | não | `'direct'::character varying` |  | Tipo: direct, multiply, divide, convert_unit, lookup, formula, custom |
| 8 | `transform_config` | `jsonb` | sim |  |  |  |
| 9 | `source_unit` | `character varying(20)` | sim |  |  |  |
| 10 | `target_unit` | `character varying(20)` | sim |  |  |  |
| 11 | `is_active` | `boolean` | sim | `true` |  |  |
| 12 | `priority` | `integer` | sim | `100` |  |  |
| 13 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 15 | `created_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| supplier_field_mappings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| supplier_field_mappings_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id)` | NO ACTION | NO ACTION | sim |
| uq_field_mapping | UNIQUE | `UNIQUE (supplier_id, source_field, target_table, target_field)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| supplier_field_mappings_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX supplier_field_mappings_pkey ON public.supplier_field_mappings USING btree (id)` |
| uq_field_mapping | btree | supplier_id, source_field, target_table, target_field | sim | sim |  | `CREATE UNIQUE INDEX uq_field_mapping ON public.supplier_field_mappings USING btree (supplier_id, source_field, target_table, target_field)` |


## Policies (RLS)

### `auth_read_supplier_field_mappings`

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
