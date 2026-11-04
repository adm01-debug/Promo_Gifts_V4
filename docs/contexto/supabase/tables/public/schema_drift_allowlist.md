# public.schema_drift_allowlist

> Tabelas onde divergência de schema entre Lovable interno e Oficial é aceitável por design (cache, infra, legacy).

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
| 2 | `reason` | `text` | não |  |  |  |
| 3 | `added_by` | `text` | não |  |  |  |
| 4 | `added_at` | `timestamp with time zone` | não | `now()` |  |  |
| 5 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| schema_drift_allowlist_pkey | PRIMARY KEY | `PRIMARY KEY (table_name)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| schema_drift_allowlist_pkey | btree | table_name | sim | sim |  | `CREATE UNIQUE INDEX schema_drift_allowlist_pkey ON public.schema_drift_allowlist USING btree (table_name)` |


## Policies (RLS)

### `Admins manage drift allowlist`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_roles.role = 'admin'::app_role))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_roles.role = 'admin'::app_role))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
