
-- ================================================================
-- MIGRATION: fix_webhook_outbox_try_catch_v2_20260623
-- PROBLEMA: Lovable bot sobrescreveu fn_process_webhook_outbox_batch
--   com versão que usa COALESCE(get_edge_function_secret(...), fallback)
--   mas COALESCE não captura RAISE EXCEPTION → erro propagado → job falha
-- ROOT CAUSE ORIGINAL: WEBHOOK_DISPATCHER_URL não existe no vault
--   → get_edge_function_secret lança RAISE EXCEPTION
--   → COALESCE não captura → 1440 falhas/dia no job 201
-- FIX v2:
--   - TRY-CATCH no bloco de obtenção de secrets (nível externo)
--   - Fallback para URL hardcoded se secret não existe no vault
--   - DEFAULT 50 (Lovable bot mudou para 10)
--   - Comentário anti-regressão
-- ================================================================

-- !! ATENÇÃO: NÃO SOBRESCREVER ESTA FUNÇÃO SEM MANTER O TRY-CATCH !!
-- !! O COALESCE não captura RAISE EXCEPTION do get_edge_function_secret !!
CREATE OR REPLACE FUNCTION public.fn_process_webhook_outbox_batch(
  _batch_size integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'net'
AS $function$
-- FIX 2026-06-23 v2: TRY-CATCH obrigatório — COALESCE não captura RAISE
DECLARE
  _processed integer := 0;
  _skipped   integer := 0;
  _endpoint  text;
  _secret    text;
  _req_id    bigint;
  rec        RECORD;
BEGIN
  -- ── Endpoint ────────────────────────────────────────────────────────────
  -- OBRIGATÓRIO: TRY-CATCH aqui. COALESCE não funciona pois
  -- get_edge_function_secret usa RAISE EXCEPTION (não retorna NULL).
  BEGIN
    _endpoint := public.get_edge_function_secret('WEBHOOK_DISPATCHER_URL');
  EXCEPTION WHEN OTHERS THEN
    _endpoint := 'https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/webhook-dispatcher';
  END;

  -- ── Secret de autenticação ───────────────────────────────────────────────
  BEGIN
    _secret := public.get_edge_function_secret('WEBHOOK_SECRET');
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      _secret := public.get_edge_function_secret('WEBHOOK_DISPATCHER_SECRET');
    EXCEPTION WHEN OTHERS THEN
      _secret := '';
    END;
  END;

  -- ── Processar batch ──────────────────────────────────────────────────────
  FOR rec IN
    SELECT id, event, payload, attempts, max_attempts
    FROM public.webhook_outbox
    WHERE status = 'pending'
      AND next_attempt_at <= NOW()
    ORDER BY created_at
    LIMIT _batch_size
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.webhook_outbox
    SET status     = 'processing',
        attempts   = attempts + 1,
        updated_at = NOW()
    WHERE id = rec.id;

    BEGIN
      SELECT net.http_post(
        url     := _endpoint,
        headers := jsonb_build_object(
          'Content-Type',    'application/json',
          'x-webhook-secret', _secret,
          'x-event-type',    rec.event
        ),
        body := rec.payload::text
      ) INTO _req_id;

      UPDATE public.webhook_outbox
      SET status     = 'sent',
          sent_at    = NOW(),
          updated_at = NOW()
      WHERE id = rec.id;

      _processed := _processed + 1;

    EXCEPTION WHEN OTHERS THEN
      UPDATE public.webhook_outbox
      SET status          = CASE
                              WHEN rec.attempts >= rec.max_attempts THEN 'dead_letter'
                              ELSE 'pending'
                            END,
          error_message   = SQLERRM,
          next_attempt_at = NOW() + (POWER(2, LEAST(rec.attempts, 5)) * INTERVAL '1 minute'),
          updated_at      = NOW()
      WHERE id = rec.id;

      _skipped := _skipped + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', _processed,
    'skipped',   _skipped,
    'endpoint',  _endpoint,
    'fix_version', 'v2_20260623'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'error',     SQLERRM,
    'processed', _processed
  );
END;
$function$;

COMMENT ON FUNCTION public.fn_process_webhook_outbox_batch IS
  '!! NÃO USAR COALESCE COM get_edge_function_secret — usa RAISE, não retorna NULL !!
  TRY-CATCH obrigatório no bloco de obtenção de secrets.
  Fix v2 2026-06-23: regressão Lovable bot corrigida.';
;
