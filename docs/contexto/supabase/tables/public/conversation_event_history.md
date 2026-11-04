# public.conversation_event_history

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
| 2 | `conversation_id` | `uuid` | não |  |  |  |
| 3 | `role` | `text` | não |  |  |  |
| 4 | `event_type` | `conversation_event_type` | não | `'text'::conversation_event_type` |  |  |
| 5 | `content` | `text` | sim |  |  |  |
| 6 | `media_url` | `text` | sim |  |  |  |
| 7 | `media_metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 8 | `tokens_estimated` | `integer` | sim | `0` |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `request_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| conversation_event_history_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| conversation_event_history_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX conversation_event_history_pkey ON public.conversation_event_history USING btree (id)` |


## Policies (RLS)

### `Acesso ao histórico de eventos segue o log de auditoria`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM conversation_audit_logs   WHERE (conversation_audit_logs.id = conversation_event_history.conversation_id)))` |
| WITH CHECK |  |

### `Inserção de eventos permitida para o dono da conversa`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM conversation_audit_logs   WHERE ((conversation_audit_logs.id = conversation_event_history.conversation_id) AND (conversation_audit_logs.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
