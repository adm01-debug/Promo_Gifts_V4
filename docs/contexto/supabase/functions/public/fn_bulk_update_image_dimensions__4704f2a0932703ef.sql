CREATE OR REPLACE FUNCTION public.fn_bulk_update_image_dimensions(p_updates jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '180s'
AS $function$
DECLARE
  v_item   jsonb;
  v_ok     INT := 0;
  v_skip   INT := 0;
  v_err    INT := 0;
  v_result jsonb;
BEGIN
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_updates)
  LOOP
    BEGIN
      SELECT fn_update_image_dimensions(
        (v_item->>'image_id')::uuid,
        (v_item->>'width')::integer,
        (v_item->>'height')::integer,
        CASE WHEN v_item->>'file_size_bytes' IS NOT NULL
             THEN (v_item->>'file_size_bytes')::bigint END
      ) INTO v_result;

      IF (v_result->>'updated')::int > 0 THEN v_ok := v_ok + 1;
      ELSE v_skip := v_skip + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_err := v_err + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object('ok', v_ok, 'skipped', v_skip, 'errors', v_err, 'total', jsonb_array_length(p_updates));
END;
$function$
