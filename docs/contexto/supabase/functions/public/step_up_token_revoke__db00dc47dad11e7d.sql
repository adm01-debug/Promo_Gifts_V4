CREATE OR REPLACE FUNCTION public.step_up_token_revoke(_token_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.step_up_tokens SET consumed = true, consumed_at = now()
  WHERE id = _token_id AND user_id = auth.uid();
END $function$
