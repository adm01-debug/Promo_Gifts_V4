# public.quote_versions

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
| 2 | `quote_id` | `uuid` | não |  |  |  |
| 3 | `version_number` | `integer` | não |  |  |  |
| 4 | `snapshot` | `jsonb` | não |  |  |  |
| 5 | `change_summary` | `text` | sim |  |  |  |
| 6 | `created_by` | `uuid` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| quote_versions_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| quote_versions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| quote_versions_quote_id_fkey | FOREIGN KEY | `FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| quote_versions_quote_id_version_number_key | UNIQUE | `UNIQUE (quote_id, version_number)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_quote_versions_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_quote_versions_created_by ON public.quote_versions USING btree (created_by)` |
| quote_versions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX quote_versions_pkey ON public.quote_versions USING btree (id)` |
| quote_versions_quote_id_version_number_key | btree | quote_id, version_number | sim | sim |  | `CREATE UNIQUE INDEX quote_versions_quote_id_version_number_key ON public.quote_versions USING btree (quote_id, version_number)` |


## Policies (RLS)

### `quote_versions_select_scope`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `can_access_quote(quote_id)` |
| WITH CHECK |  |

### `qv_insert_service`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | service_role |
| USING |  |
| WITH CHECK | `true` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, SELECT, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
