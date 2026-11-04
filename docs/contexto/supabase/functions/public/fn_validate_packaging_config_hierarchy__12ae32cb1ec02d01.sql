CREATE OR REPLACE FUNCTION public.fn_validate_packaging_config_hierarchy()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_bad TEXT;
BEGIN
  WITH cfg AS (
    SELECT CASE WHEN config_key LIKE 'bottles%' THEN 'bottles' WHEN config_key LIKE 'fragile%' THEN 'fragile'
                WHEN config_key LIKE 'precision%' THEN 'precision' ELSE 'default' END AS perfil,
           CASE WHEN config_key LIKE '%min_gap_mm' THEN 'min' WHEN config_key LIKE '%tight%' THEN 'tight'
                WHEN config_key LIKE '%good%' THEN 'good' WHEN config_key LIKE '%max_gap_mm' THEN 'max' END AS lvl,
           config_value::numeric AS val
    FROM packaging_compatibility_config WHERE config_key ~ '(min_gap_mm|tight.*max|good.*max|max_gap_mm)'),
  piv AS (SELECT perfil, MAX(val) FILTER (WHERE lvl='min') vmin, MAX(val) FILTER (WHERE lvl='tight') vtight,
                 MAX(val) FILTER (WHERE lvl='good') vgood, MAX(val) FILTER (WHERE lvl='max') vmax
          FROM cfg WHERE lvl IS NOT NULL GROUP BY perfil)
  SELECT string_agg(perfil,', ') INTO v_bad FROM piv WHERE NOT (vmin < vtight AND vtight < vgood AND vgood <= vmax);
  IF v_bad IS NOT NULL THEN RAISE EXCEPTION 'Hierarquia de folgas invalida (min<tight<good<=max) no(s) perfil(is): %', v_bad; END IF;
  RETURN NULL;
END$function$
