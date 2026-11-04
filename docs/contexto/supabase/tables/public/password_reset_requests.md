# public.password_reset_requests

> Migrado do Lovable em 2026-05-22 (Lote A). Reset de senha aprovado manualmente.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `email` | `text` | não |  |  |  |
| 3 | `status` | `text` | não | `'pending'::text` |  |  |
| 4 | `requested_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 5 | `reviewed_at` | `timestamp with time zone` | sim |  |  |  |
| 6 | `reviewed_by` | `uuid` | sim |  |  |  |
| 7 | `reviewer_notes` | `text` | sim |  |  |  |
| 8 | `user_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| password_reset_requests_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| password_reset_requests_reviewed_by_fkey | FOREIGN KEY | `FOREIGN KEY (reviewed_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| password_reset_requests_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))` |  |  | sim |
| password_reset_requests_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_password_reset_requests_reviewed_by | btree | reviewed_by | não | sim |  | `CREATE INDEX idx_password_reset_requests_reviewed_by ON public.password_reset_requests USING btree (reviewed_by)` |
| idx_password_reset_requests_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_password_reset_requests_user_id ON public.password_reset_requests USING btree (user_id)` |
| password_reset_requests_one_pending_per_email | btree |  | sim | sim | `(status = 'pending'::text)` | `CREATE UNIQUE INDEX password_reset_requests_one_pending_per_email ON public.password_reset_requests USING btree (lower(email)) WHERE (status = 'pending'::text)` |
| password_reset_requests_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX password_reset_requests_pkey ON public.password_reset_requests USING btree (id)` |


## Policies (RLS)

### `Admins can update password reset requests`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_roles.role = ANY (ARRAY['dev'::app_role, 'supervisor'::app_role, 'admin'::app_role])))))` |
| WITH CHECK |  |

### `Admins can view password reset requests`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_roles.role = ANY (ARRAY['dev'::app_role, 'supervisor'::app_role, 'admin'::app_role])))))` |
| WITH CHECK |  |

### `Anyone can request a password reset (validated)`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
| USING |  |
| WITH CHECK | `((email ~* '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$'::text) AND ((length(email) >= 5) AND (length(email) <= 254)) AND (status = 'pending'::text) AND (reviewed_at IS NULL) AND (reviewed_by IS NULL) AND (reviewer_notes IS NULL) AND (user_id IS NULL))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_anon_rate_guard | BEFORE | INSERT | ROW | enabled | public.fn_anon_insert_rate_guard |
| trg_password_reset_rate_limit | BEFORE | INSERT | ROW | enabled | public.enforce_password_reset_rate_limit |


## Grants

| role | privilégios |
|---|---|
| anon | REFERENCES, TRIGGER |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
