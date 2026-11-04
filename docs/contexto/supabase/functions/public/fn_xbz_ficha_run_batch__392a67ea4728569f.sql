CREATE OR REPLACE FUNCTION public.fn_xbz_ficha_run_batch(p_limit integer DEFAULT 8)
 RETURNS TABLE(sku text, extraidas integer, promovidas integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE r record; v_ext int; v_prom int;
BEGIN
  FOR r IN
    SELECT q.product_sku FROM v_xbz_ficha_parse_queue q
    WHERE q.prioridade=1
      AND NOT EXISTS(SELECT 1 FROM kit_component_ficha_staging s
                      WHERE s.product_sku=q.product_sku AND s.source ILIKE 'xbz_%jina')
    ORDER BY q.n_dim_heuristicas DESC, q.product_sku
    LIMIT p_limit
  LOOP
    v_ext := fn_fetch_xbz_ficha(r.product_sku, false);
    SELECT promoted INTO v_prom FROM fn_promote_kit_ficha_staging(r.product_sku);
    sku:=r.product_sku; extraidas:=coalesce(v_ext,0); promovidas:=coalesce(v_prom,0);
    RETURN NEXT;
  END LOOP;
END $function$
