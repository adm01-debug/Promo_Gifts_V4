# public.catalog_analytics

> Analytics de eventos do catálogo. event_type válidos: sort, search, click, filter, view, add_to_quote. Expandido 2026-06-12.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | sim |  |  |  |
| 3 | `event_type` | `text` | não |  |  |  |
| 4 | `event_data` | `jsonb` | sim |  |  |  |
| 5 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| catalog_analytics_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| catalog_analytics_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| catalog_analytics_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX catalog_analytics_pkey ON public.catalog_analytics USING btree (id)` |
| idx_catalog_analytics_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_catalog_analytics_user_id ON public.catalog_analytics USING btree (user_id)` |


## Policies (RLS)

### `anon_insert_catalog_analytics`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | anon |
| USING |  |
| WITH CHECK | `(user_id IS NULL)` |

### `catalog_analytics_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(is_manager_or_admin() OR (( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id))` |
| WITH CHECK |  |

### `users_insert_own_analytics`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_anon_rate_guard | BEFORE | INSERT | ROW | enabled | public.fn_anon_insert_rate_guard |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
