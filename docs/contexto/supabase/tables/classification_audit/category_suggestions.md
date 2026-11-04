# classification_audit.category_suggestions

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
| usada por views | classification_audit.v_gaps_acionaveis, classification_audit.v_kits_para_revisao |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `bigint` | não | `nextval('classification_audit.category_suggestions_id_seq'::regclass)` |  |  |
| 2 | `product_id` | `uuid` | não |  |  |  |
| 3 | `category_id` | `uuid` | não |  |  |  |
| 4 | `score` | `integer` | não |  |  |  |
| 5 | `matches` | `integer` | não |  |  |  |
| 6 | `tokens_matched` | `text` | sim |  |  |  |
| 7 | `already_assigned` | `boolean` | não |  |  |  |
| 8 | `is_primary_now` | `boolean` | não |  |  |  |
| 9 | `category_level` | `integer` | não |  |  |  |
| 10 | `computed_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `material_conflict` | `boolean` | sim |  |  |  |
| 12 | `type_conflict` | `boolean` | sim |  |  |  |
| 13 | `approved_auto` | `boolean` | sim |  |  |  |
| 14 | `tokens_in_name` | `boolean` | sim |  |  |  |
| 15 | `category_is_prefix` | `boolean` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| category_suggestions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| category_suggestions_product_id_category_id_key | UNIQUE | `UNIQUE (product_id, category_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| category_suggestions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX category_suggestions_pkey ON classification_audit.category_suggestions USING btree (id)` |
| category_suggestions_product_id_category_id_key | btree | product_id, category_id | sim | sim |  | `CREATE UNIQUE INDEX category_suggestions_product_id_category_id_key ON classification_audit.category_suggestions USING btree (product_id, category_id)` |
| idx_sug_gap | btree | already_assigned, score | não | sim |  | `CREATE INDEX idx_sug_gap ON classification_audit.category_suggestions USING btree (already_assigned, score DESC)` |
| idx_sug_product | btree | product_id | não | sim |  | `CREATE INDEX idx_sug_product ON classification_audit.category_suggestions USING btree (product_id)` |
| idx_sug_score | btree | score | não | sim |  | `CREATE INDEX idx_sug_score ON classification_audit.category_suggestions USING btree (score DESC)` |


## Policies (RLS)

> ⚠️ RLS **desabilitado** nesta tabela.



## Triggers

_nenhum_


## Grants

_nenhum_
