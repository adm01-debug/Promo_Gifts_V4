# public.expert_messages

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
| 2 | `conversation_id` | `uuid` | não |  |  |  |
| 3 | `role` | `text` | não | `'user'::text` |  |  |
| 4 | `content` | `text` | não |  |  |  |
| 5 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| expert_messages_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| expert_messages_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX expert_messages_pkey ON public.expert_messages USING btree (id)` |


## Policies (RLS)

### `Users can manage own messages`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM expert_conversations   WHERE ((expert_conversations.id = expert_messages.conversation_id) AND (expert_conversations.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM expert_conversations   WHERE ((expert_conversations.id = expert_messages.conversation_id) AND (expert_conversations.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
