CREATE OR REPLACE FUNCTION public.fn_admin_classification_apply(_dry_run boolean DEFAULT true, _min_matches integer DEFAULT 4)
 RETURNS TABLE(acao text, product_id uuid, sku text, produto text, categoria text, matches integer, score integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'classification_audit', 'pg_temp'
AS $function$
DECLARE
  v_dry boolean := coalesce(_dry_run, true);
  v_min integer := coalesce(_min_matches, 4);
  v_candidatos integer := 0;
  v_antes integer := 0;
  v_depois integer := 0;
  v_inseridas integer := 0;
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

  SELECT count(*)::integer
    INTO v_candidatos
    FROM classification_audit.category_suggestions AS s
    JOIN public.products AS p ON p.id = s.product_id AND p.is_active
    WHERE NOT s.already_assigned AND s.matches >= v_min;

  IF NOT v_dry THEN
    SELECT count(*)::integer
      INTO v_antes
      FROM public.product_category_assignments AS pca
      WHERE (pca.product_id, pca.category_id) IN (
        SELECT s.product_id, s.category_id
        FROM classification_audit.category_suggestions AS s
        JOIN public.products AS p ON p.id = s.product_id AND p.is_active
        WHERE NOT s.already_assigned AND s.matches >= v_min
      );

    PERFORM 1 FROM classification_audit.apply_high_confidence_suggestions(false, v_min);

    SELECT count(*)::integer
      INTO v_depois
      FROM public.product_category_assignments AS pca
      WHERE (pca.product_id, pca.category_id) IN (
        SELECT s.product_id, s.category_id
        FROM classification_audit.category_suggestions AS s
        JOIN public.products AS p ON p.id = s.product_id AND p.is_active
        WHERE NOT s.already_assigned AND s.matches >= v_min
      );

    v_inseridas := v_depois - v_antes;
  END IF;

  RETURN QUERY
  SELECT
    CASE
      WHEN v_dry THEN 'DRY-RUN'::text
      WHEN v_inseridas > 0 THEN 'APLICADO'::text
      ELSE 'SEM MUDANCA'::text
    END AS acao,
    a.product_id,
    p.sku,
    a.produto,
    a.categoria,
    a.matches,
    a.score
  FROM classification_audit.apply_high_confidence_suggestions(true, v_min) AS a
  LEFT JOIN public.products AS p ON p.id = a.product_id;

  IF NOT v_dry AND v_inseridas > 0 THEN
    PERFORM public.log_audit(
      'classification_suggestions_applied',
      'classification_audit.category_suggestions',
      v_min::text,
      jsonb_build_object(
        'min_matches', v_min,
        'candidatos', v_candidatos,
        'atribuicoes_criadas', v_inseridas
      )
    );
  END IF;
END;
$function$
