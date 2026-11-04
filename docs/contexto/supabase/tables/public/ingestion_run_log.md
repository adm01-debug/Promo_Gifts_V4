# public.ingestion_run_log

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
| 2 | `run_id` | `uuid` | não |  |  |  |
| 3 | `supplier_code` | `text` | não |  |  |  |
| 4 | `feed` | `text` | não |  |  |  |
| 5 | `started_at` | `timestamp with time zone` | não | `now()` |  |  |
| 6 | `finished_at` | `timestamp with time zone` | sim |  |  |  |
| 7 | `duration_s` | `numeric` | sim |  |  |  |
| 8 | `fetched` | `integer` | não | `0` |  |  |
| 9 | `upserted` | `integer` | não | `0` |  |  |
| 10 | `skipped` | `integer` | não | `0` |  |  |
| 11 | `errors` | `integer` | não | `0` |  |  |
| 12 | `status` | `text` | não | `'running'::text` |  |  |
| 13 | `error_samples` | `jsonb` | sim |  |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ingestion_run_log_feed_check | CHECK | `CHECK (feed = ANY (ARRAY['products'::text, 'stock'::text, 'customization'::text, 'customization_options'::text, 'colors'::text]))` |  |  | sim |
| ingestion_run_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| ingestion_run_log_status_check | CHECK | `CHECK (status = ANY (ARRAY['running'::text, 'ok'::text, 'ok_com_erros'::text, 'failed'::text, 'aborted_rate_limit'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ingestion_run_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ingestion_run_log_pkey ON public.ingestion_run_log USING btree (id)` |


## Policies (RLS)

### `rls_infra_deny_public`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
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
