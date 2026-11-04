# supplier_stricker.stg_colors

> Staging de cores da API Stricker

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
| 1 | `id` | `integer` | não | `nextval('supplier_stricker.stg_colors_id_seq'::regclass)` |  |  |
| 2 | `stricker_ref` | `character varying(50)` | não |  |  |  |
| 3 | `name` | `text` | sim |  |  |  |
| 4 | `hex_code` | `character varying(7)` | sim |  |  |  |
| 5 | `group_name` | `text` | sim |  |  |  |
| 6 | `raw_data` | `jsonb` | sim |  |  |  |
| 7 | `synced_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 8 | `mapped_to_color_id` | `uuid` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| stg_colors_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| stg_colors_stricker_ref_key | UNIQUE | `UNIQUE (stricker_ref)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| stg_colors_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX stg_colors_pkey ON supplier_stricker.stg_colors USING btree (id)` |
| stg_colors_stricker_ref_key | btree | stricker_ref | sim | sim |  | `CREATE UNIQUE INDEX stg_colors_stricker_ref_key ON supplier_stricker.stg_colors USING btree (stricker_ref)` |


## Policies (RLS)

> ⚠️ RLS **desabilitado** nesta tabela.



## Triggers

_nenhum_


## Grants

_nenhum_
