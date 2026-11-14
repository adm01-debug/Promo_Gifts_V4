CREATE OR REPLACE FUNCTION public.fn_dev_medallion_health()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := (SELECT auth.uid());
BEGIN
  IF v_uid IS NULL OR NOT public.is_dev(v_uid) THEN
    RAISE EXCEPTION 'forbidden: requer papel dev' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'coverage',
    COALESCE(
      (SELECT jsonb_agg(to_jsonb(c) ORDER BY c.fornecedor, c.camada)
         FROM public.vw_medallion_coverage c),
      '[]'::jsonb
    ),
    'progress',
    COALESCE(
      (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.fase)
         FROM public.v_pipeline_progress p),
      '[]'::jsonb
    )
  );
END;
$function$
