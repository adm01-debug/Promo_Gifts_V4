# public.schema_signature_drift_allowlist

> MELHORIA4 schema_drift_local_guard_v1: mudancas de schema intencionais a ignorar no drift local. column_name NULL = tabela inteira.

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
| 2 | `column_name` | `text` | sim |  |  |  |
| 3 | `reason` | `text` | não |  |  |  |
| 4 | `added_by` | `text` | não | `'manual'::text` |  |  |
| 5 | `added_at` | `timestamp with time zone` | não | `now()` |  |  |
| 6 | `id` | `bigint` | não | `nextval('schema_signature_drift_allowlist_id_seq'::regclass)` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| schema_signature_drift_allowlist_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| schema_signature_drift_allowlist_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX schema_signature_drift_allowlist_pkey ON public.schema_signature_drift_allowlist USING btree (id)` |
| uq_schema_sig_allowlist | btree | table_name | sim | sim |  | `CREATE UNIQUE INDEX uq_schema_sig_allowlist ON public.schema_signature_drift_allowlist USING btree (table_name, COALESCE(column_name, '*'::text))` |


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
