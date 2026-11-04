# supplier_stricker.stg_product_types

> Staging de categorias da API Stricker

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
| 1 | `id` | `integer` | não | `nextval('supplier_stricker.stg_product_types_id_seq'::regclass)` |  |  |
| 2 | `stricker_ref` | `character varying(50)` | não |  |  |  |
| 3 | `name` | `text` | sim |  |  |  |
| 4 | `parent_ref` | `character varying(50)` | sim |  |  |  |
| 5 | `level` | `integer` | sim |  |  |  |
| 6 | `raw_data` | `jsonb` | sim |  |  |  |
| 7 | `synced_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 8 | `mapped_to_category_id` | `uuid` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| stg_product_types_mapped_to_category_id_fkey | FOREIGN KEY | `FOREIGN KEY (mapped_to_category_id) REFERENCES categories(id)` | NO ACTION | NO ACTION | sim |
| stg_product_types_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| stg_product_types_stricker_ref_key | UNIQUE | `UNIQUE (stricker_ref)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_ss_stg_product_types_mapped_to_category_id | btree | mapped_to_category_id | não | sim |  | `CREATE INDEX idx_ss_stg_product_types_mapped_to_category_id ON supplier_stricker.stg_product_types USING btree (mapped_to_category_id)` |
| stg_product_types_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX stg_product_types_pkey ON supplier_stricker.stg_product_types USING btree (id)` |
| stg_product_types_stricker_ref_key | btree | stricker_ref | sim | sim |  | `CREATE UNIQUE INDEX stg_product_types_stricker_ref_key ON supplier_stricker.stg_product_types USING btree (stricker_ref)` |


## Policies (RLS)

> ⚠️ RLS **desabilitado** nesta tabela.



## Triggers

_nenhum_


## Grants

_nenhum_
