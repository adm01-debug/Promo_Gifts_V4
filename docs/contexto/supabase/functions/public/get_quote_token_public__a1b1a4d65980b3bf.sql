CREATE OR REPLACE FUNCTION public.get_quote_token_public(_token text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
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
    -- GUARD: link expirado deixa de devolver dados. Espelha a condição que
    -- public.submit_quote_response já aplica. `expires_at IS NULL` segue aceito porque a
    -- coluna é nullable e o default (now() + 30 days) só vale para linhas novas.
    AND (qat.expires_at IS NULL OR qat.expires_at > pg_catalog.now())
  LIMIT 1;
$function$
