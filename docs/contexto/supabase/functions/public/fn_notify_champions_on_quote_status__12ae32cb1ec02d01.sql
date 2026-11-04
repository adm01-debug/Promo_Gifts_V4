CREATE OR REPLACE FUNCTION public.fn_notify_champions_on_quote_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'vault', 'net'
AS $function$
-- fix_version=2026-07-10-notify-champions-v8-clock-timestamp ANTI-REGRESSÃO
-- v8: event_at usa clock_timestamp() — NOW() era transaction_timestamp e gerava
-- timestamps idênticos para múltiplas transições na mesma transação,
-- quebrando o ordering guard do Champions.
DECLARE
  _secret  TEXT;
  _url     TEXT;
  _payload JSONB;
  _hmac    TEXT;
  _req_id  BIGINT;
  _log_id  UUID;
  _start   TIMESTAMPTZ;
  _ck      TEXT;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;

  _start := clock_timestamp();
  _ck := NEW.id::text || ':' || NEW.status || ':' || (extract(epoch from clock_timestamp()) * 1000)::bigint::text;

  BEGIN
    SELECT ds.decrypted_secret INTO _url
    FROM vault.decrypted_secrets ds WHERE ds.name = 'CHAMPIONS_RECEIVE_QUOTE_SYNC_URL' LIMIT 1;
    SELECT ds.decrypted_secret INTO _secret
    FROM vault.decrypted_secrets ds WHERE ds.name = 'WEBHOOK_DISPATCHER_SECRET' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'fn_notify_champions v8: vault error: %', SQLERRM;
    RETURN NEW;
  END;

  IF _url IS NULL OR _secret IS NULL THEN
    RAISE WARNING 'fn_notify_champions v8: URL ou secret NULL';
    RETURN NEW;
  END IF;

  _payload := json_build_object(
    'event',           'quote.' || NEW.status,
    'correlation_key', _ck,
    'payload', json_build_object(
      'quote_id',     NEW.id,
      'quote_number', NEW.quote_number,
      'status',       NEW.status,
      'old_status',   OLD.status,
      'seller_id',    NEW.seller_id,
      'client_id',    NEW.client_id,
      'client_name',  NEW.client_name,
      'total',        NEW.total,
      'event_at',     clock_timestamp()   -- ← v8 FIX: monotônico intra-transação
    )
  )::jsonb;

  _hmac := 'sha256=' || encode(
    extensions.hmac(_payload::text::bytea, _secret::bytea, 'sha256'), 'hex');

  BEGIN
    INSERT INTO public.webhook_dispatcher_log (
      trigger_event, quote_id, quote_status, seller_id,
      target_url, correlation_key, payload_hash, delivery_status, fired_at
    ) VALUES (
      'quote.' || NEW.status, NEW.id, NEW.status, NEW.seller_id,
      regexp_replace(_url, 'https://[^/]+\.supabase\.co', 'https://[REDACTED].supabase.co'),
      _ck,
      encode(extensions.hmac(_payload::text::bytea, 'log-salt'::bytea, 'sha256'), 'hex'),
      'pending', _start
    ) RETURNING id INTO _log_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'fn_notify_champions v8: pre-log error: %', SQLERRM;
  END;

  BEGIN
    SELECT net.http_post(
      _url, _payload, '{}'::jsonb,
      json_build_object(
        'Content-Type',        'application/json',
        'x-webhook-signature', _hmac,
        'x-webhook-event',     'quote.' || NEW.status,
        'x-correlation-key',   _ck
      )::jsonb,
      10000
    ) INTO _req_id;

    IF _log_id IS NOT NULL THEN
      UPDATE public.webhook_dispatcher_log
      SET response_body = 'pg_net_request_id=' || _req_id::text,
          delivery_status = 'delivered',
          responded_at = clock_timestamp(),
          duration_ms = EXTRACT(EPOCH FROM (clock_timestamp() - _start)) * 1000
      WHERE id = _log_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'fn_notify_champions v8: http_post error quote %: %', NEW.id, SQLERRM;
    IF _log_id IS NOT NULL THEN
      BEGIN
        UPDATE public.webhook_dispatcher_log
        SET delivery_status = 'failed', error_message = SQLERRM,
            responded_at = clock_timestamp(),
            duration_ms = EXTRACT(EPOCH FROM (clock_timestamp() - _start)) * 1000
        WHERE id = _log_id;
      EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_notify_champions v8: outer error quote %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$
