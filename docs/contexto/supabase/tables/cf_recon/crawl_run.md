# cf_recon.crawl_run

> Histórico de crawls à API CF. 1 crawl parcial realizado (2026-06-16 23:44 UTC).
cf_total_reported=72.086. Crawl completo (~721 páginas) deve rodar periodicamente.

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
| 2 | `started_at` | `timestamp with time zone` | não | `now()` |  |  |
| 3 | `finished_at` | `timestamp with time zone` | sim |  |  |  |
| 4 | `pages_scanned` | `integer` | não | `0` |  |  |
| 5 | `images_seen` | `integer` | não | `0` |  |  |
| 6 | `cf_total_reported` | `integer` | sim |  |  |  |
| 7 | `status` | `text` | não | `'running'::text` |  |  |
| 8 | `notes` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| crawl_run_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| crawl_run_status_check | CHECK | `CHECK (status = ANY (ARRAY['running'::text, 'completed'::text, 'failed'::text, 'partial'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| crawl_run_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX crawl_run_pkey ON cf_recon.crawl_run USING btree (id)` |


## Policies (RLS)

### `admin_only`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT auth.uid() AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT auth.uid() AS uid))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
