# public.ownership_repair_logs

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
| 2 | `report_id` | `uuid` | sim |  |  |  |
| 3 | `table_name` | `text` | não |  |  |  |
| 4 | `owner_column` | `text` | não |  |  |  |
| 5 | `issue_type` | `text` | não |  |  |  |
| 6 | `action` | `text` | não |  |  |  |
| 7 | `rows_affected` | `integer` | não | `0` |  |  |
| 8 | `dry_run` | `boolean` | não | `true` |  |  |
| 9 | `triggered_by` | `uuid` | sim |  |  |  |
| 10 | `triggered_by_label` | `text` | sim |  |  |  |
| 11 | `notes` | `text` | sim |  |  |  |
| 12 | `error_message` | `text` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ownership_repair_logs_action_check | CHECK | `CHECK (action = ANY (ARRAY['deleted'::text, 'deactivated'::text, 'manual_review'::text, 'skipped'::text, 'failed'::text]))` |  |  | sim |
| ownership_repair_logs_issue_type_check | CHECK | `CHECK (issue_type = ANY (ARRAY['null_owner'::text, 'missing_user'::text]))` |  |  | sim |
| ownership_repair_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ownership_repair_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ownership_repair_logs_pkey ON public.ownership_repair_logs USING btree (id)` |


## Policies (RLS)

### `Admins/devs read repair logs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'dev'::app_role))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
