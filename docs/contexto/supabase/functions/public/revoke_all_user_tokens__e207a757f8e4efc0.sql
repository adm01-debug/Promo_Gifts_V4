CREATE OR REPLACE FUNCTION public.revoke_all_user_tokens(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_token_revocations (user_id, revoked_at)
  VALUES (_user_id, now())
  ON CONFLICT (user_id) DO UPDATE SET revoked_at = now();
END;
$function$
