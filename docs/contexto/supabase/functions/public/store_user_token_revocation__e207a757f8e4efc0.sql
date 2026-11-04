CREATE OR REPLACE FUNCTION public.store_user_token_revocation(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.is_supervisor_or_above(auth.uid()) OR auth.uid() = _user_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  INSERT INTO public.user_token_revocations(user_id) VALUES (_user_id)
  ON CONFLICT (user_id) DO UPDATE SET revoked_at = EXCLUDED.revoked_at;
END $function$
