CREATE OR REPLACE FUNCTION public.fn_promote_category_fallback(p_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  BEGIN
    SELECT c.category_id INTO v_id
    FROM public.classify_xbz_category(p_name) c
    ORDER BY CASE c.confidence WHEN 'alta' THEN 1 WHEN 'média' THEN 2 ELSE 3 END
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN v_id := NULL;
  END;
  IF v_id IS NULL THEN
    v_id := public.fn_classify_category_residual(p_name);
  END IF;
  RETURN v_id;
END;
$function$
