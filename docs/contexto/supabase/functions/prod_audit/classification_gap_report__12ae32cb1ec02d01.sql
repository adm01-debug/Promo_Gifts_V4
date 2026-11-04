CREATE OR REPLACE FUNCTION prod_audit.classification_gap_report()
 RETURNS TABLE(regra text, descricao text, categoria_alvo_pattern text, produtos_que_batem integer, ja_classificados integer, faltando_classificar integer, pct_gap numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'prod_audit', 'public'
AS $function$
DECLARE r record; v_sql text; v_result record;
BEGIN
  FOR r IN SELECT * FROM prod_audit.classification_rules WHERE active ORDER BY id LOOP
    v_sql := format($Q$
      WITH match_prods AS (
        SELECT pf.product_id, pf.current_categories
        FROM prod_audit.product_features pf
        JOIN products p ON p.id = pf.product_id
        WHERE (%s)
      ),
      target_cats AS (
        SELECT id FROM categories 
        WHERE is_active 
          AND (name ILIKE '%%' || %L || '%%'
               OR full_path_readable ILIKE '%%' || %L || '%%')
      ),
      assess AS (
        SELECT COUNT(*) AS total,
          COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM unnest(mp.current_categories) AS cc WHERE cc IN (SELECT id FROM target_cats)
          )) AS com_target,
          COUNT(*) FILTER (WHERE NOT EXISTS (
            SELECT 1 FROM unnest(mp.current_categories) AS cc WHERE cc IN (SELECT id FROM target_cats)
          )) AS sem_target
        FROM match_prods mp
      )
      SELECT total, com_target, sem_target FROM assess;
    $Q$, r.product_condition, r.target_category_name_like, r.target_category_name_like);

    EXECUTE v_sql INTO v_result;
    regra := r.rule_name;
    descricao := r.description;
    categoria_alvo_pattern := r.target_category_name_like;
    produtos_que_batem := COALESCE(v_result.total, 0);
    ja_classificados := COALESCE(v_result.com_target, 0);
    faltando_classificar := COALESCE(v_result.sem_target, 0);
    pct_gap := CASE WHEN COALESCE(v_result.total, 0) = 0 THEN 0
                ELSE ROUND(100.0 * v_result.sem_target / v_result.total, 1) END;
    RETURN NEXT;
  END LOOP;
END;
$function$
