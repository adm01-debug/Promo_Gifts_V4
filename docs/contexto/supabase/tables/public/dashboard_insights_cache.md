# public.dashboard_insights_cache

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.ai_insights_cache |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `function_name` | `text` | não |  |  |  |
| 4 | `cache_key` | `text` | não |  |  |  |
| 5 | `payload` | `jsonb` | não |  |  |  |
| 6 | `model` | `text` | sim |  |  |  |
| 9 | `duration_ms` | `integer` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `expires_at` | `timestamp with time zone` | não | `(now() + '06:00:00'::interval)` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| dashboard_insights_cache_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| dashboard_insights_cache_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX dashboard_insights_cache_pkey ON public.dashboard_insights_cache USING btree (id)` |
| idx_dashboard_insights_cache_expires_at | btree | expires_at | não | sim |  | `CREATE INDEX idx_dashboard_insights_cache_expires_at ON public.dashboard_insights_cache USING btree (expires_at)` |
| ux_dashboard_insights_cache_user_fn_key | btree | user_id, function_name, cache_key | sim | sim |  | `CREATE UNIQUE INDEX ux_dashboard_insights_cache_user_fn_key ON public.dashboard_insights_cache USING btree (user_id, function_name, cache_key)` |


## Policies (RLS)

### `Users can delete their own cached insights`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role))` |
| WITH CHECK |  |

### `Users can insert their own cached insights`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |

### `Users can update their own cached insights`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| WITH CHECK | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |

### `Users can view their own cached insights`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
