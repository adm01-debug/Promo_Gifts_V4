
-- Reescrever fn sem nested aggregates
CREATE OR REPLACE FUNCTION public.fn_products_quality_dashboard()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total   integer;
  v_ativos  integer;
  v_result  jsonb;
  v_by_sup  jsonb;
BEGIN
  SELECT COUNT(*) INTO v_total FROM products;
  SELECT COUNT(*) INTO v_ativos FROM products WHERE is_active = true;

  -- Pre-compute por_fornecedor separadamente (sem nested aggregate)
  SELECT jsonb_agg(row_data ORDER BY total DESC)
  INTO v_by_sup
  FROM (
    SELECT jsonb_build_object(
      'supplier', COALESCE(s.name,'(sem fornecedor)'),
      'total',  COUNT(*)::int,
      'ativos', COUNT(*) FILTER (WHERE p.is_active)::int
    ) AS row_data
    FROM products p LEFT JOIN suppliers s ON s.id=p.supplier_id
    GROUP BY s.name
  ) t;

  v_result := jsonb_build_object(
    'snapshot_at', now(),
    'totais', jsonb_build_object(
      'products_total',    v_total,
      'products_ativos',   v_ativos,
      'products_inativos', v_total - v_ativos,
      'is_deleted_true',   (SELECT COUNT(*)::int FROM products WHERE is_deleted = true)
    ),
    'cobertura_pct', jsonb_build_object(
      'description',  ROUND(100.0*(SELECT COUNT(*) FROM products WHERE description IS NOT NULL AND length(description)>10)/NULLIF(v_total,0),1),
      'ncm',          ROUND(100.0*(SELECT COUNT(*) FROM products WHERE ncm_code IS NOT NULL)/NULLIF(v_total,0),1),
      'ipi_rate',     ROUND(100.0*(SELECT COUNT(*) FROM products WHERE ipi_rate IS NOT NULL)/NULLIF(v_total,0),1),
      'weight_g',     ROUND(100.0*(SELECT COUNT(*) FROM products WHERE weight_g IS NOT NULL)/NULLIF(v_total,0),1),
      'dimensions',   ROUND(100.0*(SELECT COUNT(*) FROM products WHERE length_cm IS NOT NULL AND width_cm IS NOT NULL)/NULLIF(v_total,0),1),
      'image',        ROUND(100.0*(SELECT COUNT(*) FROM products WHERE primary_image_url IS NOT NULL)/NULLIF(v_total,0),1),
      'slug',         ROUND(100.0*(SELECT COUNT(*) FROM products WHERE slug IS NOT NULL)/NULLIF(v_total,0),1),
      'category',     ROUND(100.0*(SELECT COUNT(*) FROM products WHERE category_id IS NOT NULL)/NULLIF(v_total,0),1),
      'sku_promo',    ROUND(100.0*(SELECT COUNT(*) FROM products WHERE sku_promo IS NOT NULL)/NULLIF(v_total,0),1),
      'ai_desc',      ROUND(100.0*(SELECT COUNT(*) FROM products WHERE ai_description IS NOT NULL AND length(ai_description)>10)/NULLIF(v_total,0),1)
    ),
    'nome_grade', jsonb_build_object(
      'A', (SELECT COUNT(*)::int FROM products WHERE (fn_product_name_quality_score(name)->>'grade')='A'),
      'B', (SELECT COUNT(*)::int FROM products WHERE (fn_product_name_quality_score(name)->>'grade')='B'),
      'C', (SELECT COUNT(*)::int FROM products WHERE (fn_product_name_quality_score(name)->>'grade')='C'),
      'D', (SELECT COUNT(*)::int FROM products WHERE (fn_product_name_quality_score(name)->>'grade')='D'),
      'F', (SELECT COUNT(*)::int FROM products WHERE (fn_product_name_quality_score(name)->>'grade')='F')
    ),
    'estoque', jsonb_build_object(
      'em_ruptura',  (SELECT COUNT(*)::int FROM products WHERE is_stockout=true AND is_active=true),
      'sem_estoque', (SELECT COUNT(*)::int FROM products WHERE stock_quantity=0 AND is_active=true),
      'com_estoque', (SELECT COUNT(*)::int FROM products WHERE stock_quantity>0 AND is_active=true),
      'avg_estoque', ROUND((SELECT AVG(stock_quantity) FROM products WHERE is_active=true AND stock_quantity>0)::numeric,0)
    ),
    'seo', jsonb_build_object(
      'sem_slug',        (SELECT COUNT(*)::int FROM products WHERE slug IS NULL AND is_deleted IS NOT TRUE),
      'avg_seo_score',   ROUND((SELECT AVG(seo_score) FROM products WHERE seo_score IS NOT NULL)::numeric,1),
      'sem_meta_title',  (SELECT COUNT(*)::int FROM products WHERE meta_title IS NULL AND is_active=true)
    ),
    'ai_queue', jsonb_build_object(
      'pending',    (SELECT COUNT(*)::int FROM ai_enrichment_queue WHERE status='pending'),
      'processing', (SELECT COUNT(*)::int FROM ai_enrichment_queue WHERE status='processing'),
      'done',       (SELECT COUNT(*)::int FROM ai_enrichment_queue WHERE status='done'),
      'error',      (SELECT COUNT(*)::int FROM ai_enrichment_queue WHERE status='error')
    ),
    'por_fornecedor', v_by_sup
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.fn_products_quality_dashboard() IS
'Dashboard de qualidade do catálogo. SELECT fn_products_quality_dashboard(); Criado 2026-06-23.';
GRANT EXECUTE ON FUNCTION public.fn_products_quality_dashboard() TO authenticated;
;
