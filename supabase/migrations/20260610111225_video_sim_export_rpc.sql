-- Export read-only da fila de vídeos p/ simulação de resolução máxima disponível na fonte
CREATE OR REPLACE FUNCTION public.fn_video_sim_export()
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'sup', q.source_supplier,
    'yid', q.youtube_id,
    'url', q.youtube_url,
    'st',  q.status,
    'cw',  pv.width_px,
    'ch',  pv.height_px
  )), '[]'::jsonb)
  FROM video_import_queue q
  LEFT JOIN LATERAL (
    SELECT width_px, height_px FROM product_videos pv
    WHERE pv.source_youtube_id = q.youtube_id
      AND lower(pv.source_supplier) = lower(q.source_supplier)
      AND pv.is_active = true
    LIMIT 1
  ) pv ON true;
$$;

REVOKE ALL ON FUNCTION public.fn_video_sim_export() FROM public;
GRANT EXECUTE ON FUNCTION public.fn_video_sim_export() TO anon, authenticated, service_role;;
