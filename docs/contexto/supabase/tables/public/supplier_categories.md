# public.supplier_categories

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
| usada por views | public.vw_category_mapping_gaps, public.vw_supplier_category_coverage |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `supplier_id` | `uuid` | sim |  |  |  |
| 3 | `supplier_code` | `text` | não |  |  |  |
| 4 | `supplier_name` | `text` | não |  |  |  |
| 5 | `parent_code` | `text` | sim |  |  |  |
| 6 | `level` | `integer` | sim | `0` |  |  |
| 7 | `raw_data` | `jsonb` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| supplier_categories_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| supplier_categories_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id)` | NO ACTION | NO ACTION | sim |
| supplier_categories_supplier_id_supplier_code_key | UNIQUE | `UNIQUE (supplier_id, supplier_code)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.supplier_category_mappings | supplier_category_mappings_supplier_category_id_fkey | supplier_category_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| supplier_categories_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX supplier_categories_pkey ON public.supplier_categories USING btree (id)` |
| supplier_categories_supplier_id_supplier_code_key | btree | supplier_id, supplier_code | sim | sim |  | `CREATE UNIQUE INDEX supplier_categories_supplier_id_supplier_code_key ON public.supplier_categories USING btree (supplier_id, supplier_code)` |


## Policies (RLS)

### `auth_read_supplier_categories`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
