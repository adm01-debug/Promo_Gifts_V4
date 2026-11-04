CREATE OR REPLACE FUNCTION public.fn_sm_site_tick(p_enqueue integer DEFAULT 5, p_collect integer DEFAULT 20, p_stale_days integer DEFAULT 7, p_with_auth boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net', 'vault', 'extensions'
AS $function$
DECLARE
  v_enq  int;
  v_coll jsonb;
  v_prom jsonb;
BEGIN
  -- Ordem: collect primeiro (limpa responses pendentes) → enqueue → promote
  v_coll := public.fn_sm_site_collect(p_collect);
  v_enq  := public.fn_sm_site_enqueue(p_enqueue, p_stale_days, NULL, p_with_auth);
  v_prom := public.fn_sm_site_promote(50);
  RETURN jsonb_build_object(
    'collect',  v_coll,
    'enqueued', v_enq,
    'promote',  v_prom,
    'ts',       now()
  );
END;
$function$
