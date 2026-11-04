# public.produtos_padronizacao_variantes

> SILVER oficial (Medallion) — variantes. Staging raw_id->pad_id->variant_id. Bronze->Silver via fn_standardize_variant; Silver->Gold via fn_promote_variants_of_parent.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.v_system_alerts, public.vw_asia_products_by_category, public.vw_asia_products_by_color, public.vw_asia_products_by_tag, public.vw_asia_products_low_stock, public.vw_asia_products_pending, public.vw_asia_products_promo, public.vw_asia_products_stats |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `raw_id` | `uuid` | sim |  |  |  |
| 3 | `supplier_id` | `uuid` | não |  |  |  |
| 4 | `parent_reference` | `text` | não |  |  | Referência do pai (texto). Para o vínculo confiável use pad_id; parent_reference pode ter pontas soltas se o pai foi removido. |
| 5 | `variant_reference` | `text` | não |  |  | Referência da VARIANTE no fornecedor. Única por supplier_id. |
| 6 | `sku` | `text` | sim |  |  |  |
| 7 | `supplier_sku` | `text` | sim |  |  |  |
| 8 | `color_name` | `text` | sim |  |  |  |
| 9 | `color_code` | `text` | sim |  |  |  |
| 10 | `color_hex` | `text` | sim |  |  |  |
| 11 | `color_id` | `uuid` | sim |  |  | Cor canônica (color_variations.id) — o de-para de cor. CHECK garante que, se preenchido, color_name também está. |
| 12 | `stock_quantity` | `integer` | sim |  |  |  |
| 13 | `capacity_ml` | `integer` | sim |  |  |  |
| 14 | `cost_price` | `numeric` | sim |  |  |  |
| 15 | `is_active` | `boolean` | sim | `true` |  |  |
| 16 | `pad_id` | `uuid` | sim |  |  | FK forte para o pai (produtos_padronizacao). SET NULL se o pai for removido. |
| 17 | `variant_id` | `uuid` | sim |  |  | Vínculo com o gold (product_variants). Preenchido na promoção. SET NULL se a variante do gold for removida. |
| 18 | `status` | `produtos_padronizacao_status` | não | `'pending'::produtos_padronizacao_status` |  |  |
| 19 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 20 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 21 | `cost_price_1` | `numeric` | sim |  |  |  |
| 22 | `cost_price_2` | `numeric` | sim |  |  |  |
| 23 | `cost_price_3` | `numeric` | sim |  |  |  |
| 24 | `cost_price_4` | `numeric` | sim |  |  |  |
| 25 | `cost_price_5` | `numeric` | sim |  |  |  |
| 26 | `min_qty_1` | `integer` | sim |  |  |  |
| 27 | `min_qty_2` | `integer` | sim |  |  |  |
| 28 | `min_qty_3` | `integer` | sim |  |  |  |
| 29 | `min_qty_4` | `integer` | sim |  |  |  |
| 30 | `min_qty_5` | `integer` | sim |  |  |  |
| 31 | `next_quantity_1` | `integer` | sim |  |  |  |
| 32 | `next_quantity_2` | `integer` | sim |  |  |  |
| 33 | `next_quantity_3` | `integer` | sim |  |  |  |
| 34 | `next_date_1` | `date` | sim |  |  |  |
| 35 | `next_date_2` | `date` | sim |  |  |  |
| 36 | `next_date_3` | `date` | sim |  |  |  |
| 37 | `sale_multiplier` | `integer` | sim |  |  |  |
| 38 | `supplier_thumbnail` | `text` | sim |  |  |  |
| 39 | `supplier_images` | `jsonb` | sim |  |  |  |
| 40 | `supplier_videos` | `jsonb` | sim |  |  |  |
| 41 | `next_quantity_4` | `integer` | sim |  |  |  |
| 42 | `next_quantity_5` | `integer` | sim |  |  |  |
| 43 | `next_quantity_6` | `integer` | sim |  |  |  |
| 44 | `next_date_4` | `date` | sim |  |  |  |
| 45 | `next_date_5` | `date` | sim |  |  |  |
| 46 | `next_date_6` | `date` | sim |  |  |  |
| 47 | `your_price` | `numeric` | sim |  |  |  |
| 48 | `color_name_2` | `text` | sim |  |  | Cor secundária do fornecedor (CorWebSecundaria). Preenchida SOMENTE quando diferente da cor principal — indica detalhe/acabamento bicolor. |
| 49 | `color_code_2` | `text` | sim |  |  | Código da cor secundária. |
| 50 | `color_hex_2` | `text` | sim |  |  | Hex da cor secundária (via supplier_colors). |
| 51 | `color_id_2` | `uuid` | sim |  |  | FK → color_variations. De-para canônico da cor secundária. SET NULL se a variante de cor for removida. |
| 52 | `size_code` | `character varying(10)` | sim |  |  | PRATA: tamanho têxtil canônico (P/M/G/GG/XGG/UN) via supplier_value_mappings field_type=size |
| 53 | `size_length_cm` | `numeric(6,2)` | sim |  |  | PRATA: comprimento do têxtil por SKU em cm (Spot: SizeLengthCM). Clamp (0,300] |
| 54 | `size_width_cm` | `numeric(6,2)` | sim |  |  | PRATA: largura do têxtil por SKU em cm (Spot: SizeWidthCM). Clamp (0,300] |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_padvar_color_id_requer_nome | CHECK | `CHECK (color_id IS NULL OR length(TRIM(BOTH FROM COALESCE(color_name, ''::text))) > 0)` |  |  | sim |
| chk_padvar_custo_nao_negativo | CHECK | `CHECK (cost_price IS NULL OR cost_price >= 0::numeric)` |  |  | sim |
| chk_padvar_refs_nao_vazias | CHECK | `CHECK (length(TRIM(BOTH FROM variant_reference)) > 0 AND length(TRIM(BOTH FROM parent_reference)) > 0)` |  |  | sim |
| chk_ppv_size_length | CHECK | `CHECK (size_length_cm > 0::numeric AND size_length_cm <= 300::numeric)` |  |  | sim |
| chk_ppv_size_width | CHECK | `CHECK (size_width_cm > 0::numeric AND size_width_cm <= 300::numeric)` |  |  | sim |
| produtos_padronizacao_variantes_color_id_2_fkey | FOREIGN KEY | `FOREIGN KEY (color_id_2) REFERENCES color_variations(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| produtos_padronizacao_variantes_pad_id_fkey | FOREIGN KEY | `FOREIGN KEY (pad_id) REFERENCES produtos_padronizacao(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| produtos_padronizacao_variantes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| produtos_padronizacao_variantes_raw_id_fkey | FOREIGN KEY | `FOREIGN KEY (raw_id) REFERENCES supplier_products_raw(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| produtos_padronizacao_variantes_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id)` | NO ACTION | NO ACTION | sim |
| produtos_padronizacao_variantes_variant_id_fkey | FOREIGN KEY | `FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| uq_padvar_supplier_variant | UNIQUE | `UNIQUE (supplier_id, variant_reference)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_padvar_color_id_2 | btree | color_id_2 | não | sim | `(color_id_2 IS NOT NULL)` | `CREATE INDEX idx_padvar_color_id_2 ON public.produtos_padronizacao_variantes USING btree (color_id_2) WHERE (color_id_2 IS NOT NULL)` |
| idx_padvar_pad | btree | pad_id | não | sim | `(pad_id IS NOT NULL)` | `CREATE INDEX idx_padvar_pad ON public.produtos_padronizacao_variantes USING btree (pad_id) WHERE (pad_id IS NOT NULL)` |
| idx_padvar_parent | btree | supplier_id, parent_reference | não | sim |  | `CREATE INDEX idx_padvar_parent ON public.produtos_padronizacao_variantes USING btree (supplier_id, parent_reference)` |
| idx_padvar_raw_id | btree | raw_id | não | sim | `(raw_id IS NOT NULL)` | `CREATE INDEX idx_padvar_raw_id ON public.produtos_padronizacao_variantes USING btree (raw_id) WHERE (raw_id IS NOT NULL)` |
| idx_padvar_sem_colorid | btree | supplier_id | não | sim | `(color_id IS NULL)` | `CREATE INDEX idx_padvar_sem_colorid ON public.produtos_padronizacao_variantes USING btree (supplier_id) WHERE (color_id IS NULL)` |
| idx_padvar_status | btree | supplier_id | não | sim | `(status = 'pending'::produtos_padronizacao_status)` | `CREATE INDEX idx_padvar_status ON public.produtos_padronizacao_variantes USING btree (supplier_id) WHERE (status = 'pending'::produtos_padronizacao_status)` |
| idx_produtos_padronizacao_variantes_variant_id | btree | variant_id | não | sim |  | `CREATE INDEX idx_produtos_padronizacao_variantes_variant_id ON public.produtos_padronizacao_variantes USING btree (variant_id)` |
| produtos_padronizacao_variantes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX produtos_padronizacao_variantes_pkey ON public.produtos_padronizacao_variantes USING btree (id)` |
| uq_padvar_supplier_variant | btree | supplier_id, variant_reference | sim | sim |  | `CREATE UNIQUE INDEX uq_padvar_supplier_variant ON public.produtos_padronizacao_variantes USING btree (supplier_id, variant_reference)` |


## Policies (RLS)

### `pad_var_authenticated_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `pad_var_service_all`

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
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |
| trg_aa_padvar_sync | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_padvar_sync |
| trg_xbz_resolver_cor_secundaria | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_xbz_resolver_cor_secundaria |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
