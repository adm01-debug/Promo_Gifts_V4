# public.supplier_subtype_category_map

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


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `supplier_id` | `uuid` | não |  |  |  |
| 3 | `subtype_desc` | `text` | não |  |  |  |
| 4 | `subtype_code` | `text` | sim |  |  |  |
| 5 | `category_id` | `uuid` | sim |  |  |  |
| 6 | `match_method` | `text` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| supplier_subtype_category_map_category_id_fkey | FOREIGN KEY | `FOREIGN KEY (category_id) REFERENCES categories(id)` | NO ACTION | NO ACTION | sim |
| supplier_subtype_category_map_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| supplier_subtype_category_map_supplier_id_subtype_desc_key | UNIQUE | `UNIQUE (supplier_id, subtype_desc)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_fk_supplier_subtype_category_map_category_id | btree | category_id | não | sim |  | `CREATE INDEX idx_fk_supplier_subtype_category_map_category_id ON public.supplier_subtype_category_map USING btree (category_id)` |
| supplier_subtype_category_map_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX supplier_subtype_category_map_pkey ON public.supplier_subtype_category_map USING btree (id)` |
| supplier_subtype_category_map_supplier_id_subtype_desc_key | btree | supplier_id, subtype_desc | sim | sim |  | `CREATE UNIQUE INDEX supplier_subtype_category_map_supplier_id_subtype_desc_key ON public.supplier_subtype_category_map USING btree (supplier_id, subtype_desc)` |


## Policies (RLS)

### `auth_read_supplier_subtype_category_map`

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
