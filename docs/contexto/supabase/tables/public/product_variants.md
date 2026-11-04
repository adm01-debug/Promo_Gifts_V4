# public.product_variants

> Políticas RLS: product_variants_anon_read (is_active=true) + product_variants_public_read (authenticated, true). Separação fix_version 20260717 — anon não vê variantes inativas.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 5 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | analytics.mv_product_cards, public.v_catalog_stats, public.v_color_coverage_monitor, public.v_kit_component_skus, public.v_kit_max_quantity, public.v_products_pending_images, public.v_super_filtro_options, public.v_system_alerts, public.v_system_health_dashboard, public.v_variant_sale_prices_public, public.v_variants_with_commemorative_dates, public.vw_color_coverage, public.vw_orphan_active_variants, public.vw_product_availability, public.vw_product_color_category_links, public.vw_product_images_variant_gap, public.vw_products_pending_variants, public.vw_somarcas_materials, public.vw_spot_cf_health, public.vw_spot_color_health, public.vw_spot_image_coverage, public.vw_stock_quantity_outliers, public.vw_super_filtro_health, public.vw_variant_sale_prices |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `product_id` | `uuid` | não |  |  |  |
| 3 | `sku` | `text` | não |  |  |  |
| 4 | `name` | `text` | não |  |  |  |
| 5 | `attributes` | `jsonb` | não |  |  |  |
| 7 | `stock_quantity` | `integer` | sim | `0` |  |  |
| 8 | `images` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 9 | `is_active` | `boolean` | não | `true` |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `sku_promo` | `character varying(50)` | sim |  |  |  |
| 13 | `color_id` | `uuid` | sim |  |  |  |
| 14 | `size_id` | `uuid` | sim |  |  |  |
| 31 | `supplier_sku` | `character varying(100)` | sim |  |  |  |
| 33 | `color_code` | `character varying(20)` | sim |  |  |  |
| 34 | `color_name` | `character varying(100)` | sim |  |  |  |
| 35 | `color_hex` | `character varying(10)` | sim |  |  |  |
| 36 | `size_code` | `character varying(10)` | sim |  |  | Código do tamanho padronizado: P, M, G, GG, XGG |
| 37 | `capacity_ml` | `integer` | sim |  |  | Capacidade em MILILITROS (padrão do sistema) |
| 41 | `last_sync_at` | `timestamp with time zone` | sim |  |  | Data/hora da última sincronização |
| 42 | `last_sync_supplier_id` | `uuid` | sim |  |  | ID do fornecedor da última sincronização |
| 45 | `selected_thumbnail` | `character varying(500)` | sim |  |  | URL da imagem principal SELECIONADA para exibir no e-commerce. Usada em listagens, carrinho, e como og:image em compartilhamentos. Pode vir de qualquer fornecedor - escolha a melhor! |
| 47 | `bitrix_product_id` | `integer` | sim |  |  |  |
| 48 | `CodigoXbz` | `text` | sim |  |  |  |
| 50 | `size_length_cm` | `numeric(6,2)` | sim |  |  | GOLD: comprimento do têxtil por SKU em cm. Origem: prata (pipeline). NULL para não-têxteis |
| 51 | `size_width_cm` | `numeric(6,2)` | sim |  |  | GOLD: largura do têxtil por SKU em cm. Origem: prata (pipeline). NULL para não-têxteis |
| 52 | `next_quantity_1` | `integer` | sim |  |  | Quantidade prevista na próxima reposição (janela 1). Fonte: VSS do fornecedor preferido. |
| 53 | `next_date_1` | `date` | sim |  |  | Data prevista da próxima reposição (janela 1). NULL = sem previsão. |
| 54 | `next_quantity_2` | `integer` | sim |  |  | Quantidade prevista na reposição 2 (janela 2). |
| 55 | `next_date_2` | `date` | sim |  |  | Data prevista da reposição 2. |
| 56 | `next_quantity_3` | `integer` | sim |  |  | Quantidade prevista na reposição 3 (janela 3). |
| 57 | `next_date_3` | `date` | sim |  |  | Data prevista da reposição 3. |
| 58 | `next_quantity_4` | `integer` | sim |  |  | SPOT: NextQuantity4 (4ª janela de reposição) |
| 59 | `next_date_4` | `date` | sim |  |  | SPOT: NextDate4 (data da 4ª janela de reposição) |
| 60 | `next_quantity_5` | `integer` | sim |  |  | SPOT: NextQuantity5 (5ª janela de reposição) |
| 61 | `next_date_5` | `date` | sim |  |  | SPOT: NextDate5 (data da 5ª janela de reposição) |
| 62 | `next_quantity_6` | `integer` | sim |  |  | SPOT: NextQuantity6 (6ª janela de reposição) |
| 63 | `next_date_6` | `date` | sim |  |  | SPOT: NextDate6 (data da 6ª janela de reposição) |
| 66 | `next_entry_date` | `date` | sim |  |  |  |
| 67 | `next_entry_quantity` | `integer` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_pv_capacity_ml_positive | CHECK | `CHECK (capacity_ml > 0)` |  |  | sim |
| chk_pv_next_quantities_nonneg | CHECK | `CHECK (next_quantity_1 >= 0 AND next_quantity_2 >= 0 AND next_quantity_3 >= 0 AND next_quantity_4 >= 0 AND next_quantity_5 >= 0 AND next_quantity_6 >= 0)` |  |  | sim |
| chk_pv_size_length | CHECK | `CHECK (size_length_cm > 0::numeric AND size_length_cm <= 300::numeric)` |  |  | sim |
| chk_pv_size_width | CHECK | `CHECK (size_width_cm > 0::numeric AND size_width_cm <= 300::numeric)` |  |  | sim |
| chk_pv_stock_quantity_nonneg | CHECK | `CHECK (stock_quantity >= 0)` |  |  | sim |
| chk_variant_sku_not_empty | CHECK | `CHECK (sku IS NOT NULL AND length(TRIM(BOTH FROM sku)) > 0)` |  |  | sim |
| chk_variants_name_not_empty | CHECK | `CHECK (length(TRIM(BOTH FROM name)) > 0)` |  |  | sim |
| product_variants_color_id_fkey | FOREIGN KEY | `FOREIGN KEY (color_id) REFERENCES color_variations(id)` | NO ACTION | NO ACTION | sim |
| product_variants_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_variants_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_variants_size_id_fkey | FOREIGN KEY | `FOREIGN KEY (size_id) REFERENCES variation_values(id)` | NO ACTION | NO ACTION | sim |
| product_variants_sku_key | UNIQUE | `UNIQUE (sku)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.asia_image_import_queue | asia_image_import_queue_variant_id_fkey | variant_id | NO ACTION |
| public.commemorative_date_exclusions | commemorative_date_exclusions_variant_id_fkey | variant_id | CASCADE |
| public.kit_component_variant_skus | kit_component_variant_skus_variant_id_fkey | variant_id | CASCADE |
| public.markup_configurations | markup_configurations_variant_id_fkey | variant_id | CASCADE |
| public.price_history | price_history_variant_id_fkey | variant_id | CASCADE |
| public.product_images | product_images_variant_id_fkey | variant_id | SET NULL |
| public.produtos_padronizacao_variantes | produtos_padronizacao_variantes_variant_id_fkey | variant_id | SET NULL |
| public.quote_items | quote_items_product_variant_id_fkey | product_variant_id | SET NULL |
| public.stock_daily_summary | stock_daily_summary_variant_id_fkey | variant_id | CASCADE |
| public.stock_snapshots | stock_snapshots_variant_id_fkey | variant_id | CASCADE |
| public.supplier_products_raw | supplier_products_raw_variant_id_fkey | variant_id | SET NULL |
| public.variant_commemorative_dates | variant_commemorative_dates_variant_id_fkey | variant_id | CASCADE |
| public.variant_supplier_sources | variant_stocks_variant_id_fkey | variant_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_product_variants_product_id | btree | product_id | não | sim |  | `CREATE INDEX idx_product_variants_product_id ON public.product_variants USING btree (product_id)` |
| idx_product_variants_size_id | btree | size_id | não | sim |  | `CREATE INDEX idx_product_variants_size_id ON public.product_variants USING btree (size_id)` |
| idx_pv_next_date_1 | btree | next_date_1 | não | sim | `(next_date_1 IS NOT NULL)` | `CREATE INDEX idx_pv_next_date_1 ON public.product_variants USING btree (next_date_1) WHERE (next_date_1 IS NOT NULL)` |
| idx_pv_next_entry_date_nonnull | btree | next_entry_date | não | sim | `(next_entry_date IS NOT NULL)` | `CREATE INDEX idx_pv_next_entry_date_nonnull ON public.product_variants USING btree (next_entry_date) WHERE (next_entry_date IS NOT NULL)` |
| idx_pv_supplier_sku | btree | supplier_sku | não | sim |  | `CREATE INDEX idx_pv_supplier_sku ON public.product_variants USING btree (supplier_sku)` |
| idx_variants_capacity_ml | btree | capacity_ml | não | sim |  | `CREATE INDEX idx_variants_capacity_ml ON public.product_variants USING btree (capacity_ml)` |
| idx_variants_color_name_active | btree | color_name | não | sim | `((is_active = true) AND (color_name IS NOT NULL))` | `CREATE INDEX idx_variants_color_name_active ON public.product_variants USING btree (color_name) WHERE ((is_active = true) AND (color_name IS NOT NULL))` |
| idx_variants_size_code | btree | size_code | não | sim |  | `CREATE INDEX idx_variants_size_code ON public.product_variants USING btree (size_code)` |
| idx_variants_stock_active | btree | stock_quantity | não | sim | `(is_active = true)` | `CREATE INDEX idx_variants_stock_active ON public.product_variants USING btree (stock_quantity DESC) WHERE (is_active = true)` |
| product_variants_active_idx | btree | product_id, is_active | não | sim | `(is_active = true)` | `CREATE INDEX product_variants_active_idx ON public.product_variants USING btree (product_id, is_active) WHERE (is_active = true)` |
| product_variants_color_id_idx | btree | color_id | não | sim |  | `CREATE INDEX product_variants_color_id_idx ON public.product_variants USING btree (color_id)` |
| product_variants_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_variants_pkey ON public.product_variants USING btree (id)` |
| product_variants_sku_key | btree | sku | sim | sim |  | `CREATE UNIQUE INDEX product_variants_sku_key ON public.product_variants USING btree (sku)` |


