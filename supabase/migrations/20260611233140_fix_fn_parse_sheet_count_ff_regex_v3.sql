
-- FIX: \b → (?!\w) para pattern "ff" + robustez geral
CREATE OR REPLACE FUNCTION public.fn_parse_sheet_count(p_description text)
RETURNS int LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_desc  text := lower(coalesce(p_description,''));
  v_match text[];
  v_n     int;
BEGIN
  -- "N folhas" (com ou sem aproximadamente/possui/contém)
  SELECT m INTO v_match
  FROM regexp_matches(
    v_desc,
    '(?:(?:aproximadamente|com|possui|contém|tem)\s+)?(\d+)\s*folhas?',
    'g'
  ) AS t(m)
  LIMIT 1;
  IF v_match IS NOT NULL THEN
    v_n := v_match[1]::int;
    IF v_n BETWEEN 10 AND 1000 THEN RETURN v_n; END IF;
  END IF;

  -- "N páginas" → divir por 2
  SELECT m INTO v_match
  FROM regexp_matches(
    v_desc,
    '(?:(?:aproximadamente|com|possui|contém|tem)\s+)?(\d+)\s*páginas?',
    'g'
  ) AS t(m)
  LIMIT 1;
  IF v_match IS NOT NULL THEN
    v_n := v_match[1]::int;
    IF v_n BETWEEN 20 AND 2000 THEN RETURN v_n / 2; END IF;
  END IF;

  -- "Nff" (abreviatura pt-br de folhas) — usa (?!\w) em vez de \b
  SELECT m INTO v_match
  FROM regexp_matches(v_desc, '(\d+)\s*ff(?!\w)', 'g') AS t(m)
  LIMIT 1;
  IF v_match IS NOT NULL THEN
    v_n := v_match[1]::int;
    IF v_n BETWEEN 10 AND 500 THEN RETURN v_n; END IF;
  END IF;

  RETURN NULL;
END;
$$;
;
