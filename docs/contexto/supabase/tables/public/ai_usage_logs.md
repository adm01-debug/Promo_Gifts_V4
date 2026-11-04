# public.ai_usage_logs

> Per-call AI usage events. Inserted as status=pending by acquire_ai_quota, then UPDATEd to success/error after the call completes. Read by useAiUsage hook for dashboards.

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
| 2 | `user_id` | `uuid` | sim |  |  |  |
| 3 | `function_name` | `text` | não |  |  |  |
| 4 | `model` | `text` | sim |  |  |  |
| 5 | `input_tokens` | `integer` | não | `0` |  |  |
| 6 | `output_tokens` | `integer` | não | `0` |  |  |
| 8 | `estimated_cost_usd` | `numeric(12,6)` | não | `0` |  |  |
| 9 | `duration_ms` | `integer` | sim |  |  |  |
| 10 | `status` | `text` | não | `'success'::text` |  |  |
| 11 | `error_message` | `text` | sim |  |  |  |
| 12 | `metadata` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 15 | `total_tokens` | `integer` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ai_usage_logs_duration_ms_check | CHECK | `CHECK (duration_ms IS NULL OR duration_ms >= 0)` |  |  | sim |
| ai_usage_logs_estimated_cost_usd_check | CHECK | `CHECK (estimated_cost_usd >= 0::numeric)` |  |  | sim |
| ai_usage_logs_input_tokens_check | CHECK | `CHECK (input_tokens >= 0)` |  |  | sim |
| ai_usage_logs_output_tokens_check | CHECK | `CHECK (output_tokens >= 0)` |  |  | sim |
| ai_usage_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| ai_usage_logs_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'success'::text, 'error'::text]))` |  |  | sim |
| ai_usage_logs_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ai_usage_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ai_usage_logs_pkey ON public.ai_usage_logs USING btree (id)` |
| idx_ai_usage_logs_status_errors | btree | status, created_at | não | sim | `(status <> 'success'::text)` | `CREATE INDEX idx_ai_usage_logs_status_errors ON public.ai_usage_logs USING btree (status, created_at DESC) WHERE (status <> 'success'::text)` |
| idx_ai_usage_logs_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_ai_usage_logs_user_id ON public.ai_usage_logs USING btree (user_id)` |


## Policies (RLS)

### `ai_usage_logs_user_own`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(is_dev() OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'supervisor'::app_role) OR (user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_ai_usage_logs_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_set_updated_at |
| trg_sync_ai_usage_logs_total_tokens | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_sync_ai_usage_logs_total_tokens |


## Grants

| role | privilégios |
|---|---|
| authenticated | REFERENCES, SELECT, TRIGGER |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
