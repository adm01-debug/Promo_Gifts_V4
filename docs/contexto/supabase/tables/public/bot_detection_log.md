# public.bot_detection_log

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
| 2 | `ip_address` | `text` | não |  |  |  |
| 3 | `user_agent` | `text` | sim |  |  |  |
| 4 | `detection_type` | `text` | não |  |  |  |
| 5 | `score` | `numeric(3,2)` | sim |  |  |  |
| 6 | `action_taken` | `text` | não | `'allowed'::text` |  |  |
| 7 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `blocked` | `boolean` | não | `false` |  | Marca se a deteccao resultou em bloqueio efetivo do IP. Adicionado 2026-05-22 (Lote F). |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| bot_detection_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| bot_detection_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX bot_detection_log_pkey ON public.bot_detection_log USING btree (id)` |
| idx_bot_detection_log_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_bot_detection_log_created_at ON public.bot_detection_log USING btree (created_at DESC)` |


## Policies (RLS)

### `Admins can read bot log`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
