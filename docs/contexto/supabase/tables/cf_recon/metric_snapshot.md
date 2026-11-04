# cf_recon.metric_snapshot

> Snapshots periódicos de métricas de reconciliação CF×DB.
Inserir via INSERT ON CONFLICT DO UPDATE por taken_at (aproximado ao dia).

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
| 1 | `id` | `bigint` | não | `nextval('cf_recon.metric_snapshot_id_seq'::regclass)` |  |  |
| 2 | `taken_at` | `timestamp with time zone` | não | `now()` |  |  |
| 3 | `metrics` | `jsonb` | não |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| metric_snapshot_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| metric_snapshot_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX metric_snapshot_pkey ON cf_recon.metric_snapshot USING btree (id)` |


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
