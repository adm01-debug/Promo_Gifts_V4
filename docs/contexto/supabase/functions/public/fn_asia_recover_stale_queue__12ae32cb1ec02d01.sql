CREATE OR REPLACE FUNCTION public.fn_asia_recover_stale_queue()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_recovered integer; v_retried integer; v_mapping_stale integer;
BEGIN
  -- Reset uploading → pending (stuck > 5 min)
  UPDATE asia_image_import_queue
  SET status = 'pending', updated_at = NOW()
  WHERE status = 'uploading' AND updated_at < NOW() - INTERVAL '5 minutes';
  GET DIAGNOSTICS v_recovered = ROW_COUNT;

  -- Retry errors transientes (≤ 2 tentativas)
  UPDATE asia_image_import_queue
  SET status = 'pending', updated_at = NOW()
  WHERE status = 'error' AND attempts <= 2;
  GET DIAGNOSTICS v_retried = ROW_COUNT;

  -- Stale mappings
  UPDATE asia_upload_mapping SET status = 'stale'
  WHERE status = 'pending' AND created_at < NOW() - INTERVAL '5 minutes';
  GET DIAGNOSTICS v_mapping_stale = ROW_COUNT;

  RETURN jsonb_build_object(
    'queue_recovered', v_recovered, 'errors_retried', v_retried,
    'mapping_stale', v_mapping_stale
  );
END;
$function$
