-- Migration 068: Create missing index on collection_products.product_id
-- (last remaining unindexed_foreign_keys finding)
--
-- collection_products has (collection_id, product_id) unique index but
-- product_id is the SECOND column — not a leading index for FK enforcement.
-- The FK collection_products_product_id_fkey1 needs a dedicated index.

CREATE INDEX IF NOT EXISTS idx_coll_products_product_id
  ON public.collection_products (product_id);

-- Validate
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT count(DISTINCT (c.conrelid, c.conkey[1]))
  INTO v_count
  FROM pg_constraint c
  JOIN pg_namespace n ON n.oid = (SELECT relnamespace FROM pg_class WHERE oid = c.conrelid)
  WHERE c.contype = 'f'
    AND n.nspname = 'public'
    AND NOT EXISTS (
      SELECT 1 FROM pg_index pi
      JOIN pg_attribute pa ON pa.attrelid = pi.indrelid AND pa.attnum = pi.indkey[0]
      WHERE pi.indrelid = c.conrelid AND pa.attnum = c.conkey[1]
    );

  IF v_count = 0 THEN
    RAISE NOTICE '[068] unindexed_foreign_keys: CLEARED (0 remaining)';
  ELSE
    RAISE WARNING '[068] % FK(s) still unindexed after migration', v_count;
  END IF;

  RAISE NOTICE 'Migration 068 complete.';
END;
$$;;
