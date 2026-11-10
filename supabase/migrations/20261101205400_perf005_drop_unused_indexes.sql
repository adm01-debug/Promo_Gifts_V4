-- PERF-005: Drop unused indexes (idx_scan=0 após VACUUM ANALYZE 2026-11-01 19:37 UTC)
-- Severidade: ALTO | Tipo: PERFORMANCE
-- Evidência: pg_stat_user_indexes idx_scan=0 em ~449 índices; este lote = 52 índices mais pesados
-- Critério: NOT PK, NOT UNIQUE, NOT constraint, idx_scan=0; excluídos search/trgm/gin/security/mv/pipeline
-- Estimativa de storage liberado: ~200MB
--
-- ROLLBACK: reconstruir índice individualmente com CREATE INDEX CONCURRENTLY; scripts em docs/perf/perf005_rollback_indexes.sql
-- Nota: DROP INDEX sem CONCURRENTLY adquire ShareUpdateExclusiveLock (não bloqueia leitura/escrita)

-- stock_daily_summary FK indexes (~82MB)
DROP INDEX IF EXISTS public.idx_stock_daily_summary_supplier_branch_id;
DROP INDEX IF EXISTS public.idx_stock_daily_summary_supplier_id;
DROP INDEX IF EXISTS public.idx_sds_variant_id;

-- supplier_products_raw indexes obsoletos (não criados pelo PERF-001)
DROP INDEX IF EXISTS public.idx_spr_supplier_source_channel;
DROP INDEX IF EXISTS public.idx_spr_import_batch_id;
DROP INDEX IF EXISTS public.idx_spr_variant_id;
DROP INDEX IF EXISTS public.idx_spr_images_pending;

-- variant_supplier_sources menos usados
DROP INDEX IF EXISTS public.idx_vss_cost;
DROP INDEX IF EXISTS public.idx_vss_org_supplier;
DROP INDEX IF EXISTS public.idx_vss_supplier_sku_xbz;
DROP INDEX IF EXISTS public.idx_variant_supplier_sources_supplier_branch_id;

-- produto_ramo_atividade
DROP INDEX IF EXISTS public.idx_produto_ramo_atividade_filho;
DROP INDEX IF EXISTS public.idx_produto_ramo_atividade_produto;

-- produtos_padronizacao e variantes (tabelas internas de mapeamento)
DROP INDEX IF EXISTS public.idx_padvar_raw_id;
DROP INDEX IF EXISTS public.idx_padvar_pad;
DROP INDEX IF EXISTS public.idx_padvar_sem_colorid;
DROP INDEX IF EXISTS public.idx_pad_product;
DROP INDEX IF EXISTS public.idx_produtos_padronizacao_sub_brand_id;
DROP INDEX IF EXISTS public.idx_produtos_site_padronizacao_raw_id;

-- kit_component indexes (processamento interno)
DROP INDEX IF EXISTS public.idx_kcer_component;
DROP INDEX IF EXISTS public.idx_kcer_kit;
DROP INDEX IF EXISTS public.idx_kcer_source;
DROP INDEX IF EXISTS public.idx_kit_component_enrichment_raw_promoted_padronizacao_id;
DROP INDEX IF EXISTS public.idx_kit_component_enrichment_raw_promoted_component_id;
DROP INDEX IF EXISTS public.idx_kit_component_padronizacao_raw_id;
DROP INDEX IF EXISTS public.idx_kcpad_kit;
DROP INDEX IF EXISTS public.idx_kcpa_component;
DROP INDEX IF EXISTS public.idx_pkc_enrichment_status;
DROP INDEX IF EXISTS public.idx_kit_components_name;
DROP INDEX IF EXISTS public.idx_kit_components_kit;
DROP INDEX IF EXISTS public.idx_product_kit_components_secondary_material_type_id;
DROP INDEX IF EXISTS public.idx_product_kit_components_component_product_id;
DROP INDEX IF EXISTS public.idx_pkc_material;
DROP INDEX IF EXISTS public.idx_product_kit_components_padronizacao_id;
DROP INDEX IF EXISTS public.idx_pkc_color_id;

-- ai_enrichment_queue (processamento interno)
DROP INDEX IF EXISTS public.idx_ai_queue_product_id;
DROP INDEX IF EXISTS public.idx_ai_queue_pending;

-- image_backfill_queue
DROP INDEX IF EXISTS public.idx_backfill_queue_dispatch;

-- product_commemorative_dates FK indexes
DROP INDEX IF EXISTS public.idx_prod_comm_product;
DROP INDEX IF EXISTS public.idx_product_commemorative_dates_commemorative_date_id;
DROP INDEX IF EXISTS public.idx_product_commemorative_dates_category_id;

-- product_properties FK indexes
DROP INDEX IF EXISTS public.idx_product_properties_source;
DROP INDEX IF EXISTS public.idx_product_properties_property_definition_id;

-- product_packaging_compatibility
DROP INDEX IF EXISTS public.idx_pkg_compat_product;
DROP INDEX IF EXISTS public.idx_pkg_compat_packaging;

-- supplier_import_batches FK
DROP INDEX IF EXISTS public.idx_supplier_import_batches_supplier_id;

-- supplier_replenishment_events
DROP INDEX IF EXISTS public.idx_sre_variant_date;
DROP INDEX IF EXISTS public.idx_sre_supplier_date;
DROP INDEX IF EXISTS public.idx_sre_pending;
DROP INDEX IF EXISTS public.idx_sre_arrival_snapshot;

-- produtos internos (admin/fiscal/xbz)
DROP INDEX IF EXISTS public.idx_products_padronizacao_id;
DROP INDEX IF EXISTS public.idx_products_ncm_id;
DROP INDEX IF EXISTS public.idx_products_sub_brand_id;
DROP INDEX IF EXISTS public.idx_products_xbz_reliability;
DROP INDEX IF EXISTS public.idx_product_fiscal_ncm_id;
DROP INDEX IF EXISTS public.idx_product_fiscal_ncm_code;

-- xbz staging
DROP INDEX IF EXISTS public.idx_xbz_upload_mapping_status;
DROP INDEX IF EXISTS public.idx_xbz_staging_status;

-- frontend_telemetry (analytics interno)
DROP INDEX IF EXISTS public.idx_frontend_telemetry_user_id;

-- product_supply
DROP INDEX IF EXISTS public.idx_product_supply_sync_status;

-- tabela_preco_gravacao FK/range
DROP INDEX IF EXISTS public.idx_faixa_v11_dim;
DROP INDEX IF EXISTS public.idx_tpgof_tabela_qty;

-- print_area_techniques
DROP INDEX IF EXISTS public.idx_pat_tabela;
DROP INDEX IF EXISTS public.idx_pat_location_code;
