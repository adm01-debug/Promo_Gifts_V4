# public.ai_usage_quotas

> Per-role monthly AI request limits. Looked up by check_ai_quota using user primary role. Editable by admin/dev via UI.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 5 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `role` | `app_role` | não |  |  |  |
| 3 | `monthly_limit` | `integer` | não | `1000` |  |  |
| 4 | `is_unlimited` | `boolean` | não | `false` |  |  |
| 5 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 6 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ai_usage_quotas_monthly_limit_check | CHECK | `CHECK (monthly_limit >= 0)` |  |  | sim |
| ai_usage_quotas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| ai_usage_quotas_role_key | UNIQUE | `UNIQUE (role)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ai_usage_quotas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ai_usage_quotas_pkey ON public.ai_usage_quotas USING btree (id)` |
| ai_usage_quotas_role_key | btree | role | sim | sim |  | `CREATE UNIQUE INDEX ai_usage_quotas_role_key ON public.ai_usage_quotas USING btree (role)` |


## Policies (RLS)

### `ai_usage_quotas_admin_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(is_dev() OR has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |
| WITH CHECK |  |

### `ai_usage_quotas_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(is_dev() OR has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |

### `ai_usage_quotas_admin_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(is_dev() OR has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |
| WITH CHECK | `(is_dev() OR has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |

### `ai_usage_quotas_read_authenticated`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT auth.uid() AS uid) IS NOT NULL)` |
| WITH CHECK |  |

### `rls_restrictive_ai_usage_quotas`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | authenticated, service_role |
| USING | `true` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_ai_usage_quotas_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_set_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
