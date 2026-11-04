# public.mockup_prompt_history

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
| 2 | `config_id` | `uuid` | não |  |  |  |
| 3 | `config_key` | `text` | não |  |  |  |
| 4 | `old_prompt` | `text` | sim |  |  |  |
| 5 | `new_prompt` | `text` | não |  |  |  |
| 6 | `ai_model` | `text` | não |  |  |  |
| 7 | `version` | `integer` | não |  |  |  |
| 8 | `changed_by` | `uuid` | sim |  |  |  |
| 9 | `change_notes` | `text` | sim |  |  |  |
| 10 | `changed_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| mockup_prompt_history_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| mockup_prompt_history_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX mockup_prompt_history_pkey ON public.mockup_prompt_history USING btree (id)` |


## Policies (RLS)

### `Admins insert prompt history`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `Admins view prompt history`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
