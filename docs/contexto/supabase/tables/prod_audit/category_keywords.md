# prod_audit.category_keywords

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
| 1 | `category_id` | `uuid` | não |  |  |  |
| 2 | `level` | `integer` | sim |  |  |  |
| 3 | `name` | `text` | sim |  |  |  |
| 4 | `full_path` | `text` | sim |  |  |  |
| 5 | `tokens` | `text[]` | sim |  |  |  |
| 6 | `name_normalized` | `text` | sim |  |  |  |
| 7 | `path_normalized` | `text` | sim |  |  |  |
| 8 | `is_client_segment` | `boolean` | sim | `false` |  |  |
| 9 | `is_material_segment` | `boolean` | sim | `false` |  |  |
| 10 | `is_eco_segment` | `boolean` | sim | `false` |  |  |
| 11 | `is_kit_segment` | `boolean` | sim | `false` |  |  |
| 12 | `refreshed_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 13 | `base_type` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| category_keywords_pkey | PRIMARY KEY | `PRIMARY KEY (category_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| category_keywords_pkey | btree | category_id | sim | sim |  | `CREATE UNIQUE INDEX category_keywords_pkey ON prod_audit.category_keywords USING btree (category_id)` |
| idx_catkw_level | btree | level | não | sim |  | `CREATE INDEX idx_catkw_level ON prod_audit.category_keywords USING btree (level)` |
| idx_catkw_name_trgm | gin | name_normalized | não | sim |  | `CREATE INDEX idx_catkw_name_trgm ON prod_audit.category_keywords USING gin (name_normalized gin_trgm_ops)` |
| idx_catkw_tokens | gin | tokens | não | sim |  | `CREATE INDEX idx_catkw_tokens ON prod_audit.category_keywords USING gin (tokens)` |


## Policies (RLS)

> ⚠️ RLS **desabilitado** nesta tabela.



## Triggers

_nenhum_


## Grants

_nenhum_
