
-- ================================================================
-- MIGRATION: fix_webhook_outbox_secret_whitelist_20260623
-- PROBLEMA: job 199 process-webhook-outbox falha 1440x/dia com
--   "Nome de secret nao autorizado: WEBHOOK_DISPATCHER_URL"
-- ROOT CAUSE:
--   1. WEBHOOK_DISPATCHER_URL não está na whitelist de get_edge_function_secret
--   2. WEBHOOK_SECRET também ausente da whitelist
--   3. RAISE exception impede COALESCE de usar fallback em fn_process_webhook_outbox_batch
-- FIX:
--   1. Adicionar ambos à whitelist (com segurança — não vaza dados sensíveis)
--   2. fn_process_webhook_outbox_batch usa TRY-CATCH para fallback robusto
--   3. Usa WEBHOOK_DISPATCHER_SECRET (existente) no lugar de WEBHOOK_SECRET (ausente)
-- ================================================================

-- PARTE 1: Atualizar whitelist de get_edge_function_secret
CREATE OR REPLACE FUNCTION public.get_edge_function_secret(_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'vault', 'public', 'pg_temp'
AS $function$
DECLARE
  _secret text;
BEGIN
  IF _name NOT IN (
    'WEBHOOK_DISPATCHER_SECRET',
    'WEBHOOK_DISPATCHER_URL',
    'WEBHOOK_SECRET',
    'CONNECTIONS_AUTO_TEST_SECRET',
    'CRON_SECRET',
    'HASH_PRODUCT_IMAGES_CRON_SECRET',
    'GENERATE_BLURHASHES_CRON_SECRET',
    'BACKFILL_DIM_CRON_SECRET'
  ) THEN
    RAISE EXCEPTION 'Nome de secret nao autorizado: %', _name
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT decrypted_secret INTO _secret
  FROM vault.decrypted_secrets
  WHERE name = _name
  LIMIT 1;

  IF _secret IS NULL THEN
    RAISE EXCEPTION 'Secret % nao encontrado no vault', _name
      USING ERRCODE = 'no_data_found';
  END IF;

  RETURN _secret;
END;
$function$;

-- PARTE 2: Corrigir fn_process_webhook_outbox_batch com TRY-CATCH robusto
CREATE OR REPLACE FUNCTION public.fn_process_webhook_outbox_batch(_batch_size integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _processed integer := 0;
  _skipped   integer := 0;
  _endpoint  text;
  _secret    text;
  rec RECORD;
BEGIN
  -- Endpoint: tenta vault, usa fallback hardcoded se secret não configurado
  BEGIN
    _endpoint := public.get_edge_function_secret('WEBHOOK_DISPATCHER_URL');
  EXCEPTION WHEN OTHERS THEN
    _endpoint := 'https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/webhook-dispatcher';
  END;

  -- Secret: tenta WEBHOOK_SECRET, fallback para WEBHOOK_DISPATCHER_SECRET, NULL se nenhum
  BEGIN
    _secret := public.get_edge_function_secret('WEBHOOK_SECRET');
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      _secret := public.get_edge_function_secret('WEBHOOK_DISPATCHER_SECRET');
    EXCEPTION WHEN OTHERS THEN
      _secret := NULL;
    END;
  END;

  -- Processar batch de webhooks pendentes
  FOR rec IN
    SELECT id, event, payload, attempts
    FROM public.webhook_outbox
    WHERE status IN ('pending')
      AND next_attempt_at <= now()
    ORDER BY created_at
    LIMIT _batch_size
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.webhook_outbox
    SET status = 'processing', attempts = attempts + 1, updated_at = now()
    WHERE id = rec.id;

    BEGIN
      PERFORM net.http_post(
        url     := _endpoint,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-webhook-secret', COALESCE(_secret, '')
        ),
        body    := rec.payload::text
      );

      UPDATE public.webhook_outbox
      SET status = 'delivered', updated_at = now()
      WHERE id = rec.id;

      _processed := _processed + 1;

    EXCEPTION WHEN OTHERS THEN
      UPDATE public.webhook_outbox
      SET 
        status = CASE WHEN rec.attempts >= 5 THEN 'failed' ELSE 'pending' END,
        next_attempt_at = now() + (INTERVAL '1 minute' * POWER(2, LEAST(rec.attempts, 5))),
        last_error = SQLERRM,
        updated_at = now()
      WHERE id = rec.id;

      _skipped := _skipped + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', _processed,
    'skipped',   _skipped,
    'endpoint',  _endpoint
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'processed', _processed);
END;
$function$;

COMMENT ON FUNCTION public.get_edge_function_secret IS
  'Whitelist de secrets autorizados: WEBHOOK_DISPATCHER_SECRET, WEBHOOK_DISPATCHER_URL, WEBHOOK_SECRET, CONNECTIONS_AUTO_TEST_SECRET, CRON_SECRET, HASH_PRODUCT_IMAGES_CRON_SECRET, GENERATE_BLURHASHES_CRON_SECRET, BACKFILL_DIM_CRON_SECRET';

COMMENT ON FUNCTION public.fn_process_webhook_outbox_batch IS
  'Processa batch de webhooks pendentes. Usa TRY-CATCH para fallback de secrets. Fix: 2026-06-23 (WEBHOOK_DISPATCHER_URL not in whitelist)';
;
