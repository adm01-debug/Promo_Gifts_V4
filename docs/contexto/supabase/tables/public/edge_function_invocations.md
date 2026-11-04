# public.edge_function_invocations

> Logs de invocações de edge functions. Edges escrevem via service_role. NÃO inserir secrets/auth headers em request_metadata. Cleanup periódico via purge_edge_invocations_old() ou cron job.

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
| 2 | `function_slug` | `text` | não |  |  |  |
| 3 | `invoked_by` | `uuid` | sim |  |  |  |
| 4 | `invoked_at` | `timestamp with time zone` | não | `now()` |  |  |
| 5 | `request_method` | `text` | sim |  |  |  |
| 6 | `request_metadata` | `jsonb` | sim |  |  |  |
| 7 | `status_code` | `integer` | sim |  |  |  |
| 8 | `duration_ms` | `integer` | sim |  |  |  |
| 9 | `error_message` | `text` | sim |  |  |  |
| 10 | `ip_address` | `inet` | sim |  |  |  |
| 11 | `user_agent` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| edge_function_invocations_invoked_by_fkey | FOREIGN KEY | `FOREIGN KEY (invoked_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| edge_function_invocations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| edge_function_invocations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX edge_function_invocations_pkey ON public.edge_function_invocations USING btree (id)` |
| idx_edge_function_invocations_invoked_by | btree | invoked_by | não | sim |  | `CREATE INDEX idx_edge_function_invocations_invoked_by ON public.edge_function_invocations USING btree (invoked_by)` |
| idx_efi_function_slug | btree | function_slug, invoked_at | não | sim |  | `CREATE INDEX idx_efi_function_slug ON public.edge_function_invocations USING btree (function_slug, invoked_at DESC)` |


## Policies (RLS)

### `efi_delete_dev_only`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `efi_insert_any_authenticated`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((invoked_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (invoked_by IS NULL))` |

### `efi_select_coord_or_above`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
