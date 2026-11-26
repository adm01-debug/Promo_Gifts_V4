-- Rollback: supabase/rollbacks/20261126211200_rollback.sql
-- approved-by: adm01-debug
--
-- Da tela ao schema de auditoria de classificacao (classification_audit).
--
-- Causa medida: o schema `classification_audit` e a unica capacidade de
-- negocio do banco sem nenhuma referencia em `src/` (varredura de
-- 2026-11-26, docs/estado/15_VARREDURA_BACKEND_UI.md). Ele guarda a trilha de
-- analise de categorizacao — `category_suggestions` (RLS habilitada e zero
-- policies), as views `v_gaps_acionaveis` / `v_kits_para_revisao` — e a unica
-- acao do conjunto, `apply_high_confidence_suggestions(p_dry_run, p_min_matches)`
-- (SECURITY DEFINER, escreve em `public.product_category_assignments`).
-- O EXECUTE para `anon` foi revogado em 20261125074200, mas o grant ficou so
-- para `service_role`: sem RPC em `public` e sem tela, o negocio nao tinha como
-- ver nem aplicar a classificacao proposta.
--
-- Esta migration NAO abre o schema interno: `classification_audit` continua
-- deny-all (nenhum GRANT novo em tabela/view/sequencia). Todo acesso passa por
-- tres RPCs `public` SECURITY DEFINER com guard `is_admin_or_above(auth.uid())`
-- que devolvem dados ja projetados e com `search_path` fixo.

CREATE OR REPLACE FUNCTION public.fn_admin_classification_summary()
RETURNS TABLE (
  total_sugestoes bigint,
  nao_atribuidas bigint,
  kits_para_revisao bigint,
  conflitos bigint,
  alta_confianca bigint,
  ultima_analise timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, classification_audit, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticacao obrigatoria.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_admin_or_above(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    count(*)::bigint AS total_sugestoes,
    count(*) FILTER (WHERE NOT s.already_assigned)::bigint AS nao_atribuidas,
    count(*) FILTER (
      WHERE NOT s.already_assigned
        AND s.matches >= 3
        AND (p.is_kit OR p.name ILIKE '%KIT%' OR p.name ILIKE '%CONJ%')
    )::bigint AS kits_para_revisao,
    count(*) FILTER (
      WHERE coalesce(s.material_conflict, false) OR coalesce(s.type_conflict, false)
    )::bigint AS conflitos,
    count(*) FILTER (WHERE NOT s.already_assigned AND s.matches >= 4)::bigint AS alta_confianca,
    max(s.computed_at) AS ultima_analise
  FROM classification_audit.category_suggestions AS s
  JOIN public.products AS p ON p.id = s.product_id AND p.is_active;
END;
$$

ALTER FUNCTION public.fn_admin_classification_summary() OWNER TO postgres

COMMENT ON FUNCTION public.fn_admin_classification_summary() IS
  'KPIs da trilha de classificacao (classification_audit.category_suggestions) para administradores. Consumida pela aba Classificacao de /admin/cadastros.'

CREATE OR REPLACE FUNCTION public.fn_admin_classification_suggestions(
  _search text DEFAULT NULL,
  _somente_gaps boolean DEFAULT false,
  _min_matches integer DEFAULT 2,
  _limit integer DEFAULT 200
)
RETURNS TABLE (
  id bigint,
  product_id uuid,
  sku text,
  produto text,
  is_kit boolean,
  categoria_sugerida text,
  nivel integer,
  matches integer,
  score integer,
  tokens_matched text,
  already_assigned boolean,
  categorias_atuais text,
  material_conflict boolean,
  type_conflict boolean,
  approved_auto boolean,
  computed_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, classification_audit, pg_temp
AS $$
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
$$

ALTER FUNCTION public.fn_admin_classification_suggestions(text, boolean, integer, integer) OWNER TO postgres

COMMENT ON FUNCTION public.fn_admin_classification_suggestions(text, boolean, integer, integer) IS
  'Lista a trilha de classificacao (classification_audit.category_suggestions) com produto, categoria sugerida, categorias atuais e flags de conflito. Filtros: termo, somente gaps e minimo de matches. Consumida pela aba Classificacao de /admin/cadastros.'

CREATE OR REPLACE FUNCTION public.fn_admin_classification_apply(
  _dry_run boolean DEFAULT true,
  _min_matches integer DEFAULT 4
)
RETURNS TABLE (
  acao text,
  product_id uuid,
  sku text,
  produto text,
  categoria text,
  matches integer,
  score integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, classification_audit, pg_temp
AS $$
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
$$

ALTER FUNCTION public.fn_admin_classification_apply(boolean, integer) OWNER TO postgres

COMMENT ON FUNCTION public.fn_admin_classification_apply(boolean, integer) IS
  'Executa classification_audit.apply_high_confidence_suggestions em nome de um administrador (dry-run ou aplicacao real). Retorna acao = DRY-RUN | APLICADO | SEM MUDANCA (SEM MUDANCA quando nenhuma atribuicao foi criada, caso em que nada e auditado). Registra em public.log_audit somente quando cria atribuicao. Consumida pela aba Classificacao de /admin/cadastros.'

REVOKE ALL ON FUNCTION public.fn_admin_classification_summary() FROM PUBLIC

REVOKE ALL ON FUNCTION public.fn_admin_classification_summary() FROM anon

GRANT EXECUTE ON FUNCTION public.fn_admin_classification_summary() TO authenticated

GRANT EXECUTE ON FUNCTION public.fn_admin_classification_summary() TO service_role

REVOKE ALL ON FUNCTION public.fn_admin_classification_suggestions(text, boolean, integer, integer) FROM PUBLIC

REVOKE ALL ON FUNCTION public.fn_admin_classification_suggestions(text, boolean, integer, integer) FROM anon

GRANT EXECUTE ON FUNCTION public.fn_admin_classification_suggestions(text, boolean, integer, integer) TO authenticated

GRANT EXECUTE ON FUNCTION public.fn_admin_classification_suggestions(text, boolean, integer, integer) TO service_role

REVOKE ALL ON FUNCTION public.fn_admin_classification_apply(boolean, integer) FROM PUBLIC

REVOKE ALL ON FUNCTION public.fn_admin_classification_apply(boolean, integer) FROM anon

GRANT EXECUTE ON FUNCTION public.fn_admin_classification_apply(boolean, integer) TO authenticated

GRANT EXECUTE ON FUNCTION public.fn_admin_classification_apply(boolean, integer) TO service_role
