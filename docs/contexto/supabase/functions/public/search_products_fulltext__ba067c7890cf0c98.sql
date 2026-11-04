CREATE OR REPLACE FUNCTION public.search_products_fulltext(p_search_term text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_category_slug text DEFAULT NULL::text, p_only_in_stock boolean DEFAULT false, p_min_price numeric DEFAULT NULL::numeric, p_max_price numeric DEFAULT NULL::numeric)
 RETURNS TABLE(ps_id uuid, ps_sku character varying, ps_name character varying, ps_slug character varying, ps_description text, ps_category_name character varying, ps_min_price numeric, ps_image_url text, ps_total_stock integer, ps_relevance numeric, ps_match_highlights text)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_search_normalized TEXT;
  v_tsquery           tsquery;
  v_category_id       uuid;
BEGIN
  IF p_search_term IS NULL OR length(trim(p_search_term)) = 0 THEN
    RETURN;
  END IF;

  v_search_normalized := lower(unaccent(trim(p_search_term)));

  BEGIN
    v_tsquery := websearch_to_tsquery('portuguese', unaccent(trim(p_search_term)));
  EXCEPTION WHEN OTHERS THEN
    v_tsquery := NULL;
  END;

  -- Resolver category_id uma única vez fora do loop
  IF p_category_slug IS NOT NULL THEN
    SELECT id INTO v_category_id FROM categories WHERE slug = p_category_slug LIMIT 1;
  END IF;

  PERFORM set_config('pg_trgm.similarity_threshold', '0.2', true);

  RETURN QUERY
  WITH variant_stock AS (
    -- Pré-agregar: 1 hash join global em vez de N lateral lookups
    SELECT pv.product_id, COALESCE(SUM(pv.stock_quantity), 0)::INT AS total_stock
    FROM product_variants pv
    WHERE pv.is_active = true
    GROUP BY pv.product_id
  )
  SELECT
    p.id,
    p.sku::VARCHAR,
    p.name::VARCHAR,
    p.slug::VARCHAR,
    p.description,
    c.name::VARCHAR,
    p.sale_price,
    p.primary_image_url,
    COALESCE(vs.total_stock, 0)::INT,
    (
      CASE WHEN v_tsquery IS NOT NULL AND p.search_vector @@ v_tsquery
           THEN ts_rank_cd(p.search_vector, v_tsquery, 32) * 2.0
           ELSE 0
      END +
      word_similarity(v_search_normalized, lower(unaccent(p.name))) * 1.0 +
      CASE WHEN lower(p.sku) LIKE '%' || v_search_normalized || '%' THEN 0.8 ELSE 0 END +
      CASE WHEN COALESCE(vs.total_stock, 0) > 0 THEN 0.3 ELSE 0 END
    )::NUMERIC,
    CASE
      WHEN v_tsquery IS NOT NULL AND p.search_vector @@ v_tsquery THEN 'fulltext'
      WHEN word_similarity(v_search_normalized, lower(unaccent(p.name))) > 0.3 THEN 'nome'
      WHEN lower(p.sku) LIKE '%' || v_search_normalized || '%' THEN 'sku'
      ELSE 'parcial'
    END
  FROM products p
  LEFT JOIN product_category_assignments pca ON pca.product_id = p.id AND pca.is_primary = true
  LEFT JOIN categories c ON c.id = pca.category_id
  LEFT JOIN variant_stock vs ON vs.product_id = p.id
  WHERE
    p.is_active = true
    AND p.is_deleted IS NOT TRUE
    AND p.sale_price IS NOT NULL
    AND (
      (v_tsquery IS NOT NULL AND p.search_vector @@ v_tsquery)
      OR p.name % v_search_normalized
      OR lower(p.sku) LIKE '%' || v_search_normalized || '%'
    )
    AND (p_category_slug IS NULL OR pca.category_id = v_category_id)
    AND (NOT p_only_in_stock OR COALESCE(vs.total_stock, 0) > 0)
    AND (p_min_price IS NULL OR p.sale_price >= p_min_price)
    AND (p_max_price IS NULL OR p.sale_price <= p_max_price)
  ORDER BY 10 DESC, COALESCE(vs.total_stock, 0) DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$
