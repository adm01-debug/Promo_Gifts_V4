# supplier_stricker.category_mappings

> De-para entre códigos/nome de tipo e subtipo da Stricker e uma categoria canônica em public.categories. Usado para orientar a classificação de produtos importados; category_id nulo ou is_mapped=false indica mapeamento ainda não resolvido.

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
| 2 | `type_code` | `character varying(10)` | não |  |  |  |
| 3 | `sub_type_code` | `character varying(10)` | sim |  |  |  |
| 4 | `type_name` | `character varying(100)` | sim |  |  |  |
| 5 | `sub_type_name` | `character varying(100)` | sim |  |  |  |
| 6 | `category_id` | `uuid` | sim |  |  |  |
| 7 | `is_mapped` | `boolean` | sim | `false` |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| category_mappings_category_id_fkey | FOREIGN KEY | `FOREIGN KEY (category_id) REFERENCES categories(id)` | NO ACTION | NO ACTION | sim |
| category_mappings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| category_mappings_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX category_mappings_pkey ON supplier_stricker.category_mappings USING btree (id)` |
| category_mappings_unique_idx | btree | type_code | sim | sim |  | `CREATE UNIQUE INDEX category_mappings_unique_idx ON supplier_stricker.category_mappings USING btree (type_code, COALESCE(sub_type_code, ''::character varying))` |
| idx_ss_category_mappings_category_id | btree | category_id | não | sim |  | `CREATE INDEX idx_ss_category_mappings_category_id ON supplier_stricker.category_mappings USING btree (category_id)` |


## Policies (RLS)

### `deny_all`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | public |
| USING | `false` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | SELECT |
