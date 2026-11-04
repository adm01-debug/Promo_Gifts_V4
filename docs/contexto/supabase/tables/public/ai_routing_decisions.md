# public.ai_routing_decisions

> Per-call audit of router decisions. attempted_outcomes is an array of {model_id, status, error_kind, latency_ms} mirroring attempted_models order.

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
| 2 | `function_name` | `text` | não |  |  |  |
| 3 | `user_id` | `uuid` | sim |  |  |  |
| 4 | `attempted_models` | `uuid[]` | não |  |  |  |
| 5 | `attempted_providers` | `uuid[]` | não |  |  |  |
| 6 | `attempted_outcomes` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 7 | `final_model_id` | `uuid` | sim |  |  |  |
| 8 | `final_provider_id` | `uuid` | sim |  |  |  |
| 9 | `total_attempts` | `integer` | não |  |  |  |
| 10 | `total_duration_ms` | `integer` | não |  |  |  |
| 11 | `outcome` | `text` | não |  |  |  |
| 12 | `usage_log_id` | `uuid` | sim |  |  |  |
| 13 | `request_id` | `text` | sim |  |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ai_routing_decisions_final_model_id_fkey | FOREIGN KEY | `FOREIGN KEY (final_model_id) REFERENCES ai_models(id)` | NO ACTION | NO ACTION | sim |
| ai_routing_decisions_final_provider_id_fkey | FOREIGN KEY | `FOREIGN KEY (final_provider_id) REFERENCES ai_providers(id)` | NO ACTION | NO ACTION | sim |
| ai_routing_decisions_outcome_check | CHECK | `CHECK (outcome = ANY (ARRAY['success'::text, 'all_failed'::text, 'fallback_used'::text, 'quota_blocked'::text, 'no_routing'::text]))` |  |  | sim |
| ai_routing_decisions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| ai_routing_decisions_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ai_routing_decisions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ai_routing_decisions_pkey ON public.ai_routing_decisions USING btree (id)` |
| idx_ai_routing_decisions_final_model_id | btree | final_model_id | não | sim |  | `CREATE INDEX idx_ai_routing_decisions_final_model_id ON public.ai_routing_decisions USING btree (final_model_id)` |
| idx_ai_routing_decisions_final_provider_id | btree | final_provider_id | não | sim |  | `CREATE INDEX idx_ai_routing_decisions_final_provider_id ON public.ai_routing_decisions USING btree (final_provider_id)` |
| idx_ai_routing_decisions_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_ai_routing_decisions_user_id ON public.ai_routing_decisions USING btree (user_id)` |


## Policies (RLS)

### `ai_routing_decisions_dev_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(is_dev() OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'supervisor'::app_role) OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
