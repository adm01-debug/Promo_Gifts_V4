CREATE OR REPLACE FUNCTION public.fn_tokenize_product_tags(p_name text)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(jsonb_agg(tok ORDER BY first_ord), '[]'::jsonb)
  FROM (
    SELECT tok, MIN(ord) AS first_ord
    FROM (
      SELECT t.tok, t.ord
      FROM regexp_split_to_table(lower(COALESCE(p_name,'')), '[^a-z0-9áàâãäéèêëíìîïóòôõöúùûüçñ]+')
           WITH ORDINALITY AS t(tok, ord)
    ) x
    WHERE length(tok) >= 3
      AND tok !~ '^[0-9]+$'
      AND tok NOT IN ('para','pelo','pela','pelos','pelas','sobre','entre','cada','como','mais','menos',
                      'este','esta','isso','aquele','aquela','seus','suas','com','por','dos','das','uma',
                      'uns','umas','até','ate','the','and','pçs','pcs','und','unid','tipo','modelo',
                      'unidade','unidades','aprox','aproximadamente')
    GROUP BY tok
    ORDER BY MIN(ord)
    LIMIT 12
  ) y;
$function$
