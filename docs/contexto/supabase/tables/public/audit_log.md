# public.audit_log

> Trilha de auditoria genérica por entidade (application-level), escrita por useAuditLog.logAction (INSERT/UPDATE/DELETE) e lida por fetchAuditHistory/fetchAllAuditLogs. Imutável; leitura dev-only (can_view_audit_logs); embed profiles:user_id via FK. fix_version 2026-06-26. NÃO adicionar triggers (duplicaria escritas da app).

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
| 2 | `user_id` | `uuid` | sim |  |  |  |
| 3 | `action` | `text` | não |  |  |  |
| 4 | `entity_type` | `text` | não |  |  |  |
| 5 | `entity_id` | `uuid` | não |  |  |  |
| 6 | `old_values` | `jsonb` | sim |  |  |  |
| 7 | `new_values` | `jsonb` | sim |  |  |  |
| 8 | `ip_address` | `inet` | sim |  |  |  |
| 9 | `user_agent` | `text` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| audit_log_action_check | CHECK | `CHECK (action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text]))` |  |  | sim |
| audit_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| audit_log_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| audit_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX audit_log_pkey ON public.audit_log USING btree (id)` |
| idx_audit_log_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_audit_log_created_at ON public.audit_log USING btree (created_at DESC)` |
| idx_audit_log_entity | btree | entity_type, entity_id, created_at | não | sim |  | `CREATE INDEX idx_audit_log_entity ON public.audit_log USING btree (entity_type, entity_id, created_at DESC)` |
| idx_audit_log_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_audit_log_user_id ON public.audit_log USING btree (user_id)` |


## Policies (RLS)

### `audit_log_insert_self`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |

### `audit_log_select_dev`

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
| authenticated | INSERT, SELECT |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
