
-- ─────────────────────────────────────────────────────────────────────────────
-- MELHORIA #1: fn_notify_champions_on_quote_status + trigger
-- fix_version=2026-07-10-notify-champions v1
-- ANTI-REGRESSÃO: EXCEPTION WHEN OTHERS em todos os blocos críticos
-- Vault secret CHAMPIONS_RECEIVE_QUOTE_SYNC_URL já criado via vault.create_secret()
-- ─────────────────────────────────────────────────────────────────────────────

-- NOTA CRÍTICA: Champions V2 usa PROMOGIFTS_WEBHOOK_SECRET via Deno.env.get().
-- Esta função assina com WEBHOOK_DISPATCHER_SECRET (vault Gifts).
-- AÇÃO MANUAL necessária no Champions V2 dashboard:
--   Edge Functions → receive-quote-sync → Secrets →
--   PROMOGIFTS_WEBHOOK_SECRET = 4aszZ/Nh0cInRX0RVTkt+YGqA8BObghWsoAjEOGB7g8=

CREATE OR REPLACE FUNCTION public.fn_notify_champions_on_quote_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
-- fix_version=2026-07-10-notify-champions ANTI-REGRESSÃO
-- Notifica Champions V2 quando quote muda status.
-- pg_net assíncrono → NUNCA bloqueia a transação principal.
-- EXCEPTION WHEN OTHERS catch-all → sempre retorna NEW (fail-safe).
DECLARE
  _secret  TEXT;
  _url     TEXT;
  _payload TEXT;
  _hmac    TEXT;
  _req_id  BIGINT;
BEGIN
  -- Guard: só dispara se status realmente mudou
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Buscar URL e secret do vault (com EXCEPTION WHEN OTHERS para fail-safe)
  BEGIN
    _url    := public.get_vault_secret('CHAMPIONS_RECEIVE_QUOTE_SYNC_URL');
    _secret := public.get_vault_secret('WEBHOOK_DISPATCHER_SECRET');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'fn_notify_champions: vault error: %', SQLERRM;
    RETURN NEW;
  END;

  IF _url IS NULL OR _secret IS NULL THEN
    RAISE WARNING 'fn_notify_champions: URL ou secret NULL, skip';
    RETURN NEW;
  END IF;

  -- Construir payload no formato Fluxo PromoGifts do Champions V2
  _payload := json_build_object(
    'event',           'quote.' || NEW.status,
    'correlation_key', NEW.id::text,
    'payload', json_build_object(
      'quote_id',     NEW.id,
      'quote_number', NEW.quote_number,
      'status',       NEW.status,
      'old_status',   OLD.status,
      'seller_id',    NEW.seller_id,
      'client_id',    NEW.client_id,
      'client_name',  NEW.client_name,
      'total',        NEW.total,
      'event_at',     NOW()
    )
  )::text;

  -- HMAC SHA-256 (extensions.hmac disponível via search_path)
  _hmac := 'sha256=' || encode(
    extensions.hmac(_payload::bytea, _secret::bytea, 'sha256'),
    'hex'
  );

  -- HTTP POST assíncrono via pg_net (não bloqueia)
  BEGIN
    SELECT net.http_post(
      url     := _url,
      headers := json_build_object(
        'Content-Type',        'application/json',
        'x-webhook-signature', _hmac,
        'x-webhook-event',     'quote.' || NEW.status,
        'x-correlation-key',   NEW.id::text
      )::jsonb,
      body    := _payload
    ) INTO _req_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'fn_notify_champions: http_post error quote %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_notify_champions: unexpected error quote %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Trigger AFTER UPDATE OF status em quotes
DROP TRIGGER IF EXISTS trg_quotes_notify_champions ON public.quotes;

CREATE TRIGGER trg_quotes_notify_champions
  AFTER UPDATE OF status ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_champions_on_quote_status();

-- Grants
REVOKE EXECUTE ON FUNCTION public.fn_notify_champions_on_quote_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_notify_champions_on_quote_status() TO service_role;

-- Verificação final (adversarial check na própria migration)
DO $$
DECLARE pass INT:=0; fail INT:=0;
BEGIN
  IF public.get_vault_secret('CHAMPIONS_RECEIVE_QUOTE_SYNC_URL') LIKE 'https://%' THEN pass:=pass+1; ELSE fail:=fail+1; RAISE NOTICE 'VAULT_URL FAIL'; END IF;
  IF EXISTS(SELECT 1 FROM pg_proc WHERE proname='fn_notify_champions_on_quote_status' AND prosecdef AND proconfig @> ARRAY['search_path=public, extensions, vault']) THEN pass:=pass+1; ELSE fail:=fail+1; RAISE NOTICE 'FN FAIL: fn não encontrada ou sem SECURITY DEFINER/search_path'; END IF;
  IF EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relname='quotes' AND t.tgname='trg_quotes_notify_champions' AND t.tgenabled='O') THEN pass:=pass+1; ELSE fail:=fail+1; RAISE NOTICE 'TRG FAIL'; END IF;
  -- Anti-regressão: triggers existentes de quotes
  IF EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relname='quotes' AND t.tgname='trg_quotes_immutability' AND t.tgenabled='O') THEN pass:=pass+1; ELSE fail:=fail+1; RAISE NOTICE 'REGRESSION_IMMUTABILITY FAIL'; END IF;
  IF EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relname='quotes' AND t.tgname='trg_notify_quote_status_change' AND t.tgenabled='O') THEN pass:=pass+1; ELSE fail:=fail+1; RAISE NOTICE 'REGRESSION_NOTIFY FAIL'; END IF;
  IF EXISTS(SELECT 1 FROM pg_proc WHERE proname='fn_apply_crm_callback' AND prosrc LIKE '%invalid_transition%') THEN pass:=pass+1; ELSE fail:=fail+1; RAISE NOTICE 'REGRESSION_CRM FAIL'; END IF;
  IF fail>0 THEN RAISE EXCEPTION 'MELHORIA#1 FALHOU: % erros', fail; END IF;
  RAISE NOTICE 'MELHORIA#1 APPLIED: %/6 checks OK', pass;
END $$;
;
