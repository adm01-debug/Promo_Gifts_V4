# public.workspace_notifications

> Notificações de espaço de trabalho direcionadas a usuários, com categoria, tipo, estado de leitura e metadados.

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
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  | Identificador UUID da notificação. |
| 2 | `user_id` | `uuid` | não |  |  | Usuário destinatário da notificação. |
| 3 | `title` | `text` | não |  |  | Título da notificação. |
| 4 | `message` | `text` | não |  |  | Conteúdo textual da notificação. |
| 5 | `type` | `text` | não | `'info'::text` |  | Tipo da notificação. O valor padrão é info. |
| 6 | `category` | `text` | não | `'system'::text` |  | Categoria da notificação. O valor padrão é system. |
| 7 | `is_read` | `boolean` | não | `false` |  | Indica se a notificação foi marcada como lida. |
| 8 | `action_url` | `text` | sim |  |  | URL opcional associada à ação da notificação. |
| 9 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  | Metadados adicionais da notificação em formato JSONB. |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  | Data e hora de criação da notificação. |
| 12 | `search_vector` | `tsvector` | sim |  |  | Vetor de texto usado para busca textual nas notificações. |
| 13 | `idempotency_key` | `text` | sim |  |  | Chave opcional para identificar e evitar notificações duplicadas. |


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

### `Authenticated can insert own notifications`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(user_id = ( SELECT auth.uid() AS uid))` |

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
