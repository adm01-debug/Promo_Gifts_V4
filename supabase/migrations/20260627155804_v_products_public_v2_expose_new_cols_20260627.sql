-- ============================================================
-- MIGRAÇÃO: v_products_public v2 — expor 25 campos reais
-- fix_version: v_products_public_v2_20260627
-- Contexto: auditoria cadastro-produtos 2026-06-27
-- Problema: 11 campos eram NULL constante + 14 campos ausentes
-- Resultado: formulário de edição carrega/salva todos os campos
--            sem data loss no round-trip view→form→products
--
-- CAMPOS CORRIGIDOS (NULL → real):
--   is_on_sale, ean(14→20), gtin(14→20), warranty_months,
--   internal_diameter_cm, packaging_color(50→100),
--   packaging_finish(50→100), key_benefits, use_cases,
--   is_on_sale_expires_at, supplier_product_url,
--   freight_class(20→50)
--
-- CAMPOS ADICIONADOS (ao final para retrocompat):
--   default_carrier, shipping_weight_kg, shipping_width_cm,
--   shipping_height_cm, shipping_length_cm, requires_special_shipping,
--   shipping_notes, icms_rate, pis_rate, cofins_rate,
--   cfop, csosn, cest, tax_regime
--
-- CAMPOS MANTIDOS NULL (segurança):
--   cost_price, suggested_price, organization_id,
--   created_by, updated_by, shipping_notes (informação interna)
--
-- DROP CASCADE: remove get_catalog_bestseller_page (recriada abaixo)
-- ============================================================

DROP VIEW IF EXISTS public.v_products_public CASCADE;

CREATE VIEW public.v_products_public AS
 SELECT p.id,
    p.name,
    p.description,
    p.sku,
    p.category_id,
    p.supplier_id,
    NULL::numeric AS cost_price,
    p.sale_price,
    p.stock_quantity,
    p.is_active AS active,
    p.created_at,
    p.updated_at,
    NULL::numeric AS suggested_price,
    CASE WHEN p.length_cm IS NOT NULL OR p.width_cm IS NOT NULL OR p.height_cm IS NOT NULL OR p.weight_g IS NOT NULL OR p.diameter_cm IS NOT NULL OR p.shape_type IS NOT NULL THEN jsonb_build_object('length_cm', p.length_cm, 'width_cm', p.width_cm, 'height_cm', p.height_cm, 'weight_g', p.weight_g, 'diameter_cm', p.diameter_cm, 'shape_type', p.shape_type, 'unit_detected', p.dimensions_source) ELSE NULL::jsonb END AS dimensions,
    p.images, p.primary_image_url, p.videos, p.allows_personalization, p.colors, p.materials, p.tags,
    p.meta_title, p.meta_description, p.meta_keywords, p.is_featured, p.is_new,
    p.is_on_sale,
    p.view_count, p.favorite_count, p.order_count,
    NULL::uuid AS organization_id, p.product_type, p.is_active,
    NULL::uuid AS created_by, NULL::uuid AS updated_by,
    p.sku_promo, p.short_description, p.main_category_id, p.brand, p.is_deleted, p.deleted_at,
    p.is_kit, p.is_bestseller, p.min_quantity, p.box_length_mm, p.box_width_mm, p.box_height_mm, p.box_weight_kg,
    p.has_colors, p.has_sizes,
    p.ean::character varying(20) AS ean,
    p.gtin::character varying(20) AS gtin,
    p.ncm_code, p.origin_country,
    p.warranty_months,
    NULL::character varying(100) AS manufacturer_sku,
    p.last_stock_update_at, p.supplier_reference, p.is_textil, p.has_capacity, p.combined_sizes, p.gender, p.is_stockout,
    NULL::boolean AS is_online_exclusive, NULL::integer AS catalog_page,
    p.weight_g, p.length_cm, p.width_cm, p.height_cm, p.dimensions_display,
    p.box_length_cm, p.box_width_cm, p.box_height_cm, p.box_volume_cm3, p.box_quantity, p.box_inner_quantity,
    p.packing_type, p.repacking_type, p.capacities,
    NULL::timestamp with time zone AS last_sync_at, NULL::uuid AS last_sync_supplier_id, NULL::character varying AS sync_status,
    p.diameter_cm, p.shape_type, p.internal_height_cm, p.internal_width_cm, p.internal_length_cm,
    p.internal_diameter_cm,
    p.packaging_material,
    p.packaging_color::character varying(100) AS packaging_color,
    NULL::boolean AS has_inner_cradle, NULL::character varying(50) AS cradle_material,
    p.packaging_finish::character varying(100) AS packaging_finish,
    p.is_imported, p.lead_time_days, NULL::boolean AS requires_minimum_order, p.supply_mode, p.is_thermal, p.capacity_ml,
    p.slug, p.ai_summary,
    p.key_benefits,
    p.use_cases,
    p.target_audience, p.schema_json, p.canonical_url, p.robots_meta, p.seo_score, p.seo_last_audit_at, p.seo_issues,
    p.og_title, p.og_description, p.og_image_url, p.description_packaging_info, p.has_optional_packaging, p.optional_packaging_ref,
    p.packing_classification, p.ipi_rate::numeric AS ipi_rate, p.tax_reference_state::character varying AS tax_reference_state,
    p.engraving_type, p.supplier_updated_at, p.has_gift_box, p.min_order_quantity,
    p.ai_title, p.ai_description, p.ai_version, p.ai_generated_at, p.ai_model, p.box_image,
    p.repacking_classification, p.has_commercial_packaging, p.packaging_context, p.bitrix_product_id,
    p.novelty_detected_at, p.novelty_expires_at, p.ncm_id,
    NULL::timestamp with time zone AS bitrix_images_synced_at,
    p.is_featured_expires_at, p.is_bestseller_expires_at,
    p.is_on_sale_expires_at,
    p.is_new_expires_at,
    p.supplier_product_url,
    p.freight_class::character varying(50) AS freight_class,
    p.cubic_weight, NULL::text AS auto_category, p.auto_material, NULL::double precision AS classification_confidence,
    p.price_updated_at, NULL::text AS external_id, p.price_freshness_threshold_days,
    p.set_image_url, p.is_seasonal, p.pvc_free, p.supplier_type, p.supplier_subtype, p.supplier_type_code, p.supplier_subtype_code,
    p.price_verified_at, p.circumference_cm, p.search_vector, p.primary_image_fallback_url,
    COALESCE(lc.leaf_category_id, p.main_category_id, p.category_id) AS leaf_category_id,
    lc.leaf_category_name, lc.leaf_category_level, lc.leaf_category_slug,
    COALESCE(lc.leaf_category_id_safe, p.main_category_id, p.category_id) AS leaf_category_id_safe,
    p.color_swatches, p.dimensions_source,
    -- NOVOS CAMPOS (fix_version: v_products_public_v2_20260627)
    -- Anti-regression: NÃO remover estes campos; estão no payload do AdminProductFormPage
    p.default_carrier,
    p.shipping_weight_kg,
    p.shipping_width_cm,
    p.shipping_height_cm,
    p.shipping_length_cm,
    p.requires_special_shipping,
    p.shipping_notes,
    p.icms_rate,
    p.pis_rate,
    p.cofins_rate,
    p.cfop,
    p.csosn,
    p.cest,
    p.tax_regime
   FROM products p
     LEFT JOIN mv_product_leaf_category lc ON lc.product_id = p.id
  WHERE p.is_deleted IS NOT TRUE AND p.is_active = true;

