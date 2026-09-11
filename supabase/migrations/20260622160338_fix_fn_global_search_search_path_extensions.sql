
-- Fix 2: adicionar extensions ao search_path para unaccent funcionar
CREATE OR REPLACE FUNCTION public.fn_global_search(
  p_term    text,
  p_limit   integer DEFAULT 12,
  p_types   text[]  DEFAULT ARRAY['product', 'quote']
)
RETURNS TABLE(
  result_id          text,
  result_type        text,
  result_title       text,
  result_description text,
  result_url         text,
  result_image_url   text,
  result_metadata    jsonb,
  result_relevance   numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_term_norm text; v_tsquery tsquery; v_lim_each integer;
BEGIN
  IF p_term IS NULL OR length(trim(p_term)) < 2 THEN RETURN; END IF;
  IF p_limit IS NULL OR p_limit <= 0 THEN RETURN; END IF;

  v_term_norm := lower(unaccent(trim(p_term)));
  v_lim_each  := GREATEST(1, p_limit / GREATEST(array_length(p_types, 1), 1));

  BEGIN
    v_tsquery := websearch_to_tsquery('portuguese', unaccent(trim(p_term)));
  EXCEPTION WHEN OTHERS THEN v_tsquery := NULL;
  END;

  PERFORM set_config('pg_trgm.similarity_threshold', '0.2', true);

  IF 'product' = ANY(p_types) THEN
    RETURN QUERY
    SELECT p.id::text, 'product'::text, p.name::text,
      ('SKU: ' || p.sku || CASE WHEN c.name IS NOT NULL THEN ' · ' || c.name ELSE '' END)::text,
      ('/produtos/' || p.slug)::text, p.primary_image_url,
      jsonb_build_object('sku',p.sku,'price',p.sale_price,'stock',COALESCE(vs.total_stock,0),'category',COALESCE(c.name,'')),
      (CASE WHEN v_tsquery IS NOT NULL AND p.search_vector @@ v_tsquery
            THEN ts_rank_cd(p.search_vector,v_tsquery,32)*2.0 ELSE 0 END +
       word_similarity(v_term_norm, lower(unaccent(p.name)))*1.0 +
       CASE WHEN lower(p.sku) LIKE '%'||v_term_norm||'%' THEN 0.8 ELSE 0 END +
       CASE WHEN COALESCE(vs.total_stock,0)>0 THEN 0.2 ELSE 0 END)::numeric
    FROM products p
    LEFT JOIN product_category_assignments pca ON pca.product_id=p.id AND pca.is_primary=true
    LEFT JOIN categories c ON c.id=pca.category_id
    LEFT JOIN LATERAL(
        SELECT COALESCE(SUM(pv.stock_quantity),0)::int AS total_stock
        FROM product_variants pv
        WHERE pv.product_id=p.id AND pv.is_active=true
    ) vs ON true
    WHERE p.is_active=true            -- FIX 2026-06-22: removido AND p.active=true (coluna dropada)
      AND p.is_deleted IS NOT TRUE
      AND p.sale_price IS NOT NULL
      AND p.slug IS NOT NULL AND p.slug != ''
      AND (
          (v_tsquery IS NOT NULL AND p.search_vector @@ v_tsquery)
          OR p.name % v_term_norm
          OR lower(p.sku) LIKE '%'||v_term_norm||'%'
      )
    ORDER BY 8 DESC LIMIT v_lim_each;
  END IF;

  IF 'quote' = ANY(p_types) THEN
    RETURN QUERY
    SELECT q.id::text, 'quote'::text, COALESCE(q.quote_number,'Orçamento')::text,
      ('Status: '||COALESCE(q.status,'—')||
       CASE WHEN q.total IS NOT NULL THEN ' · R$ '||to_char(q.total,'FM999G999G990D00') ELSE '' END)::text,
      ('/orcamentos/'||q.id::text)::text, NULL::text,
      jsonb_build_object('status',q.status,'total',q.total,'created_at',q.created_at),
      CASE WHEN lower(COALESCE(q.quote_number,'')) LIKE '%'||v_term_norm||'%' THEN 0.9
           WHEN lower(COALESCE(q.status,''))       LIKE '%'||v_term_norm||'%' THEN 0.5
           ELSE 0.3 END::numeric
    FROM quotes q
    WHERE lower(COALESCE(q.quote_number,'')) LIKE '%'||v_term_norm||'%'
       OR lower(COALESCE(q.status,''))       LIKE '%'||v_term_norm||'%'
    ORDER BY 8 DESC, q.created_at DESC LIMIT v_lim_each;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_global_search(text, integer, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_global_search(text, integer, text[]) TO authenticated;
;
