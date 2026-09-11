
-- ═══════════════════════════════════════════════════════════════════
-- fn_notebook_specs_health — Relatório de saúde do módulo notebooks
-- Retorna cobertura por fornecedor, fill-rate por campo e alertas
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_notebook_specs_health()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total        int;
  v_by_supplier  jsonb;
  v_field_fills  jsonb;
  v_top_features jsonb;
  v_orphans      int;
  v_low_conf     int;
  v_no_spec      int;
  v_last_cron    text;
BEGIN
  SELECT COUNT(*) INTO v_total FROM product_notebook_specs;

  -- Coverage por fornecedor
  SELECT jsonb_agg(row_to_json(t)) INTO v_by_supplier FROM (
    SELECT 
      s.name AS supplier,
      COUNT(*) AS com_spec,
      round(100.0 * COUNT(*) / NULLIF(v_total,0), 1) AS pct_total,
      round(avg(pns.confidence_score)::numeric, 2) AS avg_confidence
    FROM product_notebook_specs pns
    JOIN products p ON p.id = pns.product_id
    JOIN suppliers s ON s.id = p.supplier_id
    GROUP BY s.name ORDER BY com_spec DESC
  ) t;

  -- Fill-rate por campo
  SELECT jsonb_build_object(
    'format_pct',   round(100.0 * COUNT(paper_format_id)::numeric / NULLIF(v_total,0), 1),
    'ruling_pct',   round(100.0 * COUNT(paper_ruling_id)::numeric / NULLIF(v_total,0), 1),
    'weight_pct',   round(100.0 * COUNT(paper_weight_id)::numeric / NULLIF(v_total,0), 1),
    'cover_mat_pct',round(100.0 * COUNT(cover_material_id)::numeric / NULLIF(v_total,0), 1),
    'cover_type_pct',round(100.0*COUNT(cover_type_id)::numeric / NULLIF(v_total,0), 1),
    'binding_pct',  round(100.0 * COUNT(binding_type_id)::numeric / NULLIF(v_total,0), 1),
    'sheets_pct',   round(100.0 * COUNT(sheet_count)::numeric / NULLIF(v_total,0), 1),
    'features_pct', round(100.0 * (SELECT COUNT(DISTINCT product_id) FROM product_notebook_features)::numeric / NULLIF(v_total,0), 1)
  ) INTO v_field_fills
  FROM product_notebook_specs;

  -- Top features
  SELECT jsonb_agg(row_to_json(t)) INTO v_top_features FROM (
    SELECT nf.code, nf.name, COUNT(*) AS n_products
    FROM product_notebook_features pnf
    JOIN notebook_features nf ON nf.id = pnf.feature_id
    GROUP BY nf.code, nf.name ORDER BY n_products DESC LIMIT 8
  ) t;

  -- Alertas
  SELECT COUNT(*) INTO v_orphans FROM product_notebook_specs
  WHERE paper_format_id IS NULL AND cover_material_id IS NULL 
    AND paper_ruling_id IS NULL AND sheet_count IS NULL;

  SELECT COUNT(*) INTO v_low_conf FROM product_notebook_specs
  WHERE confidence_score < 0.3;

  -- Produtos gráficos sem spec (classificados mas não processados)
  SELECT COUNT(*) INTO v_no_spec FROM products p
  JOIN LATERAL (
    SELECT pp2.* FROM produtos_padronizacao pp2
    WHERE pp2.product_id = p.id AND pp2.status = 'promoted'
    ORDER BY pp2.promoted_at DESC NULLS LAST LIMIT 1
  ) pp ON true
  JOIN suppliers s ON s.id = p.supplier_id
  WHERE p.is_active = true
    AND fn_is_graphic_material(pp.supplier_subtype, pp.supplier_subtype_code,
          pp.name, pp.meta_keywords, pp.tags, pp.is_textil) = true
    AND NOT EXISTS (SELECT 1 FROM product_notebook_specs pns WHERE pns.product_id = p.id);

  -- Último run do cron
  SELECT to_char(MAX(end_time), 'YYYY-MM-DD HH24:MI:SS') INTO v_last_cron
  FROM cron.job_run_details WHERE jobid = (
    SELECT jobid FROM cron.job WHERE jobname = 'notebook-specs-daily' LIMIT 1
  ) AND status = 'succeeded';

  RETURN jsonb_build_object(
    'status',          CASE WHEN v_orphans > 20 OR v_low_conf > 100 THEN 'warning' ELSE 'ok' END,
    'total_specs',     v_total,
    'by_supplier',     v_by_supplier,
    'field_fill_rates',v_field_fills,
    'top_features',    v_top_features,
    'alerts', jsonb_build_object(
      'orphan_specs_no_attrs', v_orphans,
      'low_confidence_lt30',   v_low_conf,
      'graphic_products_no_spec', v_no_spec
    ),
    'last_cron_run',   coalesce(v_last_cron, 'never')
  );
END;
$$;

COMMENT ON FUNCTION public.fn_notebook_specs_health IS
  'Relatório de saúde do módulo material gráfico. Retorna cobertura, fill-rates, alertas e stats de features.';
;
