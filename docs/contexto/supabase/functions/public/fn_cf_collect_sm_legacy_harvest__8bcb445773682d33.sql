CREATE OR REPLACE FUNCTION public.fn_cf_collect_sm_legacy_harvest(p_first_id bigint, p_last_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net', 'archive'
AS $function$
DECLARE
  v_total_responses integer;
  v_pending integer;
  v_inserted integer := 0;
BEGIN
  SELECT COUNT(*) INTO v_total_responses 
  FROM net._http_response 
  WHERE id BETWEEN p_first_id AND p_last_id;
  
  v_pending := (p_last_id - p_first_id + 1) - v_total_responses;
  
  WITH responses AS (
    SELECT id, content::jsonb AS body
    FROM net._http_response 
    WHERE id BETWEEN p_first_id AND p_last_id
      AND status_code = 200
  ),
  images_raw AS (
    SELECT 
      img->>'id' AS cf_id,
      img->>'filename' AS filename,
      (img->>'uploaded')::timestamptz AS uploaded_at
    FROM responses r,
         jsonb_array_elements(r.body->'result'->'images') AS img
    WHERE img->>'id' LIKE 'sm-%'
  ),
  inserted AS (
    INSERT INTO cf_sm_legacy (cf_id, filename, uploaded_at)
    SELECT cf_id, filename, uploaded_at FROM images_raw
    ON CONFLICT (cf_id) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_inserted FROM inserted;
  
  RETURN jsonb_build_object(
    'responses_received', v_total_responses,
    'pending_responses', v_pending,
    'inserted_this_call', v_inserted,
    'cf_sm_legacy_total_now', (SELECT COUNT(*) FROM cf_sm_legacy)
  );
END;
$function$
