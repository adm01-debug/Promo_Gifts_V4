# public.ai_models

> Models offered by each provider. capabilities JSON: {chat,vision_in,image_out,streaming,tools,json_mode,reasoning,multilingual}. Costs in USD/1M tokens (editable).

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
| usada por views | public.v_ai_function_routing_effective |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `provider_id` | `uuid` | não |  |  |  |
| 3 | `model_id` | `text` | não |  |  |  |
| 4 | `display_name` | `text` | não |  |  |  |
| 5 | `capabilities` | `jsonb` | não | `'{}'::jsonb` |  | JSON flags. Required keys: chat (bool). Optional: vision_in, image_out, streaming, tools, json_mode, reasoning, multilingual. |
| 6 | `cost_input_per_1m` | `numeric(10,4)` | não | `0` |  |  |
| 7 | `cost_output_per_1m` | `numeric(10,4)` | não | `0` |  |  |
| 8 | `cost_per_image` | `numeric(10,4)` | não | `0` |  |  |
| 9 | `max_input_tokens` | `integer` | sim |  |  |  |
| 10 | `max_output_tokens` | `integer` | sim |  |  |  |
| 11 | `is_active` | `boolean` | não | `true` |  |  |
| 12 | `metadata` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ai_models_cost_input_per_1m_check | CHECK | `CHECK (cost_input_per_1m >= 0::numeric)` |  |  | sim |
| ai_models_cost_output_per_1m_check | CHECK | `CHECK (cost_output_per_1m >= 0::numeric)` |  |  | sim |
| ai_models_cost_per_image_check | CHECK | `CHECK (cost_per_image >= 0::numeric)` |  |  | sim |
| ai_models_max_input_tokens_check | CHECK | `CHECK (max_input_tokens IS NULL OR max_input_tokens > 0)` |  |  | sim |
| ai_models_max_output_tokens_check | CHECK | `CHECK (max_output_tokens IS NULL OR max_output_tokens > 0)` |  |  | sim |
| ai_models_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| ai_models_provider_id_fkey | FOREIGN KEY | `FOREIGN KEY (provider_id) REFERENCES ai_providers(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| ai_models_provider_id_model_id_key | UNIQUE | `UNIQUE (provider_id, model_id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.ai_function_routing | ai_function_routing_primary_model_id_fkey | primary_model_id | RESTRICT |
| public.ai_routing_decisions | ai_routing_decisions_final_model_id_fkey | final_model_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ai_models_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ai_models_pkey ON public.ai_models USING btree (id)` |
| ai_models_provider_id_model_id_key | btree | provider_id, model_id | sim | sim |  | `CREATE UNIQUE INDEX ai_models_provider_id_model_id_key ON public.ai_models USING btree (provider_id, model_id)` |
| idx_ai_models_provider | btree | provider_id | não | sim |  | `CREATE INDEX idx_ai_models_provider ON public.ai_models USING btree (provider_id)` |


## Policies (RLS)

### `ai_models_dev_all`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_dev()` |
| WITH CHECK | `is_dev()` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| ai_models_updated_at | BEFORE | UPDATE | ROW | enabled | public.tg_ai_providers_set_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
