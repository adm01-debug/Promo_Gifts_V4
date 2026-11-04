CREATE OR REPLACE FUNCTION public.fn_cf_sm_legacy_insert_batch(p_rows jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'archive'
AS $function$
DECLARE
  v_inserted integer;
BEGIN
  INSERT INTO cf_sm_legacy (cf_id, filename, uploaded_at)
  SELECT 
    (elem->>'cf_id')::text,
    (elem->>'filename')::text,
    (elem->>'uploaded_at')::timestamptz
  FROM jsonb_array_elements(p_rows) AS elem
  ON CONFLICT (cf_id) DO NOTHING;
  
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$function$
