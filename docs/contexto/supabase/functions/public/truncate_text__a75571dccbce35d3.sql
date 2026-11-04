CREATE OR REPLACE FUNCTION public.truncate_text(input_text text, max_length integer, suffix text DEFAULT ''::text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  result TEXT;
  actual_max INTEGER;
  last_space INTEGER;
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Se texto já é menor que limite, retornar como está
  IF LENGTH(input_text) <= max_length THEN
    RETURN input_text;
  END IF;
  
  -- Calcular tamanho real considerando sufixo
  actual_max := max_length - LENGTH(suffix);
  
  -- Truncar
  result := LEFT(input_text, actual_max);
  
  -- Tentar cortar na última palavra completa
  last_space := LENGTH(result) - POSITION(' ' IN REVERSE(result)) + 1;
  IF last_space > 1 AND last_space < LENGTH(result) THEN
    result := LEFT(result, last_space - 1);
  END IF;
  
  -- Remover pontuação do final
  result := RTRIM(result, '.,;:!? ');
  
  RETURN result || suffix;
END;
$function$
