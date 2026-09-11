
-- MELHORIA 1 · PASSO 5b — Recriar get_catalog_bestseller_page + views de packaging + badge

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Função que retorna SETOF v_products_public (recria após a view estar pronta)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_catalog_bestseller_page(
  p_sort  text    DEFAULT 'best-seller-supplier',
  p_limit integer DEFAULT 500,
  p_offset integer DEFAULT 0
)
 RETURNS SETOF public.v_products_public
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. vw_packagings_catalog — remove has_inner_cradle e packaging_color (dropados)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE VIEW public.vw_packagings_catalog AS
 SELECT p.id,
    p.sku,
    p.supplier_reference,
    p.name,
    p.internal_height_cm,
    p.internal_width_cm,
    p.internal_length_cm,
    p.height_cm AS ext_height,
    p.width_cm AS ext_width,
    p.length_cm AS ext_length,
    p.packaging_material,
    p.weight_g,
    p.supplier_id,
    s.name AS fornecedor,
    p.cost_price,
    ( SELECT count(*) AS count
           FROM public.product_packaging_compatibility ppc
          WHERE ppc.packaging_id = p.id AND ppc.active = true) AS qtd_produtos_compativeis
   FROM public.products p
     LEFT JOIN public.suppliers s ON s.id = p.supplier_id
  WHERE p.product_type = 'packaging'::text AND p.is_active = true;

GRANT SELECT ON public.vw_packagings_catalog TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. vw_product_all_packaging_options — pkg.has_inner_cradle → NULL, pkg.packaging_color → NULL
-- ─────────────────────────────────────────────────────────────────────────────
CREATE VIEW public.vw_product_all_packaging_options AS
 SELECT p.id AS product_id,
    p.sku AS product_sku,
    p.name AS product_name,
    'INCLUSA'::text AS tipo_embalagem,
    pip.id AS embalagem_id,
    NULL::character varying(50) AS embalagem_sku,
    pip.name AS embalagem_nome,
    pip.material AS embalagem_material,
    pip.color AS embalagem_cor,
    pip.has_inner_cradle AS tem_berco,
    pip.weight_g AS embalagem_peso_g,
    pip.internal_height_cm,
    pip.internal_width_cm,
    pip.internal_length_cm,
    pip.external_height_cm,
    pip.external_width_cm,
    pip.external_length_cm,
    pip.can_be_disabled,
    pip.can_be_customized,
    0::numeric(10,2) AS preco_adicional,
    'Inclusa no produto'::text AS preco_info,
    NULL::character varying(20) AS fit_rating,
    NULL::numeric(6,2) AS folga_minima_mm,
    true AS mesmo_fornecedor,
    true AS is_recommended,
    0 AS ordem_exibicao
   FROM public.products p
     JOIN public.product_included_packagings pip ON pip.product_id = p.id AND pip.active = true
  WHERE p.product_type = 'product'::text AND p.is_active = true
UNION ALL
 SELECT p.id AS product_id,
    p.sku AS product_sku,
    p.name AS product_name,
        CASE ppc.compatibility_source
            WHEN 'supplier_indicated'::text THEN 'OPCIONAL (Fornecedor)'::text
            WHEN 'dimension_calculated'::text THEN 'OPCIONAL (Calculada)'::text
            ELSE 'OPCIONAL (Manual)'::text
        END AS tipo_embalagem,
    pkg.id AS embalagem_id,
    pkg.sku AS embalagem_sku,
    pkg.name AS embalagem_nome,
    pkg.packaging_material AS embalagem_material,
    NULL::character varying(50) AS embalagem_cor,
    NULL::boolean AS tem_berco,
    pkg.weight_g AS embalagem_peso_g,
    pkg.internal_height_cm,
    pkg.internal_width_cm,
    pkg.internal_length_cm,
    pkg.height_cm AS external_height_cm,
    pkg.width_cm AS external_width_cm,
    pkg.length_cm AS external_length_cm,
    true AS can_be_disabled,
    true AS can_be_customized,
    COALESCE(pkg.cost_price, 0::numeric) AS preco_adicional,
    concat('+ R$ ', COALESCE(pkg.cost_price::text, '0,00'::text)) AS preco_info,
    ppc.fit_rating,
    ppc.fit_gap_min_mm AS folga_minima_mm,
    ppc.is_same_supplier AS mesmo_fornecedor,
    ppc.is_recommended,
        CASE
            WHEN ppc.is_recommended THEN 1
            WHEN ppc.is_same_supplier THEN 2
            WHEN ppc.fit_rating::text = 'tight'::text THEN 3
            WHEN ppc.fit_rating::text = 'good'::text THEN 4
            ELSE 5
        END AS ordem_exibicao
   FROM public.products p
     JOIN public.product_packaging_compatibility ppc ON ppc.product_id = p.id AND ppc.active = true
     JOIN public.products pkg ON pkg.id = ppc.packaging_id AND pkg.is_active = true
  WHERE p.product_type = 'product'::text AND p.is_active = true
  ORDER BY 1, 26, 20;

