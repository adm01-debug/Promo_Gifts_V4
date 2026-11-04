CREATE OR REPLACE FUNCTION public.get_quote_token_by_value(_token text)
 RETURNS SETOF quote_approval_tokens
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT * 
  FROM public.quote_approval_tokens 
  WHERE token = _token 
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
$function$
