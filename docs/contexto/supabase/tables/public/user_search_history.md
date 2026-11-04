# public.user_search_history

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
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `query_text` | `text` | não |  |  |  |
| 4 | `history_type` | `text` | não | `'general'::text` |  |  |
| 5 | `result_count` | `integer` | sim | `0` |  |  |
| 6 | `is_pinned` | `boolean` | sim | `false` |  |  |
| 7 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| uq_user_search_history_user_query | UNIQUE | `UNIQUE (user_id, query_text)` |  |  | sim |
| user_search_history_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| uq_user_search_history_user_query | btree | user_id, query_text | sim | sim |  | `CREATE UNIQUE INDEX uq_user_search_history_user_query ON public.user_search_history USING btree (user_id, query_text)` |
| user_search_history_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX user_search_history_pkey ON public.user_search_history USING btree (id)` |


## Policies (RLS)

### `Users can manage their own search history`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| WITH CHECK | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| limit_user_search_history | AFTER | INSERT | ROW | enabled | public.cleanup_user_search_history |
| update_user_search_history_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
