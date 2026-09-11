
-- ============================================================
-- FIX: Variantes ativas com stock > 0 de produtos inativos
-- 2026-06-19 audit-10-10 — 53 variantes, 38 produtos, 3.127.982 phantom stock
-- ============================================================

-- Backup
CREATE TABLE IF NOT EXISTS public._bkp_orphan_active_variants_20260619 AS
SELECT pv.*
FROM product_variants pv
WHERE pv.is_active = true
  AND pv.stock_quantity > 0
  AND NOT EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = pv.product_id AND (p.is_active = true OR p.active = true)
  );

-- Fix
DO $$
DECLARE
  v_fixed  integer;
  v_remaining integer;
BEGIN
  PERFORM set_config('app.write_source', 'pipeline', true);
  PERFORM set_config('app.bulk_import_mode', 'true', true);
  PERFORM set_config('app.skip_stock_snapshot', 'true', true);

  UPDATE product_variants pv
  SET is_active = false, stock_quantity = 0, updated_at = NOW()
  WHERE pv.is_active = true
    AND pv.stock_quantity > 0
    AND NOT EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = pv.product_id AND (p.is_active = true OR p.active = true)
    );

  GET DIAGNOSTICS v_fixed = ROW_COUNT;

  SELECT COUNT(*) INTO v_remaining
  FROM product_variants pv
  WHERE pv.is_active = true AND pv.stock_quantity > 0
    AND NOT EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = pv.product_id AND (p.is_active = true OR p.active = true)
    );

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'POST-FIX: % orphan variants still active', v_remaining;
  END IF;

  RAISE NOTICE 'fix_orphan_active_variants: % variants fixed, 0 remaining', v_fixed;
END;
$$;
;
