-- v2: protege abreviações de 1 letra ("C. sintético", "C. Sintético") do split.
-- Troca o espaço após "<sep|início><1 letra>. " por sentinela chr(1), divide por [.,]\s+,
-- e restaura a sentinela como espaço. Conserta mojibake antes. Filtra vazios.
CREATE OR REPLACE FUNCTION public.fn_spot_split_list(p text)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path TO 'public','extensions' AS $$
  WITH prot AS (
    SELECT regexp_replace(
             public.fn_fix_mojibake(COALESCE(p,'')),
             '(^|[[:space:],.])([[:alpha:]])\.[[:space:]]+',  -- "X. " com X = 1 letra isolada
             '\1\2.' || chr(1),                                -- protege: ponto + sentinela
             'g') AS s
  )
  SELECT to_jsonb(
           COALESCE(
             array_agg(replace(btrim(e), chr(1), ' '))
               FILTER (WHERE btrim(replace(e, chr(1), ' ')) <> ''),
             ARRAY[]::text[]))
  FROM prot, unnest(regexp_split_to_array(prot.s, '[.,][[:space:]]+')) AS e;
$$;;