GRANT SELECT ON public.vw_product_all_packaging_options TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. v_product_active_badge — p.is_on_sale → false (coluna removida)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE VIEW public.v_product_active_badge AS
 SELECT p.id AS product_id,
    p.sku,
    p.name,
    p.is_active,
    p.is_stockout,
    p.is_new,
    p.is_bestseller,
    p.is_featured,
    false AS is_on_sale,
    p.has_gift_box,
    p.has_commercial_packaging,
    p.stock_quantity > 0 AND p.stock_quantity <= s.low_stock_threshold AS is_low_stock,
    p.is_active AND p.price_last_verified_at IS NOT NULL AND (EXTRACT(epoch FROM now() - p.price_last_verified_at) / 86400::numeric) > COALESCE(p.price_freshness_threshold_days, 60)::numeric AS is_price_stale,
    round(EXTRACT(epoch FROM now() - p.price_last_verified_at) / 86400::numeric)::integer AS price_freshness_days_ago,
        CASE
            WHEN p.is_new AND p.novelty_expires_at IS NOT NULL AND p.novelty_expires_at > now() THEN GREATEST(0, EXTRACT(day FROM p.novelty_expires_at - now())::integer)
            ELSE NULL::integer
        END AS novelty_days_remaining,
        CASE
            WHEN p.is_new AND p.novelty_expires_at IS NOT NULL AND p.novelty_expires_at > now() THEN 'countdown'::text
            WHEN p.is_new THEN 'fallback'::text
            ELSE NULL::text
        END AS novelty_badge_subtype,
        CASE
            WHEN p.is_stockout THEN 'stockout'::text
            WHEN p.stock_quantity > 0 AND p.stock_quantity <= s.low_stock_threshold THEN 'low_stock'::text
            WHEN p.is_new THEN 'new'::text
            WHEN p.is_bestseller THEN 'bestseller'::text
            WHEN p.is_featured THEN 'featured'::text
            WHEN false THEN 'on_sale'::text   -- is_on_sale sempre false
            WHEN p.has_gift_box THEN 'gift_box'::text
            ELSE 'none'::text
        END AS active_badge,
        CASE
            WHEN NOT p.is_active THEN NULL::text
            WHEN p.is_stockout THEN 'stockout'::text
            WHEN p.stock_quantity > 0 AND p.stock_quantity <= s.low_stock_threshold THEN 'low_stock'::text
            WHEN p.is_new THEN 'new'::text
            WHEN p.is_bestseller THEN 'bestseller'::text
            WHEN p.is_featured THEN 'featured'::text
            WHEN false THEN 'on_sale'::text   -- is_on_sale sempre false
            WHEN p.has_gift_box THEN 'gift_box'::text
            ELSE 'none'::text
        END AS catalog_badge,
        CASE
            WHEN NOT p.is_active THEN NULL::text
            WHEN p.is_stockout THEN 'Fora de estoque'::text
            WHEN p.stock_quantity > 0 AND p.stock_quantity <= s.low_stock_threshold THEN 'Estoque baixo'::text
            WHEN p.is_new AND p.novelty_expires_at > now() THEN 'Novidade'::text
            WHEN p.is_new THEN 'Novo'::text
            WHEN p.is_bestseller THEN 'Mais vendido'::text
            WHEN p.is_featured THEN 'Destaque'::text
            WHEN false THEN 'Promoção'::text   -- is_on_sale sempre false
            WHEN p.has_gift_box THEN 'Embalagem especial'::text
            ELSE NULL::text
        END AS active_badge_label,
        CASE
            WHEN NOT p.is_active THEN NULL::text
            WHEN p.is_stockout THEN 'red'::text
            WHEN p.stock_quantity > 0 AND p.stock_quantity <= s.low_stock_threshold THEN 'orange'::text
            WHEN p.is_new THEN 'blue'::text
            WHEN p.is_bestseller THEN 'amber'::text
            WHEN p.is_featured THEN 'purple'::text
            WHEN false THEN 'green'::text   -- is_on_sale sempre false
            WHEN p.has_gift_box THEN 'teal'::text
            ELSE NULL::text
        END AS active_badge_color,
    p.is_stockout::integer + p.is_new::integer + p.is_bestseller::integer + p.is_featured::integer + 0 + p.has_gift_box::integer +
        CASE
            WHEN p.stock_quantity > 0 AND p.stock_quantity <= s.low_stock_threshold THEN 1
            ELSE 0
        END AS total_badges_ativos,
    p.novelty_expires_at,
    p.novelty_detected_at,
    p.price_last_verified_at,
    p.price_updated_at,
    p.price_freshness_threshold_days,
    p.supplier_id,
    s.low_stock_threshold,
    p.updated_at
   FROM public.products p
     JOIN public.suppliers s ON s.id = p.supplier_id;

GRANT SELECT ON public.v_product_active_badge TO anon, authenticated;
;
