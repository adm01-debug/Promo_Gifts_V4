-- Auto-recovery da fila de vídeos via RPC (o acesso REST anon à tabela é bloqueado por RLS,
-- o que deixava o recoverStuck do processor silenciosamente inoperante)
CREATE OR REPLACE FUNCTION public.fn_video_queue_recover_stuck()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_n int;
BEGIN
  UPDATE video_import_queue
  SET status = 'pending', started_at = NULL
  WHERE status = 'downloading'
    AND started_at < now() - interval '30 minutes';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END $$;

REVOKE ALL ON FUNCTION public.fn_video_queue_recover_stuck() FROM public;
GRANT EXECUTE ON FUNCTION public.fn_video_queue_recover_stuck() TO anon, authenticated, service_role;;
