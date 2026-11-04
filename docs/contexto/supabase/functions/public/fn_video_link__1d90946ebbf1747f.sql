CREATE OR REPLACE FUNCTION public.fn_video_link(p_queue_id uuid, p_youtube_id text, p_cf_stream_uid text, p_url_hls text, p_url_thumbnail text, p_url_embed text, p_duration_seconds integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_supplier text;
  v_result   jsonb;
BEGIN
  SELECT source_supplier INTO v_supplier
  FROM video_import_queue
  WHERE id = p_queue_id;
  
  IF v_supplier IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'queue_id not found: ' || p_queue_id::text);
  END IF;
  
  CASE LOWER(v_supplier)
    WHEN 'xbz' THEN
      v_result := fn_xbz_link_video(p_queue_id, p_youtube_id, p_cf_stream_uid, p_url_hls, p_url_thumbnail, p_url_embed, p_duration_seconds);
    WHEN 'asia' THEN
      v_result := fn_asia_link_video(p_queue_id, p_youtube_id, p_cf_stream_uid, p_url_hls, p_url_thumbnail, p_url_embed, p_duration_seconds);
    WHEN 'somarcas' THEN
      v_result := fn_sm_link_video(p_queue_id, p_youtube_id, p_cf_stream_uid, p_url_hls, p_url_thumbnail, p_url_embed, p_duration_seconds);
    WHEN 'spot' THEN
      v_result := fn_spot_link_video(p_queue_id, p_youtube_id, p_cf_stream_uid, p_url_hls, p_url_thumbnail, p_url_embed, p_duration_seconds);
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'unknown supplier: ' || v_supplier);
  END CASE;
  
  RETURN v_result || jsonb_build_object('dispatched_to', v_supplier);
END;
$function$
