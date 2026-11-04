# public.cnpj_backfill_audit

> Trilha de rollback do backfill CNPJ (migração cnpj_normalize_backfill_and_check_constraints, 2026-07-02). Retenção: seguro dropar após 2026-08-01 se nenhum rollback for necessário. Owner: Pink (PO). 8 normalizações registradas, 0 NULL-outs.

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
| 1 | `id` | `bigint` | não |  | a |  |
| 2 | `executed_at` | `timestamp with time zone` | não | `now()` |  |  |
| 3 | `table_name` | `text` | não |  |  |  |
| 4 | `row_id` | `uuid` | não |  |  |  |
| 5 | `cnpj_before` | `text` | sim |  |  |  |
| 6 | `cnpj_after` | `text` | sim |  |  |  |
| 7 | `action` | `text` | não |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| cnpj_backfill_audit_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| cnpj_backfill_audit_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX cnpj_backfill_audit_pkey ON public.cnpj_backfill_audit USING btree (id)` |


## Policies (RLS)

### `audit_internal_only`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | public |
| USING | `false` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
