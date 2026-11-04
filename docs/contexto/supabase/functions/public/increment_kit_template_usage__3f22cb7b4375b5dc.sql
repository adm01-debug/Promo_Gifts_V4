CREATE OR REPLACE FUNCTION public.increment_kit_template_usage(_template_id uuid)
 RETURNS integer
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  UPDATE public.kit_templates 
  SET usage_count = usage_count + 1
  WHERE id = _template_id AND is_active = true
  RETURNING usage_count;
$function$
