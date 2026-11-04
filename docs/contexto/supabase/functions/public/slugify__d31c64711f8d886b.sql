CREATE OR REPLACE FUNCTION public.slugify(input_text text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  result TEXT;
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  result := LOWER(TRIM(input_text));
  
  -- Substituir acentos
  result := TRANSLATE(result, 
    'áàâãäåéèêëíìîïóòôõöúùûüçñýÿ',
    'aaaaaaeeeeiiiiooooouuuucnyy'
  );
  
  -- Substituir caracteres especiais por hífen
  result := REGEXP_REPLACE(result, '[^a-z0-9]+', '-', 'g');
  
  -- Remover hífens duplicados
  result := REGEXP_REPLACE(result, '-+', '-', 'g');
  
  -- Remover hífen do início e fim
  result := TRIM(BOTH '-' FROM result);
  
  -- Limitar tamanho (máx 100 chars)
  result := LEFT(result, 100);
  
  -- Remover hífen do fim se cortou no meio
  result := TRIM(BOTH '-' FROM result);
  
  RETURN result;
END;
$function$
