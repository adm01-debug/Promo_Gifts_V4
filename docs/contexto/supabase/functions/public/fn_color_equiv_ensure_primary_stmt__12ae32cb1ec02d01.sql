CREATE OR REPLACE FUNCTION public.fn_color_equiv_ensure_primary_stmt()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE r record; v_best uuid;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NULL; END IF;  -- anti-recursao
  FOR r IN
    SELECT supplier_color_id AS sc FROM color_equivalences GROUP BY supplier_color_id
    HAVING count(*) FILTER (WHERE is_active) > 0
       AND count(*) FILTER (WHERE is_active AND is_primary) = 0
  LOOP
    SELECT ce.id INTO v_best
    FROM color_equivalences ce JOIN color_variations cv ON cv.id = ce.promo_variation_id
    WHERE ce.supplier_color_id = r.sc AND ce.is_active
    ORDER BY (CASE ce.match_quality WHEN 'exact' THEN 1 WHEN 'close' THEN 2
                                    WHEN 'approximate' THEN 3 ELSE 4 END),
             ce.confidence_score DESC NULLS LAST,
             COALESCE(NULLIF(split_part(cv.internal_code,'.',1),'')::int, 9999),
             COALESCE(NULLIF(split_part(cv.internal_code,'.',2),'')::int, 9999),
             ce.id
    LIMIT 1;
    IF v_best IS NOT NULL THEN
      UPDATE color_equivalences SET is_primary = true WHERE id = v_best;
    END IF;
  END LOOP;
  RETURN NULL;
END;$function$
