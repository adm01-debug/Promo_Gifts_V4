# cf_recon.cf_image

> Mirror completo do Cloudflare Images. 72.079 rows (= public._cf_images_audit).
PK = image_id (CF Image ID). Rastreia first_seen_at e last_seen_at por crawl.
NOTA: public._cf_images_audit é o espelho em public para JOIN direto em queries operacionais.
Sincronização bidirecional realizada em 2026-06-17.

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
| usada por views | cf_recon.v_cf_orphans, cf_recon.v_divergence, cf_recon.v_health_dashboard, cf_recon.v_inactive_alive_cf_cost, public.v_cf_drift_dashboard |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `image_id` | `text` | não |  |  |  |
| 2 | `uploaded_at` | `timestamp with time zone` | sim |  |  |  |
| 3 | `filename` | `text` | sim |  |  |  |
| 4 | `meta` | `jsonb` | sim |  |  |  |
| 5 | `crawl_run_id` | `uuid` | sim |  |  |  |
| 6 | `first_seen_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `last_seen_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| cf_image_pkey | PRIMARY KEY | `PRIMARY KEY (image_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| cf_image_pkey | btree | image_id | sim | sim |  | `CREATE UNIQUE INDEX cf_image_pkey ON cf_recon.cf_image USING btree (image_id)` |
| idx_cf_recon_cfimg_last_seen | btree | last_seen_at | não | sim |  | `CREATE INDEX idx_cf_recon_cfimg_last_seen ON cf_recon.cf_image USING btree (last_seen_at)` |
| idx_cf_recon_cfimg_uploaded | btree | uploaded_at | não | sim |  | `CREATE INDEX idx_cf_recon_cfimg_uploaded ON cf_recon.cf_image USING btree (uploaded_at)` |


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
