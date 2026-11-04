# public.kit_component_variant_skus

> Identidade materializada de cada componente POR VARIANTE de kit. component_sku = SKU_variante-slot (ex.: 18891A-PRE-K1). Destrava asset por componente/cor (primary_image_url). Sincronizar com fn_refresh_kit_component_variant_skus().

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
| usada por views | public.v_kit_component_identity_health |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `component_id` | `uuid` | não |  |  |  |
| 3 | `variant_id` | `uuid` | não |  |  |  |
| 4 | `kit_product_id` | `uuid` | não |  |  |  |
| 5 | `component_sku` | `character varying(40)` | não |  |  |  |
| 6 | `slot_code` | `character varying(6)` | não |  |  |  |
| 7 | `is_packaging` | `boolean` | não | `false` |  |  |
| 8 | `variant_color_code` | `character varying(50)` | sim |  |  |  |
| 9 | `variant_color_name` | `character varying(100)` | sim |  |  |  |
| 10 | `component_name` | `character varying(255)` | sim |  |  |  |
| 11 | `item_color_id` | `uuid` | sim |  |  |  |
| 12 | `primary_image_url` | `text` | sim |  |  |  |
| 13 | `image_source` | `character varying(30)` | sim |  |  |  |
| 14 | `is_standalone_sellable` | `boolean` | não | `false` |  |  |
| 15 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_kcvs_slot_fmt | CHECK | `CHECK (slot_code::text ~ '^(K\|E)[0-9]{1,3}$'::text)` |  |  | sim |
| kit_component_variant_skus_component_id_fkey | FOREIGN KEY | `FOREIGN KEY (component_id) REFERENCES product_kit_components(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| kit_component_variant_skus_item_color_id_fkey | FOREIGN KEY | `FOREIGN KEY (item_color_id) REFERENCES color_variations(id)` | NO ACTION | NO ACTION | sim |
| kit_component_variant_skus_kit_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (kit_product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| kit_component_variant_skus_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| kit_component_variant_skus_variant_id_fkey | FOREIGN KEY | `FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| uq_kcvs_comp_variant | UNIQUE | `UNIQUE (component_id, variant_id)` |  |  | sim |
| uq_kcvs_sku | UNIQUE | `UNIQUE (component_sku)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_kcvs_component | btree | component_id | não | sim |  | `CREATE INDEX idx_kcvs_component ON public.kit_component_variant_skus USING btree (component_id)` |
| idx_kcvs_kit | btree | kit_product_id | não | sim |  | `CREATE INDEX idx_kcvs_kit ON public.kit_component_variant_skus USING btree (kit_product_id)` |
| idx_kcvs_variant | btree | variant_id | não | sim |  | `CREATE INDEX idx_kcvs_variant ON public.kit_component_variant_skus USING btree (variant_id)` |
| idx_kit_component_variant_skus_item_color_id | btree | item_color_id | não | sim |  | `CREATE INDEX idx_kit_component_variant_skus_item_color_id ON public.kit_component_variant_skus USING btree (item_color_id)` |
| kit_component_variant_skus_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX kit_component_variant_skus_pkey ON public.kit_component_variant_skus USING btree (id)` |
| uq_kcvs_comp_variant | btree | component_id, variant_id | sim | sim |  | `CREATE UNIQUE INDEX uq_kcvs_comp_variant ON public.kit_component_variant_skus USING btree (component_id, variant_id)` |
| uq_kcvs_sku | btree | component_sku | sim | sim |  | `CREATE UNIQUE INDEX uq_kcvs_sku ON public.kit_component_variant_skus USING btree (component_sku)` |


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

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_kcvs_guard | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_kcvs_guard_not_sellable |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
