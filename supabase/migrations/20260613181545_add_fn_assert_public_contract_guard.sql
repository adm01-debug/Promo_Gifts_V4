
-- Guarda permanente do contrato público Gold↔front (somente-leitura, additiva, idempotente).
-- Re-executável a qualquer momento; ideal para smoke test / cron de saúde.
CREATE OR REPLACE FUNCTION public.fn_assert_public_contract()
RETURNS TABLE(check_name text, status text, detail text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, analytics
AS $$
  WITH base AS (
    SELECT
      (SELECT count(*) FROM products WHERE is_active AND is_deleted IS NOT TRUE)                                   AS prod_visible,
      (SELECT count(*) FROM v_products_public)                                                                     AS vpp,
      (SELECT count(*) FROM mv_product_cards)                                                                      AS cards,
      (SELECT count(*) FROM v_products_public WHERE cost_price IS NOT NULL)                                        AS cost_leak,
      (SELECT count(*) FROM v_products_public WHERE suggested_price IS NOT NULL)                                   AS sugg_leak,
      (SELECT count(*) FROM products p WHERE p.is_active AND p.is_deleted IS NOT TRUE
         AND NOT EXISTS (SELECT 1 FROM v_products_min_price m WHERE m.product_id=p.id))                            AS no_minprice,
      (SELECT count(*) FROM product_variants pv WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id=pv.product_id)) AS orphan_var,
      (SELECT count(*) FROM product_images pi WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id=pi.product_id))   AS orphan_img,
      (SELECT count(*) FROM pg_matviews WHERE schemaname='analytics' AND NOT ispopulated)                          AS mv_unpop,
      has_column_privilege('anon','public.products','cost_price','SELECT')                                         AS anon_cost,
      has_table_privilege('anon','public.v_products_public','SELECT')                                              AS anon_vpp
  )
  SELECT 'P0_cost_price_nao_vaza',        CASE WHEN cost_leak=0 THEN 'PASS' ELSE 'FAIL' END, 'linhas_com_custo='||cost_leak FROM base
  UNION ALL SELECT 'P0_suggested_nao_vaza', CASE WHEN sugg_leak=0 THEN 'PASS' ELSE 'FAIL' END, 'linhas='||sugg_leak FROM base
  UNION ALL SELECT 'paridade_vpp_vs_ativos', CASE WHEN vpp=prod_visible THEN 'PASS' ELSE 'FAIL' END, vpp||' vs '||prod_visible FROM base
  UNION ALL SELECT 'paridade_cards_vs_vpp',  CASE WHEN cards=vpp THEN 'PASS' ELSE 'WARN' END, cards||' vs '||vpp||' (cards=matview refresh horario, ate ~1h)' FROM base
  UNION ALL SELECT 'todo_visivel_tem_preco',  CASE WHEN no_minprice=0 THEN 'PASS' ELSE 'WARN' END, 'sem_preco='||no_minprice FROM base
  UNION ALL SELECT 'zero_variantes_orfas',    CASE WHEN orphan_var=0 THEN 'PASS' ELSE 'FAIL' END, 'orfas='||orphan_var FROM base
  UNION ALL SELECT 'zero_imagens_orfas',      CASE WHEN orphan_img=0 THEN 'PASS' ELSE 'FAIL' END, 'orfas='||orphan_img FROM base
  UNION ALL SELECT 'matviews_populadas',      CASE WHEN mv_unpop=0 THEN 'PASS' ELSE 'FAIL' END, 'nao_populadas='||mv_unpop FROM base
  UNION ALL SELECT 'anon_SEM_grant_custo',    CASE WHEN anon_cost=false THEN 'PASS' ELSE 'FAIL' END, 'anon_grant_cost='||anon_cost FROM base
  UNION ALL SELECT 'anon_LE_view_publica',    CASE WHEN anon_vpp THEN 'PASS' ELSE 'FAIL' END, 'anon_grant_vpp='||anon_vpp FROM base;
$$;

REVOKE ALL ON FUNCTION public.fn_assert_public_contract() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_assert_public_contract() TO service_role;
COMMENT ON FUNCTION public.fn_assert_public_contract() IS
  'Guarda do contrato público Gold↔front (somente-leitura). Re-execute para validar: 0 vazamento de custo, paridade products↔v_products_public↔mv_product_cards, todo produto visível com preço, 0 órfãos, matviews populadas, anon sem grant de custo. Criada na auditoria 2026-06-13.';
;
