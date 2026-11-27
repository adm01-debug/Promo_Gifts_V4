CREATE OR REPLACE FUNCTION public.fn_admin_classification_suggestions(_search text DEFAULT NULL::text, _somente_gaps boolean DEFAULT false, _min_matches integer DEFAULT 2, _limit integer DEFAULT 200)
 RETURNS TABLE(id bigint, product_id uuid, sku text, produto text, is_kit boolean, categoria_sugerida text, nivel integer, matches integer, score integer, tokens_matched text, already_assigned boolean, categorias_atuais text, material_conflict boolean, type_conflict boolean, approved_auto boolean, computed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'classification_audit'
AS $function$
DECLARE
  v_search text := nullif(btrim(coalesce(_search, '')), '');
  v_min integer := coalesce(_min_matches, 2);
  v_limit integer := least(greatest(coalesce(_limit, 200), 1), 500);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticacao obrigatoria.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_admin_or_above(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;

  IF v_min < 1 OR v_min > 20 THEN
    RAISE EXCEPTION 'Parametro _min_matches fora da faixa 1..20 (recebido %).', v_min
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.product_id,
    p.sku,
    p.name AS produto,
    p.is_kit,
    c.full_path_readable AS categoria_sugerida,
    s.category_level AS nivel,
    s.matches,
    s.score,
    s.tokens_matched,
    s.already_assigned,
    (
      SELECT string_agg(c2.name, ' + ' ORDER BY c2.level)
      FROM public.product_category_assignments AS pca2
      JOIN public.categories AS c2 ON c2.id = pca2.category_id
      WHERE pca2.product_id = s.product_id AND c2.level >= 2
    ) AS categorias_atuais,
    coalesce(s.material_conflict, false),
    coalesce(s.type_conflict, false),
    coalesce(s.approved_auto, false),
    s.computed_at
  FROM classification_audit.category_suggestions AS s
  JOIN public.products AS p ON p.id = s.product_id AND p.is_active
  LEFT JOIN public.categories AS c ON c.id = s.category_id
  WHERE s.matches >= v_min
    AND (NOT _somente_gaps OR NOT s.already_assigned)
    AND (
      v_search IS NULL
      OR p.sku ILIKE '%' || v_search || '%'
      OR p.name ILIKE '%' || v_search || '%'
      OR coalesce(c.full_path_readable, '') ILIKE '%' || v_search || '%'
    )
  ORDER BY s.matches DESC, s.score DESC, p.sku
  LIMIT v_limit;
END;
$function$