## Policies (RLS)

### `product_variants_anon_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `(is_active = true)` |
| WITH CHECK |  |

### `product_variants_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_variants.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |
| WITH CHECK |  |

### `product_variants_oa_ins`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_variants.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |

### `product_variants_oa_upd`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_variants.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_variants.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |

### `product_variants_public_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |
| trg_auto_link_feminine_color | AFTER | INSERT OR UPDATE | ROW | enabled | public.fn_auto_link_feminine_color |
| trg_auto_link_variant_color | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.trigger_auto_link_variant_color |
| trg_auto_resolve_variant_color | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_auto_vincular_cor_variante |
| trg_cascade_deactivate_vss | AFTER | UPDATE | ROW | enabled | public.fn_cascade_deactivate_vss |
| trg_enforce_inactive_variant_zero_stock | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_enforce_inactive_variant_zero_stock |
| trg_gerar_nome_variante | BEFORE | INSERT | ROW | enabled | public.gerar_nome_variante |
| trg_log_price_change | AFTER | UPDATE | ROW | enabled | public.fn_log_price_change |
| trg_rebuild_swatches_on_variant | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_trigger_rebuild_swatches_on_variant |
| trg_sync_colors_to_product | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_trigger_sync_colors_to_product |
| trg_sync_has_sizes | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_sync_product_has_sizes |
| trg_sync_stock_from_variant | AFTER | DELETE OR UPDATE | ROW | enabled | public.fn_sync_product_stock_cache |
| trg_sync_variant_to_product | AFTER | UPDATE | ROW | enabled | public.fn_sync_variant_to_product |
| trg_variant_automation | AFTER | INSERT | ROW | enabled | public.fn_trigger_variant_automation |
| trg_zz_sanitize_restock_dates | BEFORE | INSERT OR UPDATE | ROW | enabled | public.trg_fn_sanitize_restock_dates |
| trg_zzz_sync_next_entry_cols | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_sync_product_variants_next_entry |


## Grants

| role | privilégios |
|---|---|
| anon | SELECT |
| authenticated | DELETE, INSERT, SELECT, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
