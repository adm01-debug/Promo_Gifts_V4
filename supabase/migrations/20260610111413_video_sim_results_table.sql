-- Resultados da simulação de resolução máxima disponível por vídeo-fonte
CREATE TABLE IF NOT EXISTS public.video_sim_results (
  sup          text NOT NULL,
  yid          text NOT NULL,
  queue_status text,
  cur_w        int,
  cur_h        int,
  max_w        int,
  max_h        int,
  err          text,
  checked_at   timestamptz DEFAULT now(),
  PRIMARY KEY (sup, yid)
);
ALTER TABLE public.video_sim_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sim_read ON public.video_sim_results;
CREATE POLICY sim_read ON public.video_sim_results FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.video_sim_results TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_video_sim_upsert(p_items jsonb)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_n int;
BEGIN
  INSERT INTO video_sim_results (sup, yid, queue_status, cur_w, cur_h, max_w, max_h, err, checked_at)
  SELECT i->>'sup', i->>'yid', i->>'st',
         NULLIF(i->>'cw','')::int, NULLIF(i->>'ch','')::int,
         NULLIF(i->>'mw','')::int, NULLIF(i->>'mh','')::int,
         NULLIF(i->>'err',''), now()
  FROM jsonb_array_elements(p_items) i
  WHERE i->>'yid' IS NOT NULL
  ON CONFLICT (sup, yid) DO UPDATE SET
    queue_status = EXCLUDED.queue_status,
    cur_w = EXCLUDED.cur_w,  cur_h = EXCLUDED.cur_h,
    max_w = EXCLUDED.max_w,  max_h = EXCLUDED.max_h,
    err = EXCLUDED.err,      checked_at = now();
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END $$;

REVOKE ALL ON FUNCTION public.fn_video_sim_upsert(jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.fn_video_sim_upsert(jsonb) TO anon, authenticated, service_role;;
