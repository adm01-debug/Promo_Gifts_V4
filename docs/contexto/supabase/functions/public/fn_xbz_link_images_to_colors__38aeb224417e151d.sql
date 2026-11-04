CREATE OR REPLACE FUNCTION public.fn_xbz_link_images_to_colors(p_dry_run boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.fn_color_link_all_suppliers(p_dry_run);
$function$
