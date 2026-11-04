# cf_recon.action_log

> Log permanente e imutável de todas as decisões tomadas sobre imagens CF.
actor default = claude. Não fazer DELETE nesta tabela — é evidência de auditoria.

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
| usada por views | cf_recon.v_health_dashboard |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `bigint` | não | `nextval('cf_recon.action_log_id_seq'::regclass)` |  |  |
| 2 | `acted_at` | `timestamp with time zone` | não | `now()` |  |  |
| 3 | `actor` | `text` | não | `'claude'::text` |  |  |
| 4 | `action` | `text` | não |  |  |  |
| 5 | `image_db_id` | `uuid` | sim |  |  |  |
| 6 | `cf_image_id` | `text` | sim |  |  |  |
| 7 | `old_status` | `text` | sim |  |  |  |
| 8 | `new_status` | `text` | sim |  |  |  |
| 9 | `evidence` | `jsonb` | sim |  |  |  |
| 10 | `reversible` | `boolean` | não | `true` |  |  |
| 11 | `product_id` | `uuid` | sim |  |  | Denormalized product_id for cascade-delete resilience. Null for legacy rows where product_images was already cascade-deleted. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| action_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| action_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX action_log_pkey ON cf_recon.action_log USING btree (id)` |


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
