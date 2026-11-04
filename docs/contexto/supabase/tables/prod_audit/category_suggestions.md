# prod_audit.category_suggestions

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
| usada por views | prod_audit.v_category_suggestions_review |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `bigint` | não | `nextval('prod_audit.category_suggestions_id_seq'::regclass)` |  |  |
| 2 | `product_id` | `uuid` | não |  |  |  |
| 3 | `product_name` | `text` | sim |  |  |  |
| 4 | `product_sku` | `text` | sim |  |  |  |
| 5 | `rule_name` | `text` | não |  |  |  |
| 6 | `suggested_category_id` | `uuid` | sim |  |  |  |
| 7 | `suggested_category_path` | `text` | sim |  |  |  |
| 8 | `current_categories` | `text[]` | sim |  |  |  |
| 9 | `confidence` | `text` | sim |  |  |  |
| 10 | `reason` | `text` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `reviewed` | `boolean` | sim | `false` |  |  |
| 13 | `accepted` | `boolean` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| category_suggestions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| category_suggestions_product_id_suggested_category_id_rule__key | UNIQUE | `UNIQUE (product_id, suggested_category_id, rule_name)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| category_suggestions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX category_suggestions_pkey ON prod_audit.category_suggestions USING btree (id)` |
| category_suggestions_product_id_suggested_category_id_rule__key | btree | product_id, suggested_category_id, rule_name | sim | sim |  | `CREATE UNIQUE INDEX category_suggestions_product_id_suggested_category_id_rule__key ON prod_audit.category_suggestions USING btree (product_id, suggested_category_id, rule_name)` |
| idx_catsug_confidence | btree | confidence | não | sim |  | `CREATE INDEX idx_catsug_confidence ON prod_audit.category_suggestions USING btree (confidence)` |
| idx_catsug_product | btree | product_id | não | sim |  | `CREATE INDEX idx_catsug_product ON prod_audit.category_suggestions USING btree (product_id)` |
| idx_catsug_rule | btree | rule_name | não | sim |  | `CREATE INDEX idx_catsug_rule ON prod_audit.category_suggestions USING btree (rule_name)` |
| idx_catsug_unreviewed | btree | reviewed | não | sim | `(reviewed = false)` | `CREATE INDEX idx_catsug_unreviewed ON prod_audit.category_suggestions USING btree (reviewed) WHERE (reviewed = false)` |


## Policies (RLS)

> ⚠️ RLS **desabilitado** nesta tabela.



## Triggers

_nenhum_


## Grants

_nenhum_
