# public.frontend_telemetry

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `event_type` | `text` | não |  |  |  |
| 3 | `name` | `text` | não |  |  |  |
| 4 | `duration_ms` | `double precision` | sim |  |  |  |
| 5 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 6 | `url` | `text` | sim |  |  |  |
| 7 | `user_agent` | `text` | sim |  |  |  |
| 8 | `session_id` | `text` | sim |  |  |  |
| 9 | `user_id` | `uuid` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| frontend_telemetry_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| frontend_telemetry_size_caps_check | CHECK | `CHECK (length(COALESCE(event_type, ''::text)) >= 1 AND length(COALESCE(event_type, ''::text)) <= 64 AND length(COALESCE(name, ''::text)) >= 1 AND length(COALESCE(name, ''::text)) <= 256 AND length(COALESCE(url, ''::text)) <= 2048 AND length(COALESCE(user_agent, ''::text)) <= 1024 AND length(COALESCE(session_id, ''::text)) <= 128 AND length(COALESCE(metadata::text, ''::text)) <= 8192)` |  |  | sim |
| frontend_telemetry_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| frontend_telemetry_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX frontend_telemetry_pkey ON public.frontend_telemetry USING btree (id)` |
| idx_frontend_telemetry_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_frontend_telemetry_user_id ON public.frontend_telemetry USING btree (user_id)` |


## Policies (RLS)

### `frontend_telemetry_insert_anon`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | anon |
| USING |  |
| WITH CHECK | `((user_id IS NULL) AND ((length(COALESCE(event_type, ''::text)) >= 1) AND (length(COALESCE(event_type, ''::text)) <= 64)) AND ((length(COALESCE(name, ''::text)) >= 1) AND (length(COALESCE(name, ''::text)) <= 256)) AND (length(COALESCE(url, ''::text)) <= 2048) AND (length(COALESCE(user_agent, ''::text)) <= 1024) AND (length(COALESCE(session_id, ''::text)) <= 128) AND (length(COALESCE((metadata)::text, ''::text)) <= 8192))` |

### `frontend_telemetry_insert_authenticated`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(((user_id IS NULL) OR (user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))) AND ((length(COALESCE(event_type, ''::text)) >= 1) AND (length(COALESCE(event_type, ''::text)) <= 64)) AND ((length(COALESCE(name, ''::text)) >= 1) AND (length(COALESCE(name, ''::text)) <= 256)) AND (length(COALESCE(url, ''::text)) <= 2048) AND (length(COALESCE(user_agent, ''::text)) <= 1024) AND (length(COALESCE(session_id, ''::text)) <= 128) AND (length(COALESCE((metadata)::text, ''::text)) <= 8192))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_anon_rate_guard | BEFORE | INSERT | ROW | enabled | public.fn_anon_insert_rate_guard |


## Grants

| role | privilégios |
|---|---|
| anon | INSERT |
| authenticated | INSERT, SELECT |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
