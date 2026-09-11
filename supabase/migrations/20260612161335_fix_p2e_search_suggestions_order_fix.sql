
-- Corrigir: SELECT DISTINCT não permite ORDER BY com expressões não na select list
-- Solução: remover DISTINCT e usar GROUP BY, ou incluir a expressão de prioridade

CREATE OR REPLACE FUNCTION public.search_suggestions(
  p_partial_term character varying,
  p_limit        integer DEFAULT 10
)
RETURNS TABLE(suggestion character varying, suggestion_type character varying, count bigint)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_term_normalized text;
  v_term_prefix     text;
  v_term_word       text;
BEGIN
  v_term_normalized := unaccent(lower(trim(p_partial_term)));
  v_term_prefix     := v_term_normalized || '%';
  v_term_word       := '% ' || v_term_normalized || '%';

  IF length(v_term_normalized) < 2 THEN RETURN; END IF;

  RETURN QUERY
  (
    SELECT
      p.name::VARCHAR AS suggestion,
      'produto'::VARCHAR AS suggestion_type,
      COUNT(*)::BIGINT AS count
    FROM products p
    WHERE p.is_active = true
      AND (p.is_deleted = false OR p.is_deleted IS NULL)
      AND (
        unaccent(lower(p.name)) LIKE v_term_prefix
        OR unaccent(lower(p.name)) LIKE v_term_word
      )
    GROUP BY p.name
    ORDER BY
      -- Prioridade 1: começa com o termo
      MIN(CASE WHEN unaccent(lower(p.name)) LIKE v_term_prefix THEN 0 ELSE 1 END),
      COUNT(*) DESC
    LIMIT p_limit / 2
  )
  UNION ALL
  (
    SELECT
      c.name::VARCHAR AS suggestion,
      'categoria'::VARCHAR AS suggestion_type,
      (SELECT COUNT(DISTINCT pca.product_id)
       FROM product_category_assignments pca
       JOIN products p2 ON p2.id = pca.product_id
       WHERE pca.category_id = c.id
         AND p2.is_active = true
         AND (p2.is_deleted = false OR p2.is_deleted IS NULL)
      )::BIGINT AS count
    FROM categories c
    WHERE c.is_active = true
      AND (
        unaccent(lower(c.name)) LIKE v_term_prefix
        OR unaccent(lower(c.name)) LIKE v_term_word
      )
    ORDER BY
      CASE WHEN unaccent(lower(c.name)) LIKE v_term_prefix THEN 0 ELSE 1 END,
      count DESC
    LIMIT p_limit / 2
  )
  ORDER BY count DESC
  LIMIT p_limit;
END;
$function$;
;
