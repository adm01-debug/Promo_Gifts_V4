CREATE OR REPLACE FUNCTION public.fn_spr_history_purge(p_keep_months integer DEFAULT 24)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v int;
BEGIN
  IF p_keep_months IS NULL OR p_keep_months < 1 THEN
    RAISE EXCEPTION 'p_keep_months deve ser >= 1 (recebido: %)', p_keep_months;
  END IF;
  WITH latest AS (
    SELECT DISTINCT ON (raw_id) id FROM public.supplier_products_raw_history
    ORDER BY raw_id, captured_at DESC
  ), del AS (
    DELETE FROM public.supplier_products_raw_history h
    WHERE h.captured_at < now() - make_interval(months => p_keep_months)
      AND h.id NOT IN (SELECT id FROM latest)
    RETURNING 1
  ) SELECT count(*) INTO v FROM del;
  RETURN v;
END;
$function$
