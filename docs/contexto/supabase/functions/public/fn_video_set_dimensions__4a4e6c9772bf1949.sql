CREATE OR REPLACE FUNCTION public.fn_video_set_dimensions(p_cf_uid text, p_width integer, p_height integer, p_size_bytes bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_n int;
BEGIN
  UPDATE product_videos
  SET width_px        = p_width,
      height_px       = p_height,
      file_size_bytes = COALESCE(p_size_bytes, file_size_bytes),
      updated_at      = now()
  WHERE cloudflare_video_id = p_cf_uid;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'updated', v_n);
END $function$
