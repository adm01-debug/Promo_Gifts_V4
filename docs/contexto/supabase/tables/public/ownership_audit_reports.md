# public.ownership_audit_reports

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
| 2 | `generated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 3 | `total_tables_scanned` | `integer` | não | `0` |  |  |
| 4 | `total_issues_found` | `integer` | não | `0` |  |  |
| 5 | `null_owner_count` | `integer` | não | `0` |  |  |
| 6 | `missing_user_count` | `integer` | não | `0` |  |  |
| 7 | `details` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 8 | `triggered_by` | `text` | não | `'cron'::text` |  |  |
| 9 | `duration_ms` | `integer` | sim |  |  |  |
| 10 | `rls_coverage` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 11 | `rls_gaps_count` | `integer` | não | `0` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ownership_audit_reports_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ownership_audit_reports_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ownership_audit_reports_pkey ON public.ownership_audit_reports USING btree (id)` |


## Policies (RLS)

### `ownership_audit_reports_admin_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'dev'::app_role))` |
| WITH CHECK |  |

### `ownership_audit_reports_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'dev'::app_role))` |

### `ownership_audit_reports_admin_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'dev'::app_role))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
