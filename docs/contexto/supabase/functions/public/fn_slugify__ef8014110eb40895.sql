CREATE OR REPLACE FUNCTION public.fn_slugify(p_text text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE STRICT
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_result text;
BEGIN
  IF p_text IS NULL OR btrim(p_text) = '' THEN RETURN NULL; END IF;

  -- 1. Lower
  v_result := lower(btrim(p_text));

  -- 2. Substituição de acentos pt-BR + espanhol (cobertura ampla)
  v_result := translate(v_result,
    'áàãâäåéèêëíìîïóòõôöúùûüçñýÿœæ',
    'aaaaaaeeeeiiiiooooouuuucnyyoa'
  );

  -- 3. Remover qualquer caractere não-ASCII remanescente (paranoia)
  v_result := regexp_replace(v_result, '[^\x00-\x7F]', '', 'g');

  -- 4. Substituir espaço/underscore/pontuação por hífen
  v_result := regexp_replace(v_result, '[^a-z0-9]+', '-', 'g');

  -- 5. Colapsar múltiplos hífens
  v_result := regexp_replace(v_result, '-{2,}', '-', 'g');

  -- 6. Strip leading/trailing hyphens
  v_result := btrim(v_result, '-');

  RETURN NULLIF(v_result, '');
END;
$function$
