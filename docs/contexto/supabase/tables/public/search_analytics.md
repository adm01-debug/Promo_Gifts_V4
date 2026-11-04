# public.search_analytics

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
| 3 | `search_term` | `text` | não |  |  |  |
| 4 | `results_count` | `integer` | não | `0` |  |  |
| 5 | `search_context` | `text` | sim |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `seller_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_results_count_range | CHECK | `CHECK (results_count IS NULL OR results_count >= '-1'::integer AND results_count <= 1000000)` |  |  | sim |
| search_analytics_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_search_analytics_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_search_analytics_created_at ON public.search_analytics USING btree (created_at DESC)` |
| idx_search_analytics_seller_created | btree | seller_id, created_at | não | sim |  | `CREATE INDEX idx_search_analytics_seller_created ON public.search_analytics USING btree (seller_id, created_at DESC)` |
| idx_search_analytics_seller_term_created | btree | seller_id, search_term, created_at | não | sim |  | `CREATE INDEX idx_search_analytics_seller_term_created ON public.search_analytics USING btree (seller_id, search_term, created_at DESC)` |
| idx_search_analytics_term_date | btree | search_term, created_at | não | sim |  | `CREATE INDEX idx_search_analytics_term_date ON public.search_analytics USING btree (search_term, created_at DESC)` |
| idx_search_analytics_zero_results_v2 | btree | search_term, created_at | não | sim | `((results_count = 0) AND (results_count <> '-1'::integer))` | `CREATE INDEX idx_search_analytics_zero_results_v2 ON public.search_analytics USING btree (search_term, created_at DESC) WHERE ((results_count = 0) AND (results_count <> '-1'::integer))` |
| search_analytics_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX search_analytics_pkey ON public.search_analytics USING btree (id)` |


## Policies (RLS)

### `Authenticated users can log searches`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) IS NOT NULL)` |

### `Managers and admins can read search analytics`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_manager_or_admin()` |
| WITH CHECK |  |

### `anon_can_insert_search_analytics`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | anon |
| USING |  |
| WITH CHECK | `(user_id IS NULL)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_anon_rate_guard | BEFORE | INSERT | ROW | enabled | public.fn_anon_insert_rate_guard |
| trg_sync_search_analytics_seller_id | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_sync_search_analytics_seller_id |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
