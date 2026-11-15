-- E056 / SEC-001 — Revogar EXECUTE de PUBLIC e anon em funções trigger/internas sem ref no TS
-- Critério (levantamento de 2026-11-01): has_function_privilege('anon', oid, 'EXECUTE') = true
--           AND zero refs em src/**/*.{ts,tsx} e supabase/functions/**/*.ts
--           AND não referenciada em nenhuma expressão de RLS (polqual/polwithcheck)
-- 106 funções identificadas — todas trigger handlers, sync hooks ou utilities internas.
-- Verificação RLS: grep em supabase/migrations/ por USING/WITH CHECK → zero matches.
-- Revalidação em 2026-11-15 contra o main: as 106 existem no baseline
-- supabase/baseline/20261015140000_baseline_schema.sql (CREATE OR REPLACE FUNCTION "public"."…"),
-- nenhuma migration em supabase/migrations/ as dropa ou já revoga PUBLIC/anon (só
-- 20260626181632 revoga authenticated de fn_trigger_auto_sync_dimensions — não conflita).
-- Segurança de triggers: PostgreSQL NÃO verifica EXECUTE privilege para invocações
-- via trigger mechanism — apenas para chamadas diretas. O REVOKE é seguro.
-- "FROM PUBLIC, anon": o ALTER DEFAULT PRIVILEGES do Supabase concede EXECUTE a anon
-- explicitamente (além do default a PUBLIC); revogar só PUBLIC deixaria o grant direto de anon.
-- Versão anterior: 20261101210000 na branch claude/fix-sec001-revoke-anon-trigger-funcs-261101-2230
-- (nunca aplicada); renumerada porque o main já tem 20261101210000_sb0007_drop_noop_restrictive_policies.
-- Se alguma função tiver sido removida fora do fluxo, o REVOKE falha e a transação inteira reverte
-- (fail-loud, de propósito): confira com pg_proc e ajuste a lista por nova migration.
-- Rollback: supabase/rollbacks/20261115130200_rollback.sql

REVOKE EXECUTE ON FUNCTION public.fn_audit_role_changes() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_auto_classify_kit_product() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_auto_classify_packing() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_auto_classify_product_image() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_auto_criar_equivalencia_spot() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_auto_link_eco_material() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_auto_link_feminine_color() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_auto_set_same_supplier() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_auto_vincular_cor_variante() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_block_unauthorized_product_deactivation() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_category_copywriting_updated() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_color_equiv_clear_primary_on_inactive() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_color_equiv_ensure_primary() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_color_equiv_ensure_primary_stmt() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_cor_generate_slug() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_cor_updated_at() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_custom_kits_sync_user_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_dar_check_valid_until_future() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_dar_set_snapshot_hash() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_enforce_inactive_variant_zero_stock() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_ensure_single_primary_image() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_force_user_logout() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_hex_to_rgb(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_image_types_check_constraint_reminder() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_inherit_techniques_from_material() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_kit_component_calc_circumference() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_kit_component_inherit_personalization() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_kit_print_area_normalizar_eixos() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_log_login_attempt() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_log_price_change() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_log_step_up_event() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_normalize_image_format() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_normalize_source_supplier() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_normalize_source_supplier_videos() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_order_items_calc_subtotal() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_orders_sync_seller() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_pad_sync_status() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_pbd_before_write() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_pbd_block_system_delete() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_pipeline_steps_updated_at() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_pkc_auto_enrich_status() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_pkc_auto_inherit_material() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_products_capture_manual_edits() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_propagar_atualizacao_cor() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_quote_items_calc_subtotal() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_quotes_sync_seller() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_recalc_compat_on_dim_change() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_set_updated_at_aeq() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_set_updated_at_pa() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_silver_set_updated_at() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_sm_category_set_updated() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_sm_url_map_set_updated() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_spr_before_write() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_spr_normalize_keys() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_sync_color_variation_group() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_sync_dimensions_display() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_sync_image_type_code() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_sync_novelty_expires_at() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_sync_product_category_name() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_sync_product_has_sizes() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_sync_variant_to_product() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_sync_vss_to_variant() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_trigger_auto_classify_product() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_trigger_auto_extract_attributes() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_trigger_auto_sync_dimensions() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_trigger_calculate_sale_price() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_trigger_classify_packing() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_trigger_extract_materials_from_name() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_trigger_product_status_sync_category_count() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_trigger_propagate_category_min() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_trigger_propagate_fpr() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_trigger_set_has_gift_box() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_trigger_set_has_optional_packaging() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_trigger_set_min_quantity() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_trigger_supplier_source_price() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_trigger_sync_category_ancestors() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_trigger_sync_colors_to_product() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_trigger_sync_descendants_count() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_trigger_sync_pca_products_count() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_trigger_sync_product_status_fields() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_trigger_track_price_updated_products() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_trigger_track_price_updated_vss() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_trigger_update_price_last_verified() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_trigger_variant_automation() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_trigger_variant_price() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_update_cat_acc_timestamp() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_update_cat_comm_timestamp() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_update_prod_comm_timestamp() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_update_product_search_vector() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_update_ptm_timestamp() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_update_target_aud_timestamp() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_update_timestamp() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_update_updated_at() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_validate_packaging_config_hierarchy() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_validate_packaging_type_on_compat() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_validate_role_change() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_validate_selected_packaging() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_validate_video_on_change() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_vss_sync_warehouse_from_qty() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_xbz_derivar_campos_editoriais() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_xbz_enrich_from_site() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_xbz_propagate_site_to_silver() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_quote_version() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.products_search_vector_update() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.trg_content_articles_updated_at() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.trg_fn_sanitize_restock_dates() FROM PUBLIC, anon;
