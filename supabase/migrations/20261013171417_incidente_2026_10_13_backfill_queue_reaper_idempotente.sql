-- Agente 3 (Integridade de Dados/Storage) — incidente 2026-10-13
-- APLICADA EM PRODUÇÃO via MCP (doufsxqlfjyuvxuezpln) em 2026-10-13.
--
-- image_backfill_queue: nenhum worker conhecido no repo incrementa
-- `attempts` nem desiste após N tentativas (auditoria: 100% das linhas, pending
-- ou done, têm attempts=0; nenhuma linha jamais chegou a 'failed'). Isso
-- significa que, se um worker externo falhar silenciosamente ou morrer com uma
-- linha em 'processing', ela pode ficar travada indefinidamente. Esta
-- função-rede-de-segurança roda via pg_cron e: (1) reclama linhas travadas em
-- 'processing' por mais de p_stuck_minutes, incrementando attempts; (2) desiste
-- (status='failed') e registra o motivo em last_error quando attempts
-- ultrapassa p_max_attempts, em vez de tentar para sempre.
CREATE OR REPLACE FUNCTION public.fn_backfill_queue_reap_stuck(
  p_stuck_minutes integer DEFAULT 30,
  p_max_attempts integer DEFAULT 5
)
RETURNS TABLE(reaped_to_pending integer, reaped_to_failed integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_to_pending integer := 0;
  v_to_failed integer := 0;
BEGIN
  WITH stuck AS (
    SELECT id, attempts
    FROM image_backfill_queue
    WHERE status = 'processing'
      AND started_at IS NOT NULL
      AND started_at < now() - (p_stuck_minutes || ' minutes')::interval
    FOR UPDATE SKIP LOCKED
  ),
  updated AS (
    UPDATE image_backfill_queue q
    SET attempts = stuck.attempts + 1,
        status = CASE WHEN stuck.attempts + 1 >= p_max_attempts THEN 'failed' ELSE 'pending' END,
        last_error = CASE WHEN stuck.attempts + 1 >= p_max_attempts
                      THEN COALESCE(q.last_error || ' | ', '') || 'reaper: desistiu após ' || (stuck.attempts + 1) || ' tentativas (travado em processing por > ' || p_stuck_minutes || ' min)'
                      ELSE COALESCE(q.last_error || ' | ', '') || 'reaper: reenfileirado (tentativa ' || (stuck.attempts + 1) || '), estava travado em processing'
                    END,
        worker_id = NULL,
        started_at = NULL
    FROM stuck
    WHERE q.id = stuck.id
    RETURNING q.status
  )
  SELECT count(*) FILTER (WHERE status = 'pending'), count(*) FILTER (WHERE status = 'failed')
  INTO v_to_pending, v_to_failed
  FROM updated;

  RETURN QUERY SELECT v_to_pending, v_to_failed;
END;
$function$;

COMMENT ON FUNCTION public.fn_backfill_queue_reap_stuck IS
  'Rede de segurança de idempotência: reclama linhas de image_backfill_queue travadas em processing, incrementa attempts e desiste (failed) após N tentativas em vez de tentar para sempre. Agendada via pg_cron (incidente 2026-10-13).';

SELECT cron.schedule(
  'backfill-queue-reap-stuck',
  '*/15 * * * *',
  $$SELECT public.fn_backfill_queue_reap_stuck(30, 5);$$
);
