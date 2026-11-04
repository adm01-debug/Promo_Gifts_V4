CREATE OR REPLACE FUNCTION public.fn_parse_cover_type_code(p_name text, p_description text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_all text := lower(coalesce(p_name,'') || ' ' || coalesce(p_description,''));
BEGIN
  -- Semi-rígida (antes de HARD para não pegar "dura" de semi-rígida)
  IF v_all ILIKE '%semi%rígida%' OR v_all ILIKE '%semi rígida%' THEN RETURN 'SEMI'; END IF;
  -- HARD
  IF v_all ILIKE ANY(ARRAY[
    '%capa dura%','%capa rígida%','%hard cover%','%hardcover%',
    '%cartonada%','%capa dura%'
  ]) THEN RETURN 'HARD'; END IF;
  -- SOFT
  IF v_all ILIKE ANY(ARRAY[
    '%capa flexível%','%capa mole%','%soft cover%','%softcover%',
    '%capa flex%'
  ]) THEN RETURN 'SOFT'; END IF;
  RETURN NULL;
END;
$function$
