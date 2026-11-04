# public.file_scan_logs

> Auditoria de scans VirusTotal em uploads. user_id obrigatório (manifest edge secure-upload).

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
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `file_name` | `text` | não |  |  |  |
| 4 | `file_size` | `bigint` | sim |  |  |  |
| 5 | `file_hash` | `text` | sim |  |  |  |
| 6 | `mime_type` | `text` | sim |  |  |  |
| 7 | `scan_provider` | `text` | não | `'virustotal'::text` |  |  |
| 8 | `scan_result` | `text` | não | `'pending'::text` |  |  |
| 9 | `scan_response` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 10 | `storage_path` | `text` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| file_scan_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| file_scan_logs_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| file_scan_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX file_scan_logs_pkey ON public.file_scan_logs USING btree (id)` |
| idx_file_scan_logs_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_file_scan_logs_user_id ON public.file_scan_logs USING btree (user_id)` |


## Policies (RLS)

### `Users read own file_scan_logs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
