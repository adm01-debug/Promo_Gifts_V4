# public.product_physical

> [ARQ 2026-06-26] Satélite physical (buffer WRITE-ONLY; não lido por view/função/FK). SoT = products; v_products_public lê dimensões de products. Mantido por trigger trg_sync_product_physical (fn_sync_product_physical_from_products, COALESCE products>physical). NÃO DROPAR enquanto fn_promote_padronizacao/fn_site_promote_to_gold/fn_asia_site_promote_to_gold gravarem aqui (risco de HALT do cron de promoção sob regeneração do bot Lovable).

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `product_id` | `uuid` | não |  |  |  |
| 3 | `length_cm` | `numeric(10,2)` | sim |  |  |  |
| 4 | `width_cm` | `numeric(10,2)` | sim |  |  |  |
| 5 | `height_cm` | `numeric(10,2)` | sim |  |  |  |
| 6 | `diameter_cm` | `numeric(10,2)` | sim |  |  |  |
| 7 | `weight_g` | `numeric(12,2)` | sim |  |  |  |
| 8 | `capacity_ml` | `numeric(12,2)` | sim |  |  |  |
| 9 | `shape_type` | `text` | sim |  |  |  |
| 10 | `internal_length_cm` | `numeric(10,2)` | sim |  |  | Coluna EXCLUSIVA do satélite (dimensão interna). Preservada por COALESCE no sync. |
| 11 | `internal_width_cm` | `numeric(10,2)` | sim |  |  |  |
| 12 | `internal_height_cm` | `numeric(10,2)` | sim |  |  |  |
| 13 | `box_length_cm` | `numeric(10,2)` | sim |  |  | Derivado de products.box_length_mm/10 (precedência) ou products.box_length_cm. Fonte-da-verdade: products. |
| 14 | `box_width_cm` | `numeric(10,2)` | sim |  |  |  |
| 15 | `box_height_cm` | `numeric(10,2)` | sim |  |  |  |
| 16 | `box_weight_kg` | `numeric(12,3)` | sim |  |  | Peso total da caixa master com os produtos. |
| 17 | `box_volume_cm3` | `numeric(14,2)` | sim |  |  |  |
| 18 | `box_quantity` | `integer` | sim |  |  | Quantidade de produtos por caixa master. |
| 19 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 20 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 21 | `circumference_cm` | `numeric` | sim |  |  | Circunferência em centímetros. Espelho de products.circumference_cm. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_physical_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_physical_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_physical_product_id_key | UNIQUE | `UNIQUE (product_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| product_physical_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_physical_pkey ON public.product_physical USING btree (id)` |
| product_physical_product_id_key | btree | product_id | sim | sim |  | `CREATE UNIQUE INDEX product_physical_product_id_key ON public.product_physical USING btree (product_id)` |


## Policies (RLS)

### `product_physical_anon_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `true` |
| WITH CHECK |  |

### `product_physical_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `product_physical_service`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_product_physical_updated_at | BEFORE | UPDATE | ROW | enabled | extensions.moddatetime |


## Grants

| role | privilégios |
|---|---|
| anon | SELECT |
| authenticated | SELECT |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
