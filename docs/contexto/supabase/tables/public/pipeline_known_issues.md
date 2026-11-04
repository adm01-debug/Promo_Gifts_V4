# public.pipeline_known_issues

> Registro centralizado de bugs, gaps e anomalias conhecidos no pipeline de dados.
Serve como rastreabilidade para auditoria e priorização de correções.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `bug_id` | `text` | não |  |  |  |
| 3 | `supplier_id` | `uuid` | sim |  |  |  |
| 4 | `severity` | `text` | não |  |  |  |
| 5 | `status` | `text` | não | `'open'::text` |  |  |
| 6 | `layer` | `text` | não |  |  |  |
| 7 | `table_affected` | `text` | sim |  |  |  |
| 8 | `column_affected` | `text` | sim |  |  |  |
| 9 | `title` | `text` | não |  |  |  |
| 10 | `description` | `text` | não |  |  |  |
| 11 | `root_cause` | `text` | sim |  |  |  |
| 12 | `fix_instructions` | `text` | sim |  |  |  |
| 13 | `detected_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `fixed_at` | `timestamp with time zone` | sim |  |  |  |
| 15 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pipeline_known_issues_bug_id_key | UNIQUE | `UNIQUE (bug_id)` |  |  | sim |
| pipeline_known_issues_layer_check | CHECK | `CHECK (layer = ANY (ARRAY['bronze'::text, 'silver'::text, 'gold'::text, 'pipeline'::text, 'all'::text]))` |  |  | sim |
| pipeline_known_issues_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| pipeline_known_issues_severity_check | CHECK | `CHECK (severity = ANY (ARRAY['critical'::text, 'high'::text, 'medium'::text, 'low'::text]))` |  |  | sim |
| pipeline_known_issues_status_check | CHECK | `CHECK (status = ANY (ARRAY['open'::text, 'in_progress'::text, 'fixed'::text, 'wont_fix'::text]))` |  |  | sim |
| pipeline_known_issues_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pipeline_known_issues_supplier_id | btree | supplier_id | não | sim |  | `CREATE INDEX idx_pipeline_known_issues_supplier_id ON public.pipeline_known_issues USING btree (supplier_id)` |
| pipeline_known_issues_bug_id_key | btree | bug_id | sim | sim |  | `CREATE UNIQUE INDEX pipeline_known_issues_bug_id_key ON public.pipeline_known_issues USING btree (bug_id)` |
| pipeline_known_issues_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pipeline_known_issues_pkey ON public.pipeline_known_issues USING btree (id)` |


## Policies (RLS)

### `rls_infra_deny_public`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
| USING | `false` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
