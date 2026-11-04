-- ============================================================================
-- LOTE F · MIGRATION 1/4
-- Parte A: Resolução de mini-drift bot_detection_log (Fase 3 adiantada)
-- Parte B: record_public_token_failure (par com public_token_failures do Lote A)
-- ============================================================================

-- A) Adicionar coluna 'blocked' em bot_detection_log (alinhar com Lovable)
ALTER TABLE public.bot_detection_log
  ADD COLUMN blocked boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.bot_detection_log.blocked IS
  'Marca se a deteccao resultou em bloqueio efetivo do IP. Adicionado 2026-05-22 (Lote F).';

-- B) Função: record_public_token_failure
--    Registra tentativa de uso de token público inválido e, após >=5 falhas em 1h,
--    invalida o token associado (quote/kit).
CREATE OR REPLACE FUNCTION public.record_public_token_failure(
  _resource_type text, _resource_id text, _attempted_token text,
  _ip text, _ua text, _reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _recent_failures int;
BEGIN
  INSERT INTO public.public_token_failures (
    resource_type, resource_id, attempted_token, ip_address, user_agent, reason
  ) VALUES (
    _resource_type, _resource_id, _attempted_token, _ip, _ua, _reason
  );

  IF _resource_id IS NULL THEN
    RETURN;
  END IF;

  SELECT count(*) INTO _recent_failures
  FROM public.public_token_failures
  WHERE resource_type = _resource_type
    AND resource_id = _resource_id
    AND created_at > now() - interval '1 hour';

  IF _recent_failures >= 5 THEN
    IF _resource_type = 'quote' THEN
      UPDATE public.quote_approval_tokens
      SET status = 'expired', updated_at = now()
      WHERE quote_id = _resource_id AND status = 'active';
    ELSIF _resource_type = 'kit' THEN
      UPDATE public.kit_share_tokens
      SET status = 'expired', updated_at = now()
      WHERE kit_id::text = _resource_id AND status = 'active';
    END IF;
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.record_public_token_failure(text,text,text,text,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_public_token_failure(text,text,text,text,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_public_token_failure(text,text,text,text,text,text) FROM authenticated;
-- service_role pode chamar via edge function (sem GRANT necessário)

COMMENT ON FUNCTION public.record_public_token_failure(text,text,text,text,text,text) IS
  'Migrada do Lovable em 2026-05-22 (Lote F). Anti-bruteforce: registra falha de token público e auto-expira após 5 falhas em 1h.';
