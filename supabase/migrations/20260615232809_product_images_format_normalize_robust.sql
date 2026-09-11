-- ============================================================================
-- product_images :: fn_normalize_image_format ROBUSTA (fail-open)
-- GAP descoberto em teste: btrim() só remove espaços; format com tab/newline/CR/
-- ';'/espaço interno (ex.: "image/jpeg; charset=utf-8") sobrevivia à normalização
-- e era REJEITADO pelo CHECK chk_product_images_format_lc -> a LINHA INTEIRA falhava
-- (regressão capaz de quebrar a ingestão por um campo meramente cosmético).
-- Correção: normaliza extraindo a 1a sequência [a-z0-9] (após remover prefixo mime),
-- garantindo que a saída SEMPRE satisfaz o CHECK. Nunca derruba a linha por format.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_normalize_image_format()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v text;
BEGIN
  IF NEW.format IS NOT NULL THEN
    v := lower(NEW.format);
    v := regexp_replace(v, '^.*/', '');     -- remove prefixo mime (até a última '/')
    v := substring(v from '[a-z0-9]+');     -- 1a sequência alfanumérica (ou NULL)
    IF v = 'jpg' THEN v := 'jpeg'; END IF;  -- canonicaliza
    NEW.format := v;                        -- NULL se nada alfanumérico (fail-open)
  END IF;
  RETURN NEW;
END;
$$;;
