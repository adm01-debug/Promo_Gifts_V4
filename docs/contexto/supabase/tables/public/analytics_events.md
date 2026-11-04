# public.analytics_events

> [Etapa 7] RLS corrigido: SELECT escopado a self+supervisor (era USING true vazando). INSERT permite anon (tracking público) sem atribuir a user. DELETE só dev.

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


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | sim |  |  |  |
| 3 | `event_type` | `text` | não |  |  |  |
| 4 | `event_name` | `text` | não |  |  |  |
| 5 | `properties` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 6 | `session_id` | `text` | sim |  |  |  |
| 7 | `ip_address` | `inet` | sim |  |  |  |
| 8 | `user_agent` | `text` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| analytics_events_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| analytics_events_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX analytics_events_pkey ON public.analytics_events USING btree (id)` |


## Policies (RLS)

### `ae_delete_dev`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `ae_insert_anon`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | anon |
| USING |  |
| WITH CHECK | `(user_id IS NULL)` |

### `ae_insert_self_or_anon`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((user_id IS NULL) OR (user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |

### `ae_select_own_or_coord`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |


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
