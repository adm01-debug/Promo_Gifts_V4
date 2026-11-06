# public.suppliers

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
| usada por views | analytics.mv_media_health, public.mv_stock_rupture_alert, public.mv_supplier_reliability, public.v_dimensions_source_divergence, public.v_kit_completeness_by_supplier, public.v_kit_component_complete, public.v_kit_component_identity_health, public.v_kit_enrichment_dashboard, public.v_kit_pipeline_health, public.v_product_active_badge, public.v_products_ai_coverage, public.v_products_dimensions_audit, public.v_products_name_audit, public.v_products_pending_images, public.v_suppliers_public, public.v_system_alerts, public.v_system_health_dashboard, public.v_variant_sale_prices_public, public.vw_category_mapping_gaps, public.vw_color_coverage, public.vw_color_mapping, public.vw_material_health, public.vw_medallion_coverage, public.vw_packaging_suppliers, public.vw_packagings_catalog, public.vw_product_notebook_complete, public.vw_products_commercial_packing, public.vw_products_packaging_info, public.vw_products_pending_variants, public.vw_products_seo_status, public.vw_produtos_sem_ncm, public.vw_source_channel_coverage, public.vw_spot_cf_health, public.vw_spot_image_coverage, public.vw_spot_price_alerts, public.vw_supplier_category_coverage, public.vw_supplier_color_mappings, public.vw_supplier_field_mappings_summary, public.vw_supplier_products_raw_errors, public.vw_supplier_products_raw_status, public.vw_variant_sale_prices, public.vw_xbz_produtos_sem_imagem |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `name` | `text` | não |  |  |  |
| 3 | `code` | `text` | não |  |  |  |
| 4 | `cnpj` | `text` | sim |  |  |  |
| 5 | `contact_name` | `text` | sim |  |  |  |
| 6 | `email` | `text` | sim |  |  |  |
| 7 | `phone` | `text` | sim |  |  |  |
| 8 | `address` | `text` | sim |  |  |  |
| 9 | `active` | `boolean` | sim | `true` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `website` | `text` | sim |  |  |  |
| 12 | `contact_person` | `text` | sim |  |  |  |
| 13 | `payment_terms` | `text` | sim |  |  |  |
| 14 | `delivery_time_days` | `integer` | sim |  |  |  |
| 15 | `minimum_order_value` | `numeric(10,2)` | sim |  |  |  |
| 16 | `notes` | `text` | sim |  |  |  |
| 17 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 18 | `organization_id` | `uuid` | sim |  |  |  |
| 19 | `trading_name` | `character varying(255)` | sim |  |  |  |
| 20 | `api_type` | `character varying(20)` | sim |  |  |  |
| 21 | `api_base_url` | `text` | sim |  |  |  |
| 22 | `api_credentials` | `jsonb` | sim |  |  |  |
| 23 | `min_order_value` | `numeric(10,2)` | sim |  |  |  |
| 24 | `shipping_terms` | `text` | sim |  |  |  |
| 25 | `default_markup_percent` | `numeric(5,2)` | sim | `50.00` |  | Markup padrão em % para produtos deste fornecedor. Ex: 50 = preço venda é 1.5x o custo |
| 26 | `is_product_supplier` | `boolean` | sim | `true` |  | Indica se o fornecedor fornece produtos para revenda |
| 27 | `is_engraving_supplier` | `boolean` | sim | `false` |  | Indica se o fornecedor oferece serviços de gravação/personalização |
| 28 | `sync_enabled` | `boolean` | sim | `true` |  | Habilitar sincronização automática com API do fornecedor |
| 29 | `sync_interval_minutes` | `integer` | sim | `240` |  | Intervalo entre sincronizações em minutos (padrão: 240 = 4 horas) |
| 30 | `last_full_sync_at` | `timestamp with time zone` | sim |  |  | Data/hora da última sincronização completa bem-sucedida |
| 31 | `last_sync_status` | `character varying(50)` | sim |  |  | Status da última sync: success, error, in_progress, partial |
| 32 | `last_sync_error` | `text` | sim |  |  | Mensagem de erro detalhada se last_sync_status = error |
| 33 | `api_rate_limit_per_hour` | `integer` | sim | `100` |  | Limite máximo de requisições à API por hora |
| 34 | `priority` | `integer` | sim | `99` |  | Prioridade do fornecedor para escolha automática (1 = maior prioridade) |
| 35 | `api_requests_current_hour` | `integer` | sim | `0` |  | Contador de requisições na hora atual (resetado a cada hora) |
| 36 | `api_requests_reset_at` | `timestamp with time zone` | sim | `now()` |  | Timestamp do último reset do contador de requisições |
| 37 | `state_uf` | `character varying(2)` | sim |  |  | UF da matriz do fornecedor. Para filiais especificas, usar supplier_branches. |
| 38 | `tax_regime` | `character varying(30)` | sim |  |  |  |
| 39 | `inscricao_estadual` | `character varying(20)` | sim |  |  | IE principal do fornecedor (da matriz). Para IE de filiais, usar supplier_branches.inscricao_estadual |
| 40 | `phone2` | `character varying(30)` | sim |  |  | Telefone fixo secundário |
| 41 | `logo_url` | `text` | sim |  |  | URL do logo do fornecedor |
| 42 | `low_stock_threshold` | `integer` | não | `10` |  | Threshold de estoque baixo para o badge "Estoque Baixo" no catálogo. Padrão 10 unidades. Configurável por fornecedor pois volumes variam muito (XBZ/Spot: pequenos lotes, Asia Import: grandes volumes). |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_low_stock_threshold_positive | CHECK | `CHECK (low_stock_threshold > 0)` |  |  | sim |
| suppliers_cnpj_digits_only_chk | CHECK | `CHECK (cnpj IS NULL OR cnpj ~ '^[0-9]+$'::text)` |  |  | sim |
| suppliers_cnpj_length_chk | CHECK | `CHECK (cnpj IS NULL OR length(cnpj) = 14)` |  |  | sim |
| suppliers_code_key | UNIQUE | `UNIQUE (code)` |  |  | sim |
| suppliers_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| suppliers_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.attribute_equivalences | attribute_equivalences_supplier_id_fkey | supplier_id | NO ACTION |
| public.color_synonym_map | color_synonym_map_supplier_id_fkey | supplier_id | NO ACTION |
| public.markup_configurations | markup_configurations_supplier_id_fkey | supplier_id | CASCADE |
| public.pipeline_known_issues | pipeline_known_issues_supplier_id_fkey | supplier_id | NO ACTION |
| public.product_deactivation_requests | product_deactivation_requests_supplier_id_fkey | supplier_id | NO ACTION |
| public.product_included_packagings | product_included_packagings_supplier_id_fkey | supplier_id | SET NULL |
| public.product_novelties | fk_pn_supplier | supplier_id | SET NULL |
| public.product_similarity_group_members | product_similarity_group_members_supplier_id_fkey | supplier_id | NO ACTION |
| public.products | products_supplier_id_fkey | supplier_id | NO ACTION |
| public.produtos_padronizacao | produtos_padronizacao_supplier_id_fkey | supplier_id | NO ACTION |
| public.produtos_padronizacao_variantes | produtos_padronizacao_variantes_supplier_id_fkey | supplier_id | NO ACTION |
| public.sm_site_url_map | sm_site_url_map_supplier_id_fkey | supplier_id | CASCADE |
| public.stock_daily_summary | stock_daily_summary_supplier_id_fkey | supplier_id | NO ACTION |
| public.stock_notes | stock_notes_supplier_id_fkey | supplier_id | SET NULL |
| public.stock_snapshots | stock_snapshots_supplier_id_fkey | supplier_id | NO ACTION |
| public.supplier_attribute_definitions | supplier_attribute_definitions_supplier_id_fkey | supplier_id | NO ACTION |
| public.supplier_branches | supplier_branches_supplier_id_fkey | supplier_id | CASCADE |
| public.supplier_categories | supplier_categories_supplier_id_fkey | supplier_id | NO ACTION |
| public.supplier_colors | supplier_colors_supplier_id_fkey | supplier_id | CASCADE |
| public.supplier_customization_raw | supplier_customization_raw_supplier_id_fkey | supplier_id | RESTRICT |
| public.supplier_field_mappings | supplier_field_mappings_supplier_id_fkey | supplier_id | NO ACTION |
| public.supplier_field_priority | supplier_field_priority_supplier_id_fkey | supplier_id | NO ACTION |
| public.supplier_import_batches | supplier_import_batches_supplier_id_fkey | supplier_id | NO ACTION |
| public.supplier_materials | supplier_materials_supplier_id_fkey | supplier_id | CASCADE |
| public.supplier_packagings | supplier_packagings_supplier_id_fkey | supplier_id | CASCADE |
| public.supplier_products_raw | supplier_products_raw_supplier_id_fkey | supplier_id | RESTRICT |
| public.supplier_property_mappings | supplier_property_mappings_supplier_id_fkey | supplier_id | CASCADE |
| public.supplier_settings | supplier_settings_supplier_id_fkey | supplier_id | CASCADE |
| public.supplier_sub_brands | supplier_sub_brands_supplier_id_fkey | supplier_id | NO ACTION |
| public.supplier_unit_conversions | supplier_unit_conversions_supplier_id_fkey | supplier_id | NO ACTION |
| public.supplier_value_mappings | supplier_value_mappings_supplier_id_fkey | supplier_id | NO ACTION |
| public.variant_supplier_sources | variant_stocks_supplier_id_fkey | supplier_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_suppliers_priority | btree | priority, active | não | sim | `(active = true)` | `CREATE INDEX idx_suppliers_priority ON public.suppliers USING btree (priority, active) WHERE (active = true)` |
| suppliers_cnpj_org_uniq | btree | organization_id, cnpj | sim | sim | `(cnpj IS NOT NULL)` | `CREATE UNIQUE INDEX suppliers_cnpj_org_uniq ON public.suppliers USING btree (organization_id, cnpj) NULLS NOT DISTINCT WHERE (cnpj IS NOT NULL)` |
| suppliers_code_key | btree | code | sim | sim |  | `CREATE UNIQUE INDEX suppliers_code_key ON public.suppliers USING btree (code)` |
| suppliers_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX suppliers_pkey ON public.suppliers USING btree (id)` |


## Policies (RLS)

### `suppliers_anon_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `(active = true)` |
| WITH CHECK |  |

### `suppliers_authenticated_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `suppliers_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK |  |

### `suppliers_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `is_org_owner_or_admin(organization_id)` |

### `suppliers_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK | `is_org_owner_or_admin(organization_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |
| trg_audit_suppliers | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_audit_row_change |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
