CREATE OR REPLACE FUNCTION public.fn_sanitize_url(p_url text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_url TEXT := p_url;
BEGIN
  IF v_url IS NULL THEN RETURN NULL; END IF;

  -- Trim espaços externos
  v_url := TRIM(v_url);

  -- Remover caracteres de controle embutidos (CR, LF, TAB)
  v_url := REPLACE(v_url, CHR(13), '');
  v_url := REPLACE(v_url, CHR(10), '');
  v_url := REPLACE(v_url, CHR(9),  '');

  -- Corrigir https:/ (1 slash) → https://
  -- Usando REGEXP_REPLACE para precisão: ^https:/(?!/)
  v_url := REGEXP_REPLACE(v_url, '^https:/([^/])', 'https://\1');

  -- Corrigir http:/ (1 slash) → http://
  v_url := REGEXP_REPLACE(v_url, '^http:/([^/])', 'http://\1');

  -- Se ficou vazio após trim, retornar NULL
  IF v_url = '' THEN RETURN NULL; END IF;

  RETURN v_url;
END;
$function$
