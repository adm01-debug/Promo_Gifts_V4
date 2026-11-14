# public.workspace_notifications

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | sim |
| replica identity | full |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `title` | `text` | não |  |  |  |
| 4 | `message` | `text` | não |  |  |  |
| 5 | `type` | `text` | não | `'info'::text` |  |  |
| 6 | `category` | `text` | não | `'system'::text` |  |  |
| 7 | `is_read` | `boolean` | não | `false` |  |  |
| 8 | `action_url` | `text` | sim |  |  |  |
| 9 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `search_vector` | `tsvector` | sim |  |  |  |
| 13 | `idempotency_key` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| workspace_notifications_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| workspace_notifications_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_workspace_notifications_category | btree | category | não | sim |  | `CREATE INDEX idx_workspace_notifications_category ON public.workspace_notifications USING btree (category)` |
| idx_workspace_notifications_user_unread | btree | user_id, is_read, created_at | não | sim |  | `CREATE INDEX idx_workspace_notifications_user_unread ON public.workspace_notifications USING btree (user_id, is_read, created_at DESC)` |
| idx_workspace_notifications_user_unread_v2 | btree | user_id, created_at | não | sim | `(is_read = false)` | `CREATE INDEX idx_workspace_notifications_user_unread_v2 ON public.workspace_notifications USING btree (user_id, created_at DESC) WHERE (is_read = false)` |
| uq_workspace_notifications_idempotency | btree | idempotency_key | sim | sim |  | `CREATE UNIQUE INDEX uq_workspace_notifications_idempotency ON public.workspace_notifications USING btree (idempotency_key)` |
| workspace_notifications_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX workspace_notifications_pkey ON public.workspace_notifications USING btree (id)` |


## Policies (RLS)

### `Authenticated can insert notifications for valid users`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) IS NOT NULL) AND (user_id IS NOT NULL))` |

### `Users can delete own notifications`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `Users can read own notifications`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `Users can update own notifications`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_sync_workspace_notifications_search_vector | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_sync_workspace_notifications_search_vector |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
