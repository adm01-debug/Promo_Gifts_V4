CREATE OR REPLACE FUNCTION public.fn_repair_canonical_chains(p_max_iterations integer DEFAULT 10)
 RETURNS TABLE(iterations_run integer, chains_repaired bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_iteration  int := 0;
  v_repaired   bigint;
  v_total      bigint := 0;
BEGIN
  LOOP
    v_iteration := v_iteration + 1;
    EXIT WHEN v_iteration > p_max_iterations;

    WITH chains AS (
      SELECT
        child.id                         AS child_id,
        mid.canonical_image_id           AS true_root_id
      FROM public.product_images child
      JOIN public.product_images mid ON mid.id = child.canonical_image_id
      WHERE child.canonical_image_id IS NOT NULL
        AND mid.canonical_image_id IS NOT NULL
        AND child.deleted_at IS NULL
      LIMIT 10000
    )
    UPDATE public.product_images pi
    SET canonical_image_id   = c.true_root_id,
        last_modified_source = 'migration',
        updated_at           = now()
    FROM chains c
    WHERE pi.id = c.child_id;

    GET DIAGNOSTICS v_repaired = ROW_COUNT;
    v_total := v_total + v_repaired;

    EXIT WHEN v_repaired = 0;
  END LOOP;

  RETURN QUERY SELECT v_iteration, v_total;
END;
$function$
