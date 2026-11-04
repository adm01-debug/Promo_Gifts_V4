CREATE OR REPLACE FUNCTION public.fn_snapshot_medallion_coverage()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE n int;
BEGIN
  INSERT INTO public.medallion_coverage_snapshots
    (fornecedor, camada, produtos, ncm_pct, materials_pct, tags_pct, meta_pct, ipi_pct, description_pct, category_pct, display_name_pct)
  SELECT fornecedor, camada, produtos, ncm_pct, materials_pct, tags_pct, meta_pct, ipi_pct, description_pct, category_pct, display_name_pct
  FROM public.vw_medallion_coverage;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$function$
