CREATE OR REPLACE FUNCTION public.fn_safe_bool(p text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v text;
BEGIN
  IF p IS NULL OR TRIM(p)='' THEN RETURN NULL; END IF;
  v := lower(unaccent(TRIM(p)));
  IF v IN ('sim','s','true','t','1','yes','y','ativo','active') THEN RETURN TRUE; END IF;
  IF v IN ('nao','n','false','f','0','no','inativo','inactive') THEN RETURN FALSE; END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  v := lower(TRIM(p));
  IF v IN ('sim','s','true','t','1','yes','y','ativo','active') THEN RETURN TRUE; END IF;
  IF v IN ('nao','não','n','false','f','0','no','inativo','inactive') THEN RETURN FALSE; END IF;
  RETURN NULL;
END; $function$
