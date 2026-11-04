CREATE OR REPLACE FUNCTION public.fn_spr_requeue_failed(p_min_age_minutes integer DEFAULT 60, p_limit integer DEFAULT 500)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_n int;
BEGIN
  WITH alvo AS (
    SELECT id FROM public.supplier_products_raw
    WHERE status = 'failed'
      AND COALESCE(attempts,0) < 5
      AND updated_at < now() - make_interval(mins => p_min_age_minutes)
    ORDER BY updated_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED)
  UPDATE public.supplier_products_raw r
     SET status = 'pending'
    FROM alvo WHERE r.id = alvo.id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object('requeued', v_n, 'ts', now());
END $function$
