# public._archive_supplier_price_tiers_20260626

> Archive de supplier_price_tiers (aposentada 2026-06-26). Snapshot stale de 13/06; substituída pela fonte viva VSS via get_variant_price. Reversível se necessário.

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
| 1 | `id` | `uuid` | não |  |  |  |
| 2 | `variant_supplier_id` | `uuid` | sim |  |  |  |
| 3 | `tier_order` | `smallint` | sim |  |  |  |
| 4 | `min_qty` | `integer` | sim |  |  |  |
| 5 | `cost_price` | `numeric(12,4)` | sim |  |  |  |
| 6 | `valid_from` | `timestamp with time zone` | sim |  |  |  |
| 7 | `valid_to` | `timestamp with time zone` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim |  |  |  |
| 9 | `updated_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| archive_supplier_price_tiers_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| archive_supplier_price_tiers_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX archive_supplier_price_tiers_pkey ON public._archive_supplier_price_tiers_20260626 USING btree (id)` |


## Policies (RLS)

### `admin_only`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
