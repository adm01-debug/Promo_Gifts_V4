# public.notifications

> Notificações direcionadas a usuários, com conteúdo, prioridade, estado de leitura e dados auxiliares.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | sim |
| replica identity | full |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  | Identificador UUID da notificação. |
| 2 | `user_id` | `uuid` | não |  |  | Usuário destinatário da notificação. |
| 3 | `type` | `text` | não |  |  | Tipo da notificação. |
| 4 | `title` | `text` | não |  |  | Título da notificação. |
| 5 | `message` | `text` | não |  |  | Conteúdo textual da notificação. |
| 6 | `data` | `jsonb` | sim | `'{}'::jsonb` |  | Dados adicionais da notificação em formato JSONB. |
| 7 | `read_at` | `timestamp with time zone` | sim |  |  | Data e hora em que a notificação foi marcada como lida, quando disponível. |
| 8 | `action_url` | `text` | sim |  |  | URL de destino associada à ação da notificação, quando houver. |
| 9 | `is_read` | `boolean` | sim | `false` |  | Indica se a notificação está marcada como lida. |
| 10 | `priority` | `text` | sim | `'normal'::text` |  | Prioridade atribuída à notificação. |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  | Data e hora de criação da notificação. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| notifications_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| notifications_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id)` |


## Policies (RLS)

### `users_update_own_notifications`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `users_view_own_notifications`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
