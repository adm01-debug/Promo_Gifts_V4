CREATE OR REPLACE FUNCTION public.fn_backfill_all_product_tags(p_limit integer DEFAULT 500, p_only_empty boolean DEFAULT false, p_after_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pid       uuid;
  v_last_id   uuid;
  v_processed integer := 0;
  v_added     integer := 0;
  v_errors    integer := 0;
  v_result    jsonb;
BEGIN
  FOR v_pid IN
    SELECT p.id
    FROM products p
    WHERE p.is_active = true
      AND (p_after_id IS NULL OR p.id > p_after_id)
      AND (
        NOT p_only_empty
        OR NOT EXISTS (SELECT 1 FROM product_tags pt WHERE pt.product_id = p.id)
      )
    ORDER BY p.id
    LIMIT p_limit
  LOOP
    BEGIN
      v_result := public.fn_tag_product_complete(v_pid);
      v_added  := v_added + COALESCE((v_result->>'total_added')::int, 0);
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
    END;
    v_processed := v_processed + 1;
    v_last_id   := v_pid;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed, 'tags_added', v_added,
    'errors', v_errors, 'last_id', v_last_id
  );
END;
$function$
