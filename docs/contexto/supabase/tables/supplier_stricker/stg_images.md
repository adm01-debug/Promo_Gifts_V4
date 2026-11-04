# supplier_stricker.stg_images

> Staging de imagens da API Stricker

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
| 1 | `id` | `integer` | não | `nextval('supplier_stricker.stg_images_id_seq'::regclass)` |  |  |
| 2 | `stricker_ref` | `character varying(50)` | sim |  |  |  |
| 3 | `product_ref` | `character varying(50)` | sim |  |  |  |
| 4 | `optional_ref` | `character varying(50)` | sim |  |  |  |
| 5 | `image_type` | `character varying(50)` | sim |  |  |  |
| 6 | `original_url` | `text` | sim |  |  |  |
| 7 | `filename` | `text` | sim |  |  |  |
| 8 | `position` | `integer` | sim |  |  |  |
| 9 | `raw_data` | `jsonb` | sim |  |  |  |
| 10 | `synced_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `processed_at` | `timestamp with time zone` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| stg_images_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| stg_images_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX stg_images_pkey ON supplier_stricker.stg_images USING btree (id)` |


## Policies (RLS)

> ⚠️ RLS **desabilitado** nesta tabela.



## Triggers

_nenhum_


## Grants

_nenhum_
