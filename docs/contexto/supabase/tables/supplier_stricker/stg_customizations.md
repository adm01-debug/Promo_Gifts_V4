# supplier_stricker.stg_customizations

> Staging de técnicas de personalização da API Stricker

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
| 1 | `id` | `integer` | não | `nextval('supplier_stricker.stg_customizations_id_seq'::regclass)` |  |  |
| 2 | `stricker_ref` | `character varying(50)` | não |  |  |  |
| 3 | `product_ref` | `character varying(50)` | sim |  |  |  |
| 4 | `technique_name` | `text` | sim |  |  |  |
| 5 | `area_name` | `text` | sim |  |  |  |
| 6 | `max_colors` | `integer` | sim |  |  |  |
| 7 | `max_width` | `numeric(10,2)` | sim |  |  |  |
| 8 | `max_height` | `numeric(10,2)` | sim |  |  |  |
| 9 | `raw_data` | `jsonb` | sim |  |  |  |
| 10 | `synced_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `mapped_to_technique_id` | `uuid` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| stg_customizations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| stg_customizations_stricker_ref_key | UNIQUE | `UNIQUE (stricker_ref)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| stg_customizations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX stg_customizations_pkey ON supplier_stricker.stg_customizations USING btree (id)` |
| stg_customizations_stricker_ref_key | btree | stricker_ref | sim | sim |  | `CREATE UNIQUE INDEX stg_customizations_stricker_ref_key ON supplier_stricker.stg_customizations USING btree (stricker_ref)` |


## Policies (RLS)

> ⚠️ RLS **desabilitado** nesta tabela.



## Triggers

_nenhum_


## Grants

_nenhum_
