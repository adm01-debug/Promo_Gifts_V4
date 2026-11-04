CREATE OR REPLACE FUNCTION public.fn_parse_paper_color_code(p_tags jsonb, p_description text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_all text := lower(coalesce(p_tags::text,'') || ' ' || coalesce(p_description,''));
BEGIN
  IF v_all ILIKE ANY(ARRAY['%marfim%','%amarelad%','%cor marfim%','%amarelas%','%amber%']) THEN RETURN 'IVORY'; END IF;
  IF v_all ILIKE ANY(ARRAY['%reciclado%','%kraft%','%natural%']) AND v_all ILIKE '%papel%' THEN RETURN 'RECYCLED'; END IF;
  IF v_all ILIKE '%brancas%' OR v_all ILIKE '%folhas brancas%' THEN RETURN 'WHITE'; END IF;
  RETURN NULL;  -- white é o default implícito
END;
$function$
