# supplier_stricker.colors

> Catálogo de cores disponíveis nos produtos Stricker

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
| 2 | `color_code` | `character varying(10)` | não |  |  | Código único da cor (ex: 103, 128) |
| 3 | `color_name` | `character varying(100)` | sim |  |  |  |
| 4 | `color_hex` | `character varying(10)` | sim |  |  | Código hexadecimal da cor (ex: #000000) |
| 5 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 6 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| colors_color_code_key | UNIQUE | `UNIQUE (color_code)` |  |  | sim |
| colors_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| colors_color_code_key | btree | color_code | sim | sim |  | `CREATE UNIQUE INDEX colors_color_code_key ON supplier_stricker.colors USING btree (color_code)` |
| colors_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX colors_pkey ON supplier_stricker.colors USING btree (id)` |
| idx_stricker_colors_name | btree | color_name | não | sim |  | `CREATE INDEX idx_stricker_colors_name ON supplier_stricker.colors USING btree (color_name)` |


## Policies (RLS)

> ⚠️ RLS **desabilitado** nesta tabela.



## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | SELECT |
| service_role | SELECT |
