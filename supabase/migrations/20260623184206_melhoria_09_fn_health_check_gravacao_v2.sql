
DROP FUNCTION IF EXISTS public.fn_health_check_gravacao();

CREATE FUNCTION public.fn_health_check_gravacao()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_tecnicas        INT;
  v_tecnicas_ativas       INT;
  v_tecnicas_sem_faixa    INT;
  v_total_faixas          INT;
  v_total_pat             INT;
  v_pat_ativas            INT;
  v_pat_produto_inativo   INT;
  v_pat_tabela_inativa    INT;
  v_produtos_ativos       INT;
  v_produtos_com_tecnica  INT;
  v_fn_options_ok         BOOLEAN := false;
  v_fn_price_ok           BOOLEAN := false;
  v_test_result           JSONB;
  v_test_area_id          UUID;
  v_test_product_id       UUID;
BEGIN
  SELECT COUNT(*) INTO v_total_tecnicas FROM tabela_preco_gravacao_oficial;
  SELECT COUNT(*) INTO v_tecnicas_ativas FROM tabela_preco_gravacao_oficial WHERE ativo=true;
  SELECT COUNT(*) INTO v_total_faixas FROM tabela_preco_gravacao_oficial_faixa;
  SELECT COUNT(*) INTO v_total_pat FROM print_area_techniques;
  SELECT COUNT(*) INTO v_pat_ativas FROM print_area_techniques WHERE is_active=true;
  SELECT COUNT(*) INTO v_produtos_ativos FROM products WHERE is_active=true;
  SELECT COUNT(*) INTO v_tecnicas_sem_faixa
    FROM tabela_preco_gravacao_oficial t WHERE t.ativo=true
    AND NOT EXISTS (SELECT 1 FROM tabela_preco_gravacao_oficial_faixa f WHERE f.tabela_preco_gravacao_id=t.id);
  SELECT COUNT(*) INTO v_pat_produto_inativo
    FROM print_area_techniques pat JOIN products p ON p.id=pat.product_id
    WHERE pat.is_active=true AND p.is_active=false;
  SELECT COUNT(*) INTO v_pat_tabela_inativa
    FROM print_area_techniques pat JOIN tabela_preco_gravacao_oficial t ON t.id=pat.tabela_preco_id
    WHERE pat.is_active=true AND t.ativo=false;
  SELECT COUNT(DISTINCT product_id) INTO v_produtos_com_tecnica
    FROM print_area_techniques WHERE is_active=true;

  -- Testar RPCs
  BEGIN
    SELECT pat.id, pat.product_id INTO v_test_area_id, v_test_product_id
    FROM print_area_techniques pat
    JOIN products p ON p.id=pat.product_id
    WHERE pat.is_active=true AND p.is_active=true LIMIT 1;
    IF v_test_product_id IS NOT NULL THEN
      SELECT fn_get_product_customization_options(v_test_product_id) INTO v_test_result;
      v_fn_options_ok := (v_test_result IS NOT NULL AND v_test_result ? 'product_id');
    END IF;
  EXCEPTION WHEN OTHERS THEN v_fn_options_ok := false; END;

  BEGIN
    SELECT fn_get_customization_price(v_test_area_id,100,1,NULL,NULL,0) INTO v_test_result;
    v_fn_price_ok := (v_test_result IS NOT NULL);
  EXCEPTION WHEN OTHERS THEN v_fn_price_ok := false; END;

  RETURN jsonb_build_object(
    'timestamp',    now(),
    'status_geral', CASE
      WHEN NOT v_fn_options_ok OR NOT v_fn_price_ok THEN 'CRITICO'
      WHEN v_pat_produto_inativo>0 OR v_pat_tabela_inativa>0 OR v_tecnicas_sem_faixa>0 THEN 'DEGRADADO'
      ELSE 'SAUDAVEL'
    END,
    'funcoes_rpc', jsonb_build_object(
      'fn_get_product_customization_options', v_fn_options_ok,
      'fn_get_customization_price', v_fn_price_ok
    ),
    'tecnicas', jsonb_build_object(
      'total', v_total_tecnicas, 'ativas', v_tecnicas_ativas,
      'sem_faixa_preco', v_tecnicas_sem_faixa
    ),
    'faixas', jsonb_build_object('total', v_total_faixas),
    'print_area_techniques', jsonb_build_object(
      'total', v_total_pat, 'ativas', v_pat_ativas,
      'alerta_produto_inativo', v_pat_produto_inativo,
      'alerta_tabela_inativa', v_pat_tabela_inativa
    ),
    'cobertura', jsonb_build_object(
      'produtos_ativos', v_produtos_ativos,
      'com_tecnica', v_produtos_com_tecnica,
      'sem_tecnica', v_produtos_ativos - v_produtos_com_tecnica,
      'pct_cobertura', ROUND(v_produtos_com_tecnica::numeric/NULLIF(v_produtos_ativos,0)*100,1)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_health_check_gravacao() TO authenticated;

SELECT fn_health_check_gravacao();
;
