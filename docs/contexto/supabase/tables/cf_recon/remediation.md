# cf_recon.remediation

> Plano de remediações pendentes. status: open|in_progress|done|cancelled.
Linkar às entradas de action_log quando executado.

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
| 1 | `id` | `bigint` | não | `nextval('cf_recon.remediation_id_seq'::regclass)` |  |  |
| 2 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 3 | `kind` | `text` | não |  |  |  |
| 4 | `product_id` | `uuid` | sim |  |  |  |
| 5 | `image_db_id` | `uuid` | sim |  |  |  |
| 6 | `cf_image_id` | `text` | sim |  |  |  |
| 7 | `detail` | `jsonb` | sim |  |  |  |
| 8 | `status` | `text` | não | `'open'::text` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| remediation_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| remediation_status_check | CHECK | `CHECK (status = ANY (ARRAY['open'::text, 'in_progress'::text, 'done'::text, 'wontfix'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_remediation_kind_status | btree | kind, status | não | sim |  | `CREATE INDEX idx_remediation_kind_status ON cf_recon.remediation USING btree (kind, status)` |
| remediation_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX remediation_pkey ON cf_recon.remediation USING btree (id)` |


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
