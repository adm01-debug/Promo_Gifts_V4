-- Política de resolução mínima de vídeos (2026-06-10)
-- 1) Processor grava dimensões reais no Gold após cada upload
CREATE OR REPLACE FUNCTION public.fn_video_set_dimensions(
  p_cf_uid text, p_width int, p_height int, p_size_bytes bigint DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END $$;

-- 2) Lê o CF UID antigo de um item da fila (re-fetch: deletar o vídeo substituído no CF Stream)
CREATE OR REPLACE FUNCTION public.fn_video_queue_old_uid(p_queue_id uuid)
RETURNS text
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT cloudflare_video_id FROM video_import_queue WHERE id = p_queue_id;
$$;

REVOKE ALL ON FUNCTION public.fn_video_set_dimensions(text,int,int,bigint) FROM public;
GRANT EXECUTE ON FUNCTION public.fn_video_set_dimensions(text,int,int,bigint) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.fn_video_queue_old_uid(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.fn_video_queue_old_uid(uuid) TO anon, authenticated, service_role;;
