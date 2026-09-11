-- ============================================================
-- RE-SYNC product_physical: eliminar os 6 drifts residuais
-- acumulados desde o re-sync de 2026-06-26.
-- CAUSA-RAIZ (documentada, NÃO corrigida aqui — requer PR):
--   fn_sync_product_physical_from_products usa
--   ON CONFLICT DO UPDATE SET x = COALESCE(EXCLUDED.x, product_physical.x)
--   Quando products.x vai para NULL/0, o espelho MANTÉM o valor antigo
--   porque COALESCE(NULL, antigo) = antigo.
-- CONSEQUÊNCIA: drift recorrente toda vez que o pipeline limpa um campo.
-- AÇÃO CORRETIVA AQUI: DELETE das linhas divergentes + re-sync puro
--   (sem COALESCE com valor antigo, a inserção é limpa).
-- RECOMENDAÇÃO PARA PR: mudar a semântica para overwrite
--   ou adicionar cron de re-sync semanal.
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

  IF v_ids IS NULL THEN
    RAISE NOTICE 'Nenhum drift encontrado — produto_physical já consistente.';
    RETURN;
  END IF;

  RAISE NOTICE 'Re-sincronizando % linhas divergentes...', array_length(v_ids,1);
  DELETE FROM product_physical WHERE product_id = ANY(v_ids);

  FOREACH r IN ARRAY v_ids LOOP
    PERFORM fn_sync_product_physical_from_products(r);
  END LOOP;
  RAISE NOTICE 'Re-sync concluído.';
END $$;;
