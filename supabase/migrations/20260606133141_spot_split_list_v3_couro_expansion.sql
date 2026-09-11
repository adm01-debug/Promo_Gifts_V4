-- v3: protege abreviações de 1 letra (v2) + expande "C." → "Couro"
-- (C. sintético, C. Sintético etc. → Couro sintético, Couro Sintético)
CREATE OR REPLACE FUNCTION public.fn_spot_split_list(p text)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path TO 'public','extensions' AS $$
  WITH prot AS (
    SELECT regexp_replace(
             public.fn_fix_mojibake(COALESCE(p,'')),
             '(^|[[:space:],.])([[:alpha:]])\.[[:space:]]+',
             '\1\2.' || chr(1),
             'g') AS s
  )
  SELECT to_jsonb(
           COALESCE(
             array_agg(
               regexp_replace(                          -- v3: expande "C. " → "Couro " no início do elemento
                 replace(btrim(e), chr(1), ' '),
                 '^[Cc]\. ',
                 'Couro ',
                 'i'
               )
             ) FILTER (WHERE btrim(replace(e, chr(1), ' ')) <> ''),
             ARRAY[]::text[]))
  FROM prot, unnest(regexp_split_to_array(prot.s, '[.,][[:space:]]+')) AS e;
$$;;
