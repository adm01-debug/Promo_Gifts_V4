# public.schema_signature_drift_log

> MELHORIA4 schema_drift_local_guard_v1: historico de checagens de drift intra-projeto.

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
| usada por views | public.v_system_alerts |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `ran_at` | `timestamp with time zone` | não | `now()` |  |  |
| 3 | `has_drift` | `boolean` | não | `false` |  |  |
| 4 | `n_added` | `integer` | não | `0` |  |  |
| 5 | `n_removed` | `integer` | não | `0` |  |  |
| 6 | `n_retyped` | `integer` | não | `0` |  |  |
| 7 | `columns_added` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 8 | `columns_removed` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 9 | `columns_retyped` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 10 | `tables_added` | `text[]` | não | `'{}'::text[]` |  |  |
| 11 | `tables_removed` | `text[]` | não | `'{}'::text[]` |  |  |
| 12 | `baseline_label` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| schema_signature_drift_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_schema_sig_drift_log_ran_at | btree | ran_at | não | sim |  | `CREATE INDEX idx_schema_sig_drift_log_ran_at ON public.schema_signature_drift_log USING btree (ran_at DESC)` |
| schema_signature_drift_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX schema_signature_drift_log_pkey ON public.schema_signature_drift_log USING btree (id)` |


## Policies (RLS)

### `admin_only`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
