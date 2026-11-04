# public.ai_function_routing

> Function → model routing. The primary is tried first, then fallbacks in order. required_capabilities filters out invalid fallbacks at runtime.

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
| 2 | `function_name` | `text` | não |  |  |  |
| 3 | `primary_model_id` | `uuid` | não |  |  |  |
| 4 | `fallback_model_ids` | `uuid[]` | não | `'{}'::uuid[]` |  |  |
| 5 | `required_capabilities` | `jsonb` | não | `'{}'::jsonb` |  | JSON of mandatory capabilities. Example: {"image_out": true} blocks any model whose capabilities.image_out != true from being used. |
| 6 | `request_overrides` | `jsonb` | não | `'{}'::jsonb` |  | JSON merged on top of caller-supplied request body. Example: {"temperature": 0.2, "max_tokens": 2000}. |
| 7 | `is_active` | `boolean` | não | `true` |  |  |
| 8 | `notes` | `text` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ai_function_routing_function_name_key | UNIQUE | `UNIQUE (function_name)` |  |  | sim |
| ai_function_routing_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| ai_function_routing_primary_model_id_fkey | FOREIGN KEY | `FOREIGN KEY (primary_model_id) REFERENCES ai_models(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| ai_function_routing_updated_by_fkey | FOREIGN KEY | `FOREIGN KEY (updated_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ai_function_routing_function_name_key | btree | function_name | sim | sim |  | `CREATE UNIQUE INDEX ai_function_routing_function_name_key ON public.ai_function_routing USING btree (function_name)` |
| ai_function_routing_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ai_function_routing_pkey ON public.ai_function_routing USING btree (id)` |
| idx_ai_function_routing_primary_model_id | btree | primary_model_id | não | sim |  | `CREATE INDEX idx_ai_function_routing_primary_model_id ON public.ai_function_routing USING btree (primary_model_id)` |
| idx_ai_function_routing_updated_by | btree | updated_by | não | sim |  | `CREATE INDEX idx_ai_function_routing_updated_by ON public.ai_function_routing USING btree (updated_by)` |


## Policies (RLS)

### `ai_function_routing_dev_all`

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
| ai_function_routing_updated_at | BEFORE | UPDATE | ROW | enabled | public.tg_ai_providers_set_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
