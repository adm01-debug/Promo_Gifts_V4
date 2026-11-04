CREATE OR REPLACE FUNCTION public.magic_up_get_dashboard()
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'brand_kits', (SELECT count(*) FROM public.magic_up_brand_kits WHERE user_id = auth.uid()),
    'campaigns', (SELECT count(*) FROM public.magic_up_campaigns WHERE user_id = auth.uid()),
    'generations', (SELECT count(*) FROM public.magic_up_generations WHERE user_id = auth.uid()),
    'reactions', (SELECT count(*) FROM public.magic_up_reactions WHERE user_id = auth.uid())
  );
$function$
