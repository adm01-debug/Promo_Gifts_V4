# prod_audit.classification_rules

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
| 1 | `id` | `integer` | não | `nextval('prod_audit.classification_rules_id_seq'::regclass)` |  |  |
| 2 | `rule_name` | `text` | sim |  |  |  |
| 3 | `description` | `text` | sim |  |  |  |
| 4 | `product_condition` | `text` | sim |  |  |  |
| 5 | `target_category_path_like` | `text` | sim |  |  |  |
| 6 | `target_category_name_like` | `text` | sim |  |  |  |
| 7 | `target_category_tokens` | `text[]` | sim |  |  |  |
| 8 | `confidence` | `text` | sim |  |  |  |
| 9 | `active` | `boolean` | sim | `true` |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| classification_rules_confidence_check | CHECK | `CHECK (confidence = ANY (ARRAY['high'::text, 'medium'::text]))` |  |  | sim |
| classification_rules_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| classification_rules_rule_name_key | UNIQUE | `UNIQUE (rule_name)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| classification_rules_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX classification_rules_pkey ON prod_audit.classification_rules USING btree (id)` |
| classification_rules_rule_name_key | btree | rule_name | sim | sim |  | `CREATE UNIQUE INDEX classification_rules_rule_name_key ON prod_audit.classification_rules USING btree (rule_name)` |


## Policies (RLS)

> ⚠️ RLS **desabilitado** nesta tabela.



## Triggers

_nenhum_


## Grants

_nenhum_
