CREATE OR REPLACE FUNCTION public.is_dev(_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT public.has_role(_user_id, 'dev'::public.app_role);
$function$
