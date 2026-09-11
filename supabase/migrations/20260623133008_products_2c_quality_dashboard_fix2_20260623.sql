
-- Fix: ORDER BY na jsonb_agg precisa de coluna visível no outer scope
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

  SELECT jsonb_agg(t.row_data)
  INTO v_by_sup
  FROM (
    SELECT jsonb_build_object(
      'supplier', COALESCE(s.name,'(sem fornecedor)'),
      'total',  COUNT(*)::int,
      'ativos', COUNT(*) FILTER (WHERE p.is_active)::int
    ) AS row_data,
    COUNT(*) AS cnt
    FROM products p LEFT JOIN suppliers s ON s.id=p.supplier_id
    GROUP BY s.name
    ORDER BY COUNT(*) DESC
  ) t;

  v_result := jsonb_build_object(
    'snapshot_at', now(),
    'totais', jsonb_build_object(
      'total', v_total, 'ativos', v_ativos,
      'inativos', v_total-v_ativos,
      'is_deleted', (SELECT COUNT(*)::int FROM products WHERE is_deleted=true)
    ),
    'cobertura_pct', jsonb_build_object(
      'description',ROUND(100.0*(SELECT COUNT(*) FROM products WHERE description IS NOT NULL AND length(description)>10)/NULLIF(v_total,0),1),
      'ncm',         ROUND(100.0*(SELECT COUNT(*) FROM products WHERE ncm_code IS NOT NULL)/NULLIF(v_total,0),1),
      'ipi_rate',    ROUND(100.0*(SELECT COUNT(*) FROM products WHERE ipi_rate IS NOT NULL)/NULLIF(v_total,0),1),
      'weight',      ROUND(100.0*(SELECT COUNT(*) FROM products WHERE weight_g IS NOT NULL)/NULLIF(v_total,0),1),
      'dimensions',  ROUND(100.0*(SELECT COUNT(*) FROM products WHERE length_cm IS NOT NULL AND width_cm IS NOT NULL)/NULLIF(v_total,0),1),
      'image',       ROUND(100.0*(SELECT COUNT(*) FROM products WHERE primary_image_url IS NOT NULL)/NULLIF(v_total,0),1),
      'slug',        ROUND(100.0*(SELECT COUNT(*) FROM products WHERE slug IS NOT NULL)/NULLIF(v_total,0),1),
      'ai_desc',     ROUND(100.0*(SELECT COUNT(*) FROM products WHERE ai_description IS NOT NULL AND length(ai_description)>10)/NULLIF(v_total,0),1)
    ),
    'nome_grade', jsonb_build_object(
      'A',(SELECT COUNT(*)::int FROM products WHERE (fn_product_name_quality_score(name)->>'grade')='A'),
      'B',(SELECT COUNT(*)::int FROM products WHERE (fn_product_name_quality_score(name)->>'grade')='B'),
      'C',(SELECT COUNT(*)::int FROM products WHERE (fn_product_name_quality_score(name)->>'grade')='C')
    ),
    'estoque', jsonb_build_object(
      'ruptura',(SELECT COUNT(*)::int FROM products WHERE is_stockout=true AND is_active=true),
      'com',(SELECT COUNT(*)::int FROM products WHERE stock_quantity>0 AND is_active=true),
      'avg_qty',ROUND((SELECT AVG(stock_quantity) FROM products WHERE is_active=true AND stock_quantity>0)::numeric,0)
    ),
    'seo', jsonb_build_object(
      'sem_slug',(SELECT COUNT(*)::int FROM products WHERE slug IS NULL AND is_deleted IS NOT TRUE),
      'sem_meta',(SELECT COUNT(*)::int FROM products WHERE meta_title IS NULL AND is_active=true)
    ),
    'ai_queue', jsonb_build_object(
      'pending',(SELECT COUNT(*)::int FROM ai_enrichment_queue WHERE status='pending'),
      'done',(SELECT COUNT(*)::int FROM ai_enrichment_queue WHERE status='done'),
      'error',(SELECT COUNT(*)::int FROM ai_enrichment_queue WHERE status='error')
    ),
    'por_fornecedor', v_by_sup
  );
  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.fn_products_quality_dashboard() TO authenticated;
;
