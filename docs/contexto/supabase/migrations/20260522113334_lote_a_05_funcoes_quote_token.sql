-- ============================================================================
-- LOTE A · MIGRATION 5/6 · funções dependentes de quote_approval_tokens
-- ============================================================================

-- 1) get_quote_token_by_value: lookup público por valor (SECURITY DEFINER)
--    Whitelisted em audit_security_definer_acl no Lovable
CREATE OR REPLACE FUNCTION public.get_quote_token_by_value(_token text)
RETURNS SETOF public.quote_approval_tokens
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT * FROM public.quote_approval_tokens WHERE token = _token LIMIT 1;
$function$;

-- ACL: lockdown para PUBLIC/anon/authenticated (será aberto especificamente conforme uso)
REVOKE EXECUTE ON FUNCTION public.get_quote_token_by_value(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_quote_token_by_value(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_quote_token_by_value(text) FROM authenticated;
-- Page pública de aprovação chama via edge function service_role; whitelist específica:
GRANT EXECUTE ON FUNCTION public.get_quote_token_by_value(text) TO anon;

COMMENT ON FUNCTION public.get_quote_token_by_value(text) IS
  'Whitelisted em audit_security_definer_acl. Usada pela página pública /aprovar-orcamento/:token';

-- 2) submit_quote_response: submissão pública de resposta de orçamento
CREATE OR REPLACE FUNCTION public.submit_quote_response(_token text, _response text, _response_notes text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate response value
  IF _response NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid response value';
  END IF;

  -- Only update allowed fields on active, unexpired tokens
  UPDATE public.quote_approval_tokens
  SET 
    response = _response,
    response_notes = _response_notes,
    responded_at = now(),
    status = 'responded',
    updated_at = now()
  WHERE token = _token
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
    AND responded_at IS NULL;

  RETURN FOUND;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.submit_quote_response(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_quote_response(text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quote_response(text, text, text) TO anon;

COMMENT ON FUNCTION public.submit_quote_response(text, text, text) IS
  'Whitelisted. Submissão pública de resposta (approved/rejected) via página /aprovar-orcamento/:token';
