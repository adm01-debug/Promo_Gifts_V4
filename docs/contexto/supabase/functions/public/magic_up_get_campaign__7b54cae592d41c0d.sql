CREATE OR REPLACE FUNCTION public.magic_up_get_campaign(_campaign_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  SELECT to_jsonb(c) FROM public.magic_up_campaigns c
  WHERE id = _campaign_id AND user_id = auth.uid();
$function$
