# cf_recon.cf_ghost_check_queue

> Fila de verificação de IDs CF suspeitos. 17.834 checked_dead (infer. estatística 325 amostras),
7 false_positive (xbz-15465p-* uploadados APÓS o ghost check).
Nenhum ghost_dead tem produto ativo no DB — pure histórico de IDs deletados do CF.

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
| 1 | `image_id` | `text` | não |  |  |  |
| 2 | `audit_uploaded_at` | `timestamp with time zone` | sim |  |  |  |
| 3 | `prefix_supplier` | `text` | sim |  |  |  |
| 4 | `status` | `text` | não | `'pending'::text` |  |  |
| 5 | `checked_at` | `timestamp with time zone` | sim |  |  |  |
| 6 | `attempts` | `smallint` | não | `0` |  |  |
| 7 | `last_error` | `text` | sim |  |  |  |
| 8 | `enqueued_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| cf_ghost_check_queue_pkey | PRIMARY KEY | `PRIMARY KEY (image_id)` |  |  | sim |
| cf_ghost_check_queue_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'checked_alive'::text, 'checked_dead'::text, 'error'::text, 'false_positive'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| cf_ghost_check_queue_pkey | btree | image_id | sim | sim |  | `CREATE UNIQUE INDEX cf_ghost_check_queue_pkey ON cf_recon.cf_ghost_check_queue USING btree (image_id)` |
| idx_ghost_queue_dispatch | btree | enqueued_at | não | sim | `(status = 'pending'::text)` | `CREATE INDEX idx_ghost_queue_dispatch ON cf_recon.cf_ghost_check_queue USING btree (enqueued_at) WHERE (status = 'pending'::text)` |
| idx_ghost_queue_status | btree | status | não | sim |  | `CREATE INDEX idx_ghost_queue_status ON cf_recon.cf_ghost_check_queue USING btree (status)` |


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
