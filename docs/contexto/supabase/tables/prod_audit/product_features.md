# prod_audit.product_features

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
| 1 | `product_id` | `uuid` | não |  |  |  |
| 2 | `sku` | `text` | sim |  |  |  |
| 3 | `name` | `text` | sim |  |  |  |
| 4 | `name_normalized` | `text` | sim |  |  |  |
| 5 | `tokens` | `text[]` | sim |  |  |  |
| 6 | `materials` | `text[]` | sim |  |  |  |
| 7 | `colors` | `text[]` | sim |  |  |  |
| 8 | `has_eco_keyword` | `boolean` | sim | `false` |  |  |
| 9 | `has_kit_keyword` | `boolean` | sim | `false` |  |  |
| 10 | `has_thermal_flag` | `boolean` | sim | `false` |  |  |
| 11 | `has_textil_flag` | `boolean` | sim | `false` |  |  |
| 12 | `current_categories` | `uuid[]` | sim |  |  |  |
| 13 | `refreshed_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 14 | `base_type` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_features_pkey | PRIMARY KEY | `PRIMARY KEY (product_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pf_current | gin | current_categories | não | sim |  | `CREATE INDEX idx_pf_current ON prod_audit.product_features USING gin (current_categories)` |
| idx_pf_materials | gin | materials | não | sim |  | `CREATE INDEX idx_pf_materials ON prod_audit.product_features USING gin (materials)` |
| idx_pf_name_trgm | gin | name_normalized | não | sim |  | `CREATE INDEX idx_pf_name_trgm ON prod_audit.product_features USING gin (name_normalized gin_trgm_ops)` |
| idx_pf_tokens | gin | tokens | não | sim |  | `CREATE INDEX idx_pf_tokens ON prod_audit.product_features USING gin (tokens)` |
| product_features_pkey | btree | product_id | sim | sim |  | `CREATE UNIQUE INDEX product_features_pkey ON prod_audit.product_features USING btree (product_id)` |


## Policies (RLS)

> ⚠️ RLS **desabilitado** nesta tabela.



## Triggers

_nenhum_


## Grants

_nenhum_
