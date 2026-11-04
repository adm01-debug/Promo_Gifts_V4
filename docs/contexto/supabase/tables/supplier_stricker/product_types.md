# supplier_stricker.product_types

> Categorias e subcategorias dos produtos Stricker

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
| 2 | `type_code` | `character varying(10)` | não |  |  |  |
| 3 | `type_name` | `character varying(100)` | sim |  |  |  |
| 4 | `subtype_code` | `character varying(10)` | sim |  |  |  |
| 5 | `subtype_name` | `character varying(100)` | sim |  |  |  |
| 6 | `level` | `integer` | sim | `1` |  |  |
| 7 | `parent_type_code` | `character varying(10)` | sim |  |  |  |
| 8 | `is_active` | `boolean` | sim | `true` |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_types_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_types_type_code_subtype_code_key | UNIQUE | `UNIQUE (type_code, subtype_code)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_stricker_types_code | btree | type_code | não | sim |  | `CREATE INDEX idx_stricker_types_code ON supplier_stricker.product_types USING btree (type_code)` |
| idx_stricker_types_level | btree | level | não | sim |  | `CREATE INDEX idx_stricker_types_level ON supplier_stricker.product_types USING btree (level)` |
| idx_stricker_types_subtype | btree | subtype_code | não | sim |  | `CREATE INDEX idx_stricker_types_subtype ON supplier_stricker.product_types USING btree (subtype_code)` |
| product_types_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_types_pkey ON supplier_stricker.product_types USING btree (id)` |
| product_types_type_code_subtype_code_key | btree | type_code, subtype_code | sim | sim |  | `CREATE UNIQUE INDEX product_types_type_code_subtype_code_key ON supplier_stricker.product_types USING btree (type_code, subtype_code)` |


## Policies (RLS)

> ⚠️ RLS **desabilitado** nesta tabela.



## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | SELECT |
| service_role | SELECT |
