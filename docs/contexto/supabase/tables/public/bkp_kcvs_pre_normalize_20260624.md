# public._bkp_kcvs_pre_normalize_20260624

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
| 2 | `component_id` | `uuid` | sim |  |  |  |
| 3 | `variant_id` | `uuid` | sim |  |  |  |
| 4 | `kit_product_id` | `uuid` | sim |  |  |  |
| 5 | `component_sku` | `character varying(40)` | sim |  |  |  |
| 6 | `slot_code` | `character varying(6)` | sim |  |  |  |
| 7 | `is_packaging` | `boolean` | sim |  |  |  |
| 8 | `variant_color_code` | `character varying(50)` | sim |  |  |  |
| 9 | `variant_color_name` | `character varying(100)` | sim |  |  |  |
| 10 | `component_name` | `character varying(255)` | sim |  |  |  |
| 11 | `item_color_id` | `uuid` | sim |  |  |  |
| 12 | `primary_image_url` | `text` | sim |  |  |  |
| 13 | `image_source` | `character varying(30)` | sim |  |  |  |
| 14 | `is_standalone_sellable` | `boolean` | sim |  |  |  |
| 15 | `created_at` | `timestamp with time zone` | sim |  |  |  |
| 16 | `updated_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| bkp_kcvs_pre_normalize_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| bkp_kcvs_pre_normalize_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX bkp_kcvs_pre_normalize_pkey ON public._bkp_kcvs_pre_normalize_20260624 USING btree (id)` |


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
