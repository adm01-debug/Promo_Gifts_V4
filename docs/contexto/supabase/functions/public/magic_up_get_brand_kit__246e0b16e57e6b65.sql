CREATE OR REPLACE FUNCTION public.magic_up_get_brand_kit(_kit_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  SELECT to_jsonb(k) FROM public.magic_up_brand_kits k
  WHERE id = _kit_id AND user_id = auth.uid();
$function$
