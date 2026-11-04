CREATE OR REPLACE FUNCTION public.fn_check_coverage_regression()
 RETURNS TABLE(fornecedor text, camada text, metrica text, maximo_7d numeric, atual numeric, queda_pp numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH hist AS (
    SELECT fornecedor, camada,
           MAX(ncm_pct) ncm, MAX(materials_pct) mat, MAX(tags_pct) tags, MAX(meta_pct) meta,
           MAX(ipi_pct) ipi, MAX(description_pct) descr, MAX(category_pct) cat, MAX(display_name_pct) disp
    FROM public.medallion_coverage_snapshots
    WHERE captured_at > now() - interval '7 days'
    GROUP BY fornecedor, camada
  ), atual AS (
    SELECT * FROM public.vw_medallion_coverage
  ), unioned AS (
    SELECT a.fornecedor, a.camada, m.metrica, m.maximo, m.val
    FROM atual a JOIN hist h ON h.fornecedor=a.fornecedor AND h.camada=a.camada
    CROSS JOIN LATERAL (VALUES
      ('ncm', h.ncm, a.ncm_pct), ('materials', h.mat, a.materials_pct),
      ('tags', h.tags, a.tags_pct), ('meta', h.meta, a.meta_pct),
      ('ipi', h.ipi, a.ipi_pct), ('description', h.descr, a.description_pct),
      ('category', h.cat, a.category_pct), ('display_name', h.disp, a.display_name_pct)
    ) m(metrica, maximo, val)
  )
  SELECT fornecedor, camada, metrica, maximo, val, ROUND(maximo - val, 1)
  FROM unioned
  WHERE maximo IS NOT NULL AND val IS NOT NULL AND maximo - val > 2.0
  ORDER BY (maximo - val) DESC;
$function$
