# public.ai_providers

> AI provider catalog (Lovable, OpenAI, Anthropic, Google, DeepSeek, custom). Managed via /admin/conexoes.

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
| 2 | `slug` | `text` | não |  |  |  |
| 3 | `display_name` | `text` | não |  |  |  |
| 4 | `api_base_url` | `text` | não |  |  |  |
| 5 | `api_format` | `text` | não |  |  |  |
| 6 | `auth_header` | `text` | não | `'Authorization'::text` |  |  |
| 7 | `auth_format` | `text` | não | `'Bearer {key}'::text` |  | Template for the auth header value. Use {key} as placeholder. Example: "Bearer {key}" or just "{key}". |
| 8 | `secret_name` | `text` | não |  |  | Name of the credential in Vault/integration_credentials (e.g. LOVABLE_API_KEY). |
| 9 | `is_active` | `boolean` | não | `true` |  |  |
| 10 | `priority` | `integer` | não | `100` |  | Global ordering hint (lower = higher priority) for cost-aware routing tiebreakers. |
| 11 | `timeout_ms` | `integer` | não | `30000` |  |  |
| 12 | `max_retries` | `integer` | não | `2` |  |  |
| 13 | `metadata` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 14 | `last_test_at` | `timestamp with time zone` | sim |  |  |  |
| 15 | `last_test_ok` | `boolean` | sim |  |  |  |
| 16 | `last_test_message` | `text` | sim |  |  |  |
| 17 | `last_latency_ms` | `integer` | sim |  |  |  |
| 18 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 19 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 20 | `created_by` | `uuid` | sim |  |  |  |
| 21 | `updated_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ai_providers_api_format_check | CHECK | `CHECK (api_format = ANY (ARRAY['openai_compatible'::text, 'anthropic_native'::text, 'google_native'::text, 'custom'::text]))` |  |  | sim |
| ai_providers_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| ai_providers_max_retries_check | CHECK | `CHECK (max_retries >= 0 AND max_retries <= 5)` |  |  | sim |
| ai_providers_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| ai_providers_slug_key | UNIQUE | `UNIQUE (slug)` |  |  | sim |
| ai_providers_timeout_ms_check | CHECK | `CHECK (timeout_ms >= 1000 AND timeout_ms <= 120000)` |  |  | sim |
| ai_providers_updated_by_fkey | FOREIGN KEY | `FOREIGN KEY (updated_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.ai_models | ai_models_provider_id_fkey | provider_id | CASCADE |
| public.ai_routing_decisions | ai_routing_decisions_final_provider_id_fkey | final_provider_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ai_providers_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ai_providers_pkey ON public.ai_providers USING btree (id)` |
| ai_providers_slug_key | btree | slug | sim | sim |  | `CREATE UNIQUE INDEX ai_providers_slug_key ON public.ai_providers USING btree (slug)` |
| idx_ai_providers_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_ai_providers_created_by ON public.ai_providers USING btree (created_by)` |
| idx_ai_providers_updated_by | btree | updated_by | não | sim |  | `CREATE INDEX idx_ai_providers_updated_by ON public.ai_providers USING btree (updated_by)` |


## Policies (RLS)

### `ai_providers_dev_all`

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
| ai_providers_updated_at | BEFORE | UPDATE | ROW | enabled | public.tg_ai_providers_set_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
