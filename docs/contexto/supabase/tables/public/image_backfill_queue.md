# public.image_backfill_queue

> Fila de backfill de metadados (blurhash, hash, dims, file_size, reupload). 2026-06-17 — Claude.

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
| usada por views | public.v_cf_drift_dashboard |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `product_image_id` | `uuid` | não |  |  |  |
| 3 | `cloudflare_image_id` | `character varying(100)` | não |  |  |  |
| 4 | `url_cdn` | `text` | não |  |  |  |
| 5 | `format` | `character varying(20)` | sim |  |  |  |
| 6 | `task` | `text` | não |  |  |  |
| 7 | `priority` | `smallint` | não | `5` |  |  |
| 8 | `status` | `text` | não | `'pending'::text` |  |  |
| 9 | `attempts` | `smallint` | não | `0` |  |  |
| 10 | `last_error` | `text` | sim |  |  |  |
| 11 | `worker_id` | `text` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `started_at` | `timestamp with time zone` | sim |  |  |  |
| 14 | `finished_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| image_backfill_queue_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| image_backfill_queue_product_image_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_image_id) REFERENCES product_images(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| image_backfill_queue_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'done'::text, 'failed'::text, 'skipped'::text]))` |  |  | sim |
| image_backfill_queue_task_check | CHECK | `CHECK (task = ANY (ARRAY['blurhash'::text, 'content_hash'::text, 'file_size'::text, 'dimensions'::text, 'reupload'::text]))` |  |  | sim |
| uq_backfill_one_per_image_task | UNIQUE | `UNIQUE (product_image_id, task)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_backfill_dispatch_v2 | btree | task, status, priority, created_at | não | sim | `(status = 'pending'::text)` | `CREATE INDEX idx_backfill_dispatch_v2 ON public.image_backfill_queue USING btree (task, status, priority, created_at) WHERE (status = 'pending'::text)` |
| idx_backfill_queue_by_task | btree | task, status | não | sim |  | `CREATE INDEX idx_backfill_queue_by_task ON public.image_backfill_queue USING btree (task, status)` |
| idx_backfill_queue_dispatch | btree | priority, created_at | não | sim | `(status = 'pending'::text)` | `CREATE INDEX idx_backfill_queue_dispatch ON public.image_backfill_queue USING btree (priority DESC, created_at) WHERE (status = 'pending'::text)` |
| image_backfill_queue_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX image_backfill_queue_pkey ON public.image_backfill_queue USING btree (id)` |
| uq_backfill_one_per_image_task | btree | product_image_id, task | sim | sim |  | `CREATE UNIQUE INDEX uq_backfill_one_per_image_task ON public.image_backfill_queue USING btree (product_image_id, task)` |


## Policies (RLS)

### `backfill_queue_admin_all`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_org_owner_or_admin('5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid)` |
| WITH CHECK | `is_org_owner_or_admin('5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid)` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
