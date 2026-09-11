-- ============================================================
-- MELHORIA 5: Zerar o drift residual de product_physical (espelho de products)
-- Causa: fn_sync usa COALESCE(EXCLUDED.x, antigo) — quando products.x vira
-- NULL/0, o espelho mantinha o valor velho. 357 produtos divergiam.
-- Correção fiel: DELETE das linhas divergentes + re-sync (re-insere puro,
-- sem merge com valor antigo; produtos sem dims ficam corretamente sem espelho).
-- product_physical não tem FKs entrando nem consumidores no código → seguro.
-- NÃO altera a semântica da fn_sync (decisão de design → futura PR).
-- ============================================================
DO $$
DECLARE
  v_ids uuid[];
  r uuid;
BEGIN
  SELECT array_agg(pf.product_id) INTO v_ids
  FROM product_physical pf JOIN products p ON p.id = pf.product_id
  WHERE pf.weight_g       IS DISTINCT FROM NULLIF(p.weight_g,0)
     OR pf.height_cm      IS DISTINCT FROM NULLIF(p.height_cm,0)
     OR pf.width_cm       IS DISTINCT FROM NULLIF(p.width_cm,0)
     OR pf.length_cm      IS DISTINCT FROM NULLIF(p.length_cm,0)
     OR pf.diameter_cm    IS DISTINCT FROM NULLIF(p.diameter_cm,0)
     OR pf.capacity_ml    IS DISTINCT FROM NULLIF(p.capacity_ml,0)
     OR pf.box_volume_cm3 IS DISTINCT FROM NULLIF(p.box_volume_cm3,0)
     OR pf.box_quantity   IS DISTINCT FROM p.box_quantity;

  IF v_ids IS NULL THEN RETURN; END IF;

  DELETE FROM product_physical WHERE product_id = ANY(v_ids);

  FOREACH r IN ARRAY v_ids LOOP
    PERFORM fn_sync_product_physical_from_products(r);
  END LOOP;
END $$;;
