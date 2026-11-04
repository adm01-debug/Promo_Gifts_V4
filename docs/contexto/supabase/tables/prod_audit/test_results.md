# prod_audit.test_results

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
| 1 | `id` | `bigint` | não | `nextval('prod_audit.test_results_id_seq'::regclass)` |  |  |
| 2 | `batch` | `text` | não |  |  |  |
| 3 | `test_name` | `text` | não |  |  |  |
| 4 | `category` | `text` | não |  |  |  |
| 5 | `severity` | `text` | não |  |  |  |
| 6 | `result` | `text` | não |  |  |  |
| 7 | `expected` | `text` | sim |  |  |  |
| 8 | `actual` | `text` | sim |  |  |  |
| 9 | `details` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 10 | `duration_ms` | `numeric` | sim |  |  |  |
| 11 | `executed_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| test_results_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| test_results_result_check | CHECK | `CHECK (result = ANY (ARRAY['pass'::text, 'fail'::text, 'warning'::text, 'skip'::text]))` |  |  | sim |
| test_results_severity_check | CHECK | `CHECK (severity = ANY (ARRAY['critical'::text, 'high'::text, 'medium'::text, 'low'::text, 'info'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_test_results_batch_result | btree | batch, result | não | sim |  | `CREATE INDEX idx_test_results_batch_result ON prod_audit.test_results USING btree (batch, result)` |
| idx_test_results_severity_fail | btree | severity | não | sim | `(result = 'fail'::text)` | `CREATE INDEX idx_test_results_severity_fail ON prod_audit.test_results USING btree (severity) WHERE (result = 'fail'::text)` |
| test_results_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX test_results_pkey ON prod_audit.test_results USING btree (id)` |


## Policies (RLS)

> ⚠️ RLS **desabilitado** nesta tabela.



## Triggers

_nenhum_


## Grants

_nenhum_
