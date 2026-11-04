# public.schema_signature_baseline

> MELHORIA4 schema_drift_local_guard_v1: snapshot APROVADO de colunas do schema public. Recapturar via fn_capture_schema_baseline() apos mudancas intencionais. NAO DROPAR.

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
| 1 | `table_name` | `text` | não |  |  |  |
| 2 | `column_name` | `text` | não |  |  |  |
| 3 | `data_type` | `text` | não |  |  |  |
| 4 | `baseline_label` | `text` | não | `'init'::text` |  |  |
| 5 | `captured_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| schema_signature_baseline_pkey | PRIMARY KEY | `PRIMARY KEY (table_name, column_name)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| schema_signature_baseline_pkey | btree | table_name, column_name | sim | sim |  | `CREATE UNIQUE INDEX schema_signature_baseline_pkey ON public.schema_signature_baseline USING btree (table_name, column_name)` |


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
