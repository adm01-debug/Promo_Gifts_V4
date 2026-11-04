CREATE OR REPLACE FUNCTION public.fn_reconcile_category_products_count(p_limit integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_updated   INT := 0;
  v_skipped   INT := 0;
  v_started_at TIMESTAMPTZ := clock_timestamp();
BEGIN
  -- Atualizar products_count apenas onde diverge (minimiza writes)
  WITH real_counts AS (
    SELECT
      c.id                                                    AS category_id,
      c.products_count                                        AS cached,
      COALESCE(
        (SELECT count(*) FROM public.products p
         WHERE p.category_id = c.id AND p.is_active = true), 0
      )::integer                                              AS real_count
    FROM public.categories c
    WHERE p_limit IS NULL OR c.id IN (
      -- Se p_limit definido, priorizar os mais divergentes
      SELECT c2.id FROM public.categories c2
      ORDER BY ABS(c2.products_count -
        COALESCE((SELECT count(*) FROM public.products p2
                  WHERE p2.category_id = c2.id AND p2.is_active = true), 0))
        DESC NULLS LAST
      LIMIT p_limit
    )
  ),
  divergentes AS (
    SELECT category_id, cached, real_count
    FROM real_counts
    WHERE cached IS DISTINCT FROM real_count
  )
  UPDATE public.categories c
  SET products_count = d.real_count
  FROM divergentes d
  WHERE c.id = d.category_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_skipped := (SELECT count(*) FROM public.categories) - v_updated;

  RETURN jsonb_build_object(
    'updated',    v_updated,
    'skipped',    v_skipped,
    'duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_started_at)::int,
    'ran_at',     v_started_at
  );
END;
$function$
