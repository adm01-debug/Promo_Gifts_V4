CREATE OR REPLACE FUNCTION public.fn_xbz_site_tick(p_enqueue integer DEFAULT 5, p_collect integer DEFAULT 20, p_stale_days integer DEFAULT 7, p_api_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_coll jsonb; v_enq int; v_silver jsonb; v_guard jsonb; v_gold jsonb;
BEGIN
  v_coll   := public.fn_xbz_site_collect(p_collect);                    -- 1. coleta HTML
  v_enq    := public.fn_xbz_site_enqueue(p_enqueue, p_stale_days, p_api_key); -- 2. enfileira mais
  v_silver := public.fn_site_to_silver_all();                            -- 3. padroniza novos
  v_guard  := public.fn_site_flag_divergent();                           -- 4. guarda integridade
  v_gold   := public.fn_site_promote_to_gold(p_only_new => true);       -- 5. promove apenas novos
  RETURN jsonb_build_object(
    'coleta',v_coll,'enfileirados',v_enq,
    'silver',v_silver,'guard',v_guard,'gold',v_gold,'ts',now()
  );
END $function$
