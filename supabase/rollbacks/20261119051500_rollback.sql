-- Rollback: 20261119051500_fix_get_quote_token_public_expiracao_pg_temp
-- Volta a função ao estado de produção lido em 2026-11-19 (pg_get_functiondef): filtra
-- SOMENTE por token, devolve os dados mesmo com o link expirado, e usa search_path = ''.
-- Reverter reabre o defeito; está aqui apenas porque o contrato E15 exige rollback.

CREATE OR REPLACE FUNCTION public.get_quote_token_public(_token text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT jsonb_build_object(
    'id',             qat.id,
    'quote_id',       qat.quote_id,
    'token',          qat.token,
    'status',         qat.status,
    'expires_at',     qat.expires_at,
    'client_name',    qat.client_name,
    'viewed_at',      qat.viewed_at,
    'responded_at',   qat.responded_at,
    'response',       qat.response,
    'response_notes', qat.response_notes,
    'created_at',     qat.created_at,
    'signer_name',    qat.signer_name,
    'signed_at',      qat.signed_at
  )
  FROM public.quote_approval_tokens qat
  WHERE qat.token = _token
  LIMIT 1;
$function$;
