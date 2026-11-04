CREATE OR REPLACE FUNCTION public.fn_xbz_recover_stale()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_recovered integer; v_retried integer; v_mapping_stale integer;
BEGIN
    UPDATE public.xbz_gallery_staging
       SET status='pending', updated_at=now()
    WHERE status='uploading' AND updated_at < now()-INTERVAL '5 minutes';
    GET DIAGNOSTICS v_recovered=ROW_COUNT;

    UPDATE public.xbz_gallery_staging
       SET status='pending', error_message=NULL, updated_at=now()
    WHERE status='error'
      AND coalesce(retry_count,0)<3
      AND error_message NOT ILIKE '%404%'
      AND error_message NOT ILIKE '%not found%'
      AND error_message NOT ILIKE '%permanent%';
    GET DIAGNOSTICS v_retried=ROW_COUNT;

    UPDATE public.xbz_upload_mapping SET status='stale'
    WHERE status='pending' AND created_at < now()-INTERVAL '5 minutes';
    GET DIAGNOSTICS v_mapping_stale=ROW_COUNT;

    RETURN jsonb_build_object(
        'staging_recovered',v_recovered,'errors_retried',v_retried,'mapping_stale',v_mapping_stale
    );
END $function$
