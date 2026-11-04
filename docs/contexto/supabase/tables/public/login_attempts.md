# public.login_attempts

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | sim |
| replica identity | full |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `email` | `text` | sim |  |  |  |
| 3 | `user_id` | `uuid` | sim |  |  |  |
| 4 | `ip_address` | `text` | não |  |  |  |
| 5 | `user_agent` | `text` | sim |  |  |  |
| 6 | `success` | `boolean` | não |  |  |  |
| 7 | `failure_reason` | `text` | sim |  |  |  |
| 8 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `verified` | `boolean` | não | `false` |  | true somente quando a edge log-login-attempt validou a sessão do usuário (Authorization Bearer + e-mail casado) para linhas success=true. fn_check_login_allowed ignora success não verificado ao zerar o contador de lockout. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| login_attempts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| login_attempts_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_login_attempts_email_ip_created | btree | email, ip_address, created_at | não | sim |  | `CREATE INDEX idx_login_attempts_email_ip_created ON public.login_attempts USING btree (email, ip_address, created_at DESC)` |
| idx_login_attempts_ip | btree | ip_address, created_at | não | sim |  | `CREATE INDEX idx_login_attempts_ip ON public.login_attempts USING btree (ip_address, created_at DESC)` |
| idx_login_attempts_lower_email_ip_created | btree | ip_address, created_at | não | sim |  | `CREATE INDEX idx_login_attempts_lower_email_ip_created ON public.login_attempts USING btree (lower(email), ip_address, created_at DESC)` |
| idx_login_attempts_user_id | btree | user_id, created_at | não | sim |  | `CREATE INDEX idx_login_attempts_user_id ON public.login_attempts USING btree (user_id, created_at DESC)` |
| login_attempts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX login_attempts_pkey ON public.login_attempts USING btree (id)` |


## Policies (RLS)

### `Devs can view login attempts`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `can_view_audit_logs(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | REFERENCES, TRIGGER |
| authenticated | REFERENCES, SELECT, TRIGGER |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
