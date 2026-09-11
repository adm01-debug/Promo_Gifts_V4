
-- FIX: Regex mais robusta — captura 80g, 80g., 80g/m², 80 gsm
CREATE OR REPLACE FUNCTION public.fn_parse_paper_weight(p_description text)
RETURNS int LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_desc  text := lower(coalesce(p_description,''));
  v_match text[];
  v_n     int;
BEGIN
  -- Tentar capturar gramatura em diversas formas:
  -- "75 g/m²", "75g/m2", "75 gsm", "80g", "80g.", "80g,"
  -- Padrão: número + opcional espaço + g + (/ ou espaço ou pontuação não-alfa ou fim)
  SELECT m INTO v_match
  FROM regexp_matches(
    v_desc,
    '(\d+)\s*(?:g/m[²2]|gsm|g(?![a-z]))',
    'ig'  -- case insensitive, multiline
  ) AS t(m)
  LIMIT 1;

  IF v_match IS NOT NULL THEN
    v_n := v_match[1]::int;
    -- Faixa válida para papel de caderno (50–250 g/m²)
    IF v_n BETWEEN 50 AND 250 THEN RETURN v_n; END IF;
  END IF;
  RETURN NULL;
END;
$$;
;
