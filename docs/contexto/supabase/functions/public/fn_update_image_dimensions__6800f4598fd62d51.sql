CREATE OR REPLACE FUNCTION public.fn_update_image_dimensions(p_image_id uuid, p_width integer, p_height integer, p_file_size_bytes bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rows INT;
BEGIN
  IF p_width  IS NULL OR p_width  <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'width inválido');
  END IF;
  IF p_height IS NULL OR p_height <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'height inválido');
  END IF;

  UPDATE product_images
  SET
    width_px         = p_width,
    height_px        = p_height,
    file_size_bytes  = COALESCE(p_file_size_bytes, file_size_bytes),
    updated_at       = now()
  WHERE id = p_image_id
    AND (width_px IS DISTINCT FROM p_width OR height_px IS DISTINCT FROM p_height
         OR (p_file_size_bytes IS NOT NULL AND file_size_bytes IS DISTINCT FROM p_file_size_bytes));

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'updated', v_rows, 'image_id', p_image_id);
END;
$function$
