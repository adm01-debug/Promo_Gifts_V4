-- ITEM B — Áreas de gravação por PERFIL DE CATEGORIA (Fase 9).
-- Contexto: print_area_techniques alimenta a calculadora de preço (v12). As áreas
-- existentes (13k, de abril) seguem perfis consistentes por categoria. Simulação massiva
-- (1.848 cenários reais): o perfil modal da categoria reproduz EXATAMENTE 91,8% dos
-- produtos. Gate de confiança: só aplica quando a categoria tem >=3 exemplares E o
-- fingerprint modal tem dominância >=60%. Fill-only (nunca toca produto com área).
-- Auditável: notes='profile_inference v1 ...' (rollback: DELETE WHERE notes LIKE 'profile_inference%').
CREATE OR REPLACE FUNCTION public.fn_apply_print_profiles(
    p_limit   integer DEFAULT 200,
    p_dry_run boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_applied  integer := 0;
  v_areas    integer := 0;
  v_skipped  integer := 0;
  v_prod     RECORD;
  v_template uuid;
  v_conf     numeric;
  v_n        integer;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin_or_above((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'Acesso negado: requer perfil admin ou superior';
  END IF;

  FOR v_prod IN
    SELECT p.id, p.category_id
    FROM public.products p
    WHERE p.is_active
      AND p.category_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.print_area_techniques pat WHERE pat.product_id = p.id)
    ORDER BY p.created_at DESC
    LIMIT p_limit
  LOOP
    -- perfil da categoria: fingerprint modal + produto exemplar (template) + confiança
    WITH fp AS (
      SELECT pat.product_id,
             string_agg(DISTINCT pat.location_code||'|'||pat.tabela_preco_id::text, ';'
                        ORDER BY pat.location_code||'|'||pat.tabela_preco_id::text) AS f
      FROM public.print_area_techniques pat
      JOIN public.products px ON px.id = pat.product_id
      WHERE px.category_id = v_prod.category_id AND pat.is_active
      GROUP BY pat.product_id
    ),
    modal AS (
      SELECT f, count(*) AS n_modal, sum(count(*)) OVER () AS n_total
      FROM fp GROUP BY f ORDER BY count(*) DESC LIMIT 1
    )
    SELECT (SELECT fp.product_id FROM fp JOIN modal m ON fp.f = m.f LIMIT 1),
           m.n_modal::numeric / NULLIF(m.n_total,0), m.n_total::integer
      INTO v_template, v_conf, v_n
    FROM modal m;

    IF v_template IS NULL OR v_n IS NULL OR v_n < 3 OR v_conf IS NULL OR v_conf < 0.60 THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    IF NOT p_dry_run THEN
      INSERT INTO public.print_area_techniques
        (product_id, tabela_preco_id, location_code, location_name, location_order,
         max_width, max_height, is_curved, shape, technique_order, is_active, notes)
      SELECT v_prod.id, t.tabela_preco_id, t.location_code, t.location_name, t.location_order,
             t.max_width, t.max_height, t.is_curved, t.shape, t.technique_order, true,
             'profile_inference v1 (cat='||v_prod.category_id||', conf='||round(v_conf*100)||'%, n='||v_n||')'
      FROM public.print_area_techniques t
      WHERE t.product_id = v_template AND t.is_active;
      GET DIAGNOSTICS v_areas = ROW_COUNT;
    ELSE
      SELECT count(*) INTO v_areas FROM public.print_area_techniques t
      WHERE t.product_id = v_template AND t.is_active;
    END IF;

    v_applied := v_applied + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'dry_run', p_dry_run,
    'produtos_processados', v_applied + v_skipped,
    'produtos_aplicados', v_applied, 'produtos_sem_perfil_confiavel', v_skipped);
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_apply_print_profiles(integer, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_apply_print_profiles(integer, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.fn_apply_print_profiles(integer, boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fn_apply_print_profiles(integer, boolean) TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_apply_print_profiles(integer, boolean) TO service_role;

COMMENT ON FUNCTION public.fn_apply_print_profiles(integer, boolean) IS
  'Fase 9: aplica areas de gravacao (print_area_techniques) por PERFIL MODAL da categoria. Gate: >=3 exemplares + dominancia >=60% (paridade simulada 91,8% em 1.848 cenarios). Fill-only, auditavel via notes, dry_run default true.';;
