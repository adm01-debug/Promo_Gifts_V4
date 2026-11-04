CREATE OR REPLACE FUNCTION public.check_owner_email(_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$ SELECT email FROM auth.users WHERE id = _user_id; $function$
