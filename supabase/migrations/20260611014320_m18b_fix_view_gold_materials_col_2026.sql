-- Fix: branch gold da view usava p.tags na coluna materials_pct
CREATE OR REPLACE VIEW public.vw_medallion_coverage AS
SELECT
  s.name AS fornecedor,
  'silver' AS camada,
  COUNT(*) AS produtos,
  ROUND(100.0*SUM(CASE WHEN NULLIF(TRIM(pp.ncm_code),'') IS NOT NULL THEN 1 ELSE 0 END)/COUNT(*),1) AS ncm_pct,
  ROUND(100.0*SUM(CASE WHEN jsonb_array_length(COALESCE(pp.materials,'[]'::jsonb))>0 THEN 1 ELSE 0 END)/COUNT(*),1) AS materials_pct,
  ROUND(100.0*SUM(CASE WHEN jsonb_array_length(COALESCE(pp.tags,'[]'::jsonb))>0 THEN 1 ELSE 0 END)/COUNT(*),1) AS tags_pct,
  ROUND(100.0*SUM(CASE WHEN COALESCE(array_length(pp.meta_keywords,1),0)>0 THEN 1 ELSE 0 END)/COUNT(*),1) AS meta_pct,
  ROUND(100.0*SUM(CASE WHEN pp.ipi_rate IS NOT NULL THEN 1 ELSE 0 END)/COUNT(*),1) AS ipi_pct,
  ROUND(100.0*SUM(CASE WHEN NULLIF(TRIM(pp.description),'') IS NOT NULL THEN 1 ELSE 0 END)/COUNT(*),1) AS description_pct,
  NULL::numeric AS category_pct,
  NULL::numeric AS display_name_pct
FROM public.produtos_padronizacao pp JOIN public.suppliers s ON s.id=pp.supplier_id
GROUP BY s.name
UNION ALL
SELECT
  s.name, 'gold', COUNT(*),
  ROUND(100.0*SUM(CASE WHEN NULLIF(TRIM(p.ncm_code),'') IS NOT NULL THEN 1 ELSE 0 END)/COUNT(*),1),
  ROUND(100.0*SUM(CASE WHEN jsonb_array_length(COALESCE(p.materials,'[]'::jsonb))>0
                        OR EXISTS (SELECT 1 FROM public.product_materials pm WHERE pm.product_id=p.id) THEN 1 ELSE 0 END)/COUNT(*),1),
  ROUND(100.0*SUM(CASE WHEN jsonb_array_length(COALESCE(p.tags,'[]'::jsonb))>0 THEN 1 ELSE 0 END)/COUNT(*),1),
  ROUND(100.0*SUM(CASE WHEN COALESCE(array_length(p.meta_keywords,1),0)>0 THEN 1 ELSE 0 END)/COUNT(*),1),
  ROUND(100.0*SUM(CASE WHEN p.ipi_rate IS NOT NULL THEN 1 ELSE 0 END)/COUNT(*),1),
  ROUND(100.0*SUM(CASE WHEN NULLIF(TRIM(p.description),'') IS NOT NULL THEN 1 ELSE 0 END)/COUNT(*),1),
  ROUND(100.0*SUM(CASE WHEN p.category_id IS NOT NULL THEN 1 ELSE 0 END)/COUNT(*),1),
  ROUND(100.0*SUM(CASE WHEN p.name IS NULL OR p.name <> public.fn_normalize_product_name(p.name) OR p.name !~ '[A-Za-zÀ-ú]{4,}' THEN 1 ELSE 0 END)/COUNT(*),1)
FROM public.products p JOIN public.suppliers s ON s.id=p.supplier_id
GROUP BY s.name;

-- refaz o snapshot baseline com a view corrigida
DELETE FROM public.medallion_coverage_snapshots WHERE captured_at > now() - interval '1 hour';
SELECT public.fn_snapshot_medallion_coverage();;
