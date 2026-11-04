CREATE OR REPLACE FUNCTION public.fn_process_raw_v2(p_supplier_id uuid, p_batch_size integer DEFAULT 100, p_bulk_mode boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_std jsonb; v_prom jsonb; v_pkg jsonb;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin_or_above((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'Acesso negado: requer perfil admin ou superior';
  END IF;
  v_std  := public.fn_standardize_supplier(p_supplier_id, p_batch_size);
  v_prom := public.fn_promote_supplier(p_supplier_id, NULL);
  -- M12/M13: enriquecimento de embalagem pós-promoção
  v_pkg  := public.fn_enrich_packaging_post_promote(p_supplier_id, 500);
  RETURN jsonb_build_object(
    'success', true, 'redirected', true,
    'pipeline', 'fn_standardize_supplier + fn_promote_supplier + fn_enrich_packaging_post_promote',
    'supplier_id', p_supplier_id,
    'parents_processed',  COALESCE((v_prom->>'pais_promovidos')::int, 0),
    'variants_processed', COALESCE((v_prom->>'variantes_promovidas')::int, 0),
    'packaging_enrichment', v_pkg,
    'standardize', v_std, 'promote', v_prom);
END;
$function$
