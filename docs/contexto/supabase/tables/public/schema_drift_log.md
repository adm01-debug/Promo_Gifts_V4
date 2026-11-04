# public.schema_drift_log

> Fase 4 2026-05-22: log diario de comparacao Lovable<->Oficial. Powered by schema-drift-check edge function + pg_cron.

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
| 2 | `ran_at` | `timestamp with time zone` | não | `now()` |  |  |
| 3 | `has_drift` | `boolean` | não |  |  |  |
| 4 | `tables_oficial` | `integer` | não |  |  |  |
| 5 | `tables_lovable` | `integer` | não |  |  |  |
| 6 | `only_oficial` | `text[]` | sim | `ARRAY[]::text[]` |  |  |
| 7 | `only_lovable` | `text[]` | sim | `ARRAY[]::text[]` |  |  |
| 8 | `schema_diff` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 9 | `notification_sent` | `boolean` | sim | `false` |  |  |
| 10 | `error_message` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| schema_drift_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sdl_ran_at | btree | ran_at | não | sim |  | `CREATE INDEX idx_sdl_ran_at ON public.schema_drift_log USING btree (ran_at DESC)` |
| schema_drift_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX schema_drift_log_pkey ON public.schema_drift_log USING btree (id)` |


## Policies (RLS)

### `Admins read schema_drift_log`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
