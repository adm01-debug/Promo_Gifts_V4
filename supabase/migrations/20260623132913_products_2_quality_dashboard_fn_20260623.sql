
-- ══════════════════════════════════════════════════════════════════
-- Melhoria 2: fn_products_quality_dashboard()
-- Snapshot completo de qualidade dos products em uma chamada.
-- Retorna jsonb com ~30 métricas de saúde do catálogo.
-- Uso: SELECT fn_products_quality_dashboard();
-- ══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_products_quality_dashboard()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total        integer;
  v_ativos       integer;
  v_result       jsonb;
BEGIN
  SELECT COUNT(*) INTO v_total FROM products;
  SELECT COUNT(*) INTO v_ativos FROM products WHERE is_active = true;

  SELECT jsonb_build_object(
    'snapshot_at', now(),
    'totais', jsonb_build_object(
      'products_total',    v_total,
      'products_ativos',   v_ativos,
      'products_inativos', v_total - v_ativos,
      'is_deleted_true',   (SELECT COUNT(*) FROM products WHERE is_deleted = true)
    ),
    'cobertura_campos', jsonb_build_object(
      'pct_com_description',  ROUND(100.0 * (SELECT COUNT(*) FROM products WHERE description IS NOT NULL AND length(description)>10) / NULLIF(v_total,0), 1),
      'pct_com_ncm',          ROUND(100.0 * (SELECT COUNT(*) FROM products WHERE ncm_code IS NOT NULL) / NULLIF(v_total,0), 1),
      'pct_com_ipi_rate',     ROUND(100.0 * (SELECT COUNT(*) FROM products WHERE ipi_rate IS NOT NULL) / NULLIF(v_total,0), 1),
      'pct_com_weight',       ROUND(100.0 * (SELECT COUNT(*) FROM products WHERE weight_g IS NOT NULL) / NULLIF(v_total,0), 1),
      'pct_com_dimensions',   ROUND(100.0 * (SELECT COUNT(*) FROM products WHERE length_cm IS NOT NULL AND width_cm IS NOT NULL AND height_cm IS NOT NULL) / NULLIF(v_total,0), 1),
      'pct_com_image',        ROUND(100.0 * (SELECT COUNT(*) FROM products WHERE primary_image_url IS NOT NULL) / NULLIF(v_total,0), 1),
      'pct_com_slug',         ROUND(100.0 * (SELECT COUNT(*) FROM products WHERE slug IS NOT NULL) / NULLIF(v_total,0), 1),
      'pct_com_category',     ROUND(100.0 * (SELECT COUNT(*) FROM products WHERE category_id IS NOT NULL) / NULLIF(v_total,0), 1),
      'pct_com_sku_promo',    ROUND(100.0 * (SELECT COUNT(*) FROM products WHERE sku_promo IS NOT NULL) / NULLIF(v_total,0), 1),
      'pct_com_ai_desc',      ROUND(100.0 * (SELECT COUNT(*) FROM products WHERE ai_description IS NOT NULL AND length(ai_description)>10) / NULLIF(v_total,0), 1)
    ),
    'qualidade_nome', jsonb_build_object(
      'grade_A',   (SELECT COUNT(*) FROM products WHERE (fn_product_name_quality_score(name)->>'grade')='A'),
      'grade_B',   (SELECT COUNT(*) FROM products WHERE (fn_product_name_quality_score(name)->>'grade')='B'),
      'grade_C',   (SELECT COUNT(*) FROM products WHERE (fn_product_name_quality_score(name)->>'grade')='C'),
      'grade_D',   (SELECT COUNT(*) FROM products WHERE (fn_product_name_quality_score(name)->>'grade')='D'),
      'grade_F',   (SELECT COUNT(*) FROM products WHERE (fn_product_name_quality_score(name)->>'grade')='F')
    ),
    'estoque', jsonb_build_object(
      'em_ruptura',    (SELECT COUNT(*) FROM products WHERE is_stockout = true AND is_active = true),
      'sem_estoque',   (SELECT COUNT(*) FROM products WHERE stock_quantity = 0 AND is_active = true),
      'com_estoque',   (SELECT COUNT(*) FROM products WHERE stock_quantity > 0 AND is_active = true),
      'avg_estoque',   ROUND((SELECT AVG(stock_quantity) FROM products WHERE is_active = true AND stock_quantity > 0)::numeric, 0)
    ),
    'seo', jsonb_build_object(
      'sem_slug',      (SELECT COUNT(*) FROM products WHERE slug IS NULL AND is_deleted IS NOT TRUE),
      'slug_ok',       (SELECT COUNT(*) FROM products WHERE slug IS NOT NULL),
      'avg_seo_score', ROUND((SELECT AVG(seo_score) FROM products WHERE seo_score IS NOT NULL)::numeric, 1),
      'sem_meta_title',(SELECT COUNT(*) FROM products WHERE meta_title IS NULL AND is_active = true)
    ),
    'ai_queue', jsonb_build_object(
      'pending',    (SELECT COUNT(*) FROM ai_enrichment_queue WHERE status='pending'),
      'processing', (SELECT COUNT(*) FROM ai_enrichment_queue WHERE status='processing'),
      'done',       (SELECT COUNT(*) FROM ai_enrichment_queue WHERE status='done'),
      'error',      (SELECT COUNT(*) FROM ai_enrichment_queue WHERE status='error')
    ),
    'por_fornecedor', (
      SELECT jsonb_agg(jsonb_build_object(
        'supplier', s.name,
        'total', COUNT(*),
        'ativos', COUNT(*) FILTER (WHERE p.is_active)
      ) ORDER BY COUNT(*) DESC)
      FROM products p
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      GROUP BY s.name
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.fn_products_quality_dashboard() IS
'Dashboard de qualidade do catálogo de produtos. Retorna jsonb com ~30 métricas.
Uso: SELECT fn_products_quality_dashboard();
Criado 2026-06-23. Execução ~500ms (full table scan).';

-- Conceder acesso ao authenticated (para painel admin)
GRANT EXECUTE ON FUNCTION public.fn_products_quality_dashboard() TO authenticated;
;
