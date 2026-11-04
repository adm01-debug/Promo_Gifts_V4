# public.smoke_test_runs

> Persisted smoke-test results used by the admin observability dashboard.

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
| usada por views | public.v_smoke_tests_latest_run, public.v_smoke_tests_trend |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `ran_at` | `timestamp with time zone` | não | `now()` |  |  |
| 3 | `test_name` | `text` | não |  |  |  |
| 4 | `test_category` | `text` | sim |  |  |  |
| 5 | `result` | `text` | não |  |  |  |
| 6 | `details` | `text` | sim |  |  |  |
| 7 | `duration_ms` | `numeric` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| smoke_test_runs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_smoke_test_runs_ran_at | btree | ran_at | não | sim |  | `CREATE INDEX idx_smoke_test_runs_ran_at ON public.smoke_test_runs USING btree (ran_at DESC)` |
| smoke_test_runs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX smoke_test_runs_pkey ON public.smoke_test_runs USING btree (id)` |


## Policies (RLS)

### `smoke_insert_service_role`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((( SELECT current_setting('request.jwt.claim.role'::text, true) AS current_setting) = 'service_role'::text) OR ( SELECT is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) AS is_admin_or_above))` |

### `smoke_test_runs_select_admin`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | SELECT |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
