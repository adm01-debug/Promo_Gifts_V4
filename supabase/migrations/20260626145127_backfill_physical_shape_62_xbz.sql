-- Backfill único dos 62 produtos XBZ com shape stale (satélite existente, shape NULL).
-- A projeção (products=fonte da verdade) preenche product_physical.shape_type.
-- Seguro: dry-run provou delta_linhas=0, internal_perda=0, outras_cols=0.
DO $$
DECLARE v_id uuid; v_ok int := 0; v_total int := 0;
BEGIN
  FOR v_id IN
    SELECT pp.product_id
    FROM product_physical pp JOIN products p ON p.id=pp.product_id
    WHERE pp.shape_type IS DISTINCT FROM COALESCE(p.shape_type, pp.shape_type)
  LOOP
    v_total := v_total + 1;
    IF fn_sync_product_physical_from_products(v_id) THEN v_ok := v_ok + 1; END IF;
  END LOOP;
  RAISE NOTICE 'Backfill shape: total=% sync_ok=%', v_total, v_ok;
END $$;;