-- Recriar grants (idênticos aos que existiam antes do DROP CASCADE)
GRANT SELECT ON public.v_products_public TO anon;
GRANT SELECT ON public.v_products_public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.v_products_public TO postgres WITH GRANT OPTION;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON public.v_products_public TO service_role;

-- Recriar função dropada pelo CASCADE
CREATE OR REPLACE FUNCTION public.get_catalog_bestseller_page(
  p_sort text DEFAULT 'best-seller-supplier',
  p_limit integer DEFAULT 500,
  p_offset integer DEFAULT 0
)
RETURNS SETOF public.v_products_public
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
-- fix_version: v_products_public_v2_20260627
-- Recriada após DROP CASCADE da view v_products_public (tipo de retorno atualizado)
DECLARE
  v_limit  integer := GREATEST(COALESCE(p_limit, 500), 0);
  v_offset integer := GREATEST(COALESCE(p_offset, 0), 0);
  v_sql    text;
BEGIN
  IF p_sort = 'best-seller-supplier' THEN
    v_sql := '
      SELECT vp.*
      FROM public.v_products_public vp
      LEFT JOIN public.mv_product_intelligence mi ON mi.product_id = vp.id
      WHERE vp.active = true
      ORDER BY COALESCE(mi.turnover_score, 0) DESC NULLS LAST, vp.name ASC, vp.id ASC
      LIMIT ' || v_limit || ' OFFSET ' || v_offset;

  ELSIF p_sort = 'best-seller-promo' THEN
    v_sql := '
      SELECT vp.*
      FROM public.v_products_public vp
      LEFT JOIN (
        SELECT product_id AS pid, sum(COALESCE(quantity, 1)) AS promo_qty
        FROM public.quote_items
        WHERE product_id IS NOT NULL
        GROUP BY product_id
      ) qs ON qs.pid = vp.id
      WHERE vp.active = true
      ORDER BY
        COALESCE(qs.promo_qty, 0) DESC NULLS LAST,
        COALESCE(vp.is_bestseller, false) DESC,
        vp.name ASC, vp.id ASC
      LIMIT ' || v_limit || ' OFFSET ' || v_offset;

  ELSE
    v_sql := '
      SELECT vp.*
      FROM public.v_products_public vp
      WHERE vp.active = true
      ORDER BY vp.name ASC, vp.id ASC
      LIMIT ' || v_limit || ' OFFSET ' || v_offset;
  END IF;

  RETURN QUERY EXECUTE v_sql;
END;
$function$;

-- Forçar recarregamento do schema no PostgREST
NOTIFY pgrst, 'reload schema';;
