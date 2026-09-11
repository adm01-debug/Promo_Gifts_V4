-- Migration 067: Fix last unindexed FK + drop truly unused non-FK indexes

-- Phase 1: Fix collection_products.product_id (1 remaining unindexed FK)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_index     pi
    JOIN pg_attribute pa ON pa.attrelid = pi.indrelid AND pa.attnum = pi.indkey[0]
    JOIN pg_attribute ta ON ta.attrelid = pi.indrelid AND ta.attname = 'product_id'
    WHERE pi.indrelid = 'public.collection_products'::regclass
      AND pa.attnum = ta.attnum
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_collection_products_product_id
      ON public.collection_products (product_id);
    RAISE NOTICE '[067] Created idx_collection_products_product_id';
  ELSE
    RAISE NOTICE '[067] Phase 1: collection_products.product_id already indexed — skip';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[067] Phase 1: failed: %', SQLERRM;
END;
$$;

-- Phase 2: Drop truly unused non-FK indexes (FK-aware predicate)

DO $$
DECLARE
  r      RECORD;
  v_ok   int := 0;
  v_skip int := 0;
BEGIN
  FOR r IN
    SELECT
      psi.indexrelname AS index_name,
      psi.relname      AS table_name
    FROM pg_stat_user_indexes psi
    JOIN pg_index          pi  ON pi.indexrelid  = psi.indexrelid
    WHERE psi.schemaname = 'public'
      AND psi.idx_scan   = 0
      AND NOT pi.indisprimary
      AND NOT pi.indisunique
      AND NOT pi.indisexclusion
      AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint fc
        WHERE fc.contype   = 'f'
          AND fc.conrelid  = pi.indrelid
          AND fc.conkey[1] = pi.indkey[0]
      )
    ORDER BY psi.relname, psi.indexrelname
  LOOP
    BEGIN
      EXECUTE format('DROP INDEX IF EXISTS public.%I', r.index_name);
      v_ok := v_ok + 1;
      RAISE NOTICE '[067] Dropped truly-unused index: public.% (table=%)',
        r.index_name, r.table_name;
    EXCEPTION WHEN OTHERS THEN
      v_skip := v_skip + 1;
      RAISE WARNING '[067] Could not drop public.%: %', r.index_name, SQLERRM;
    END;
  END LOOP;

  IF v_ok = 0 AND v_skip = 0 THEN
    RAISE NOTICE '[067] Phase 2: No truly-unused non-FK indexes found — already clean';
  ELSE
    RAISE NOTICE '[067] Phase 2: dropped=%, failed=%', v_ok, v_skip;
  END IF;
END;
$$;

-- Phase 3: Validate

DO $$
DECLARE
  v_unindexed_fk   int;
  v_unused_nonfk   int;
  v_unused_fk      int;
BEGIN
  SELECT count(DISTINCT (c.conrelid, c.conkey[1]))
  INTO v_unindexed_fk
  FROM pg_constraint c
  JOIN pg_namespace n ON n.oid = (SELECT relnamespace FROM pg_class WHERE oid = c.conrelid)
  WHERE c.contype = 'f'
    AND n.nspname = 'public'
    AND NOT EXISTS (
      SELECT 1 FROM pg_index pi
      JOIN pg_attribute pa ON pa.attrelid = pi.indrelid AND pa.attnum = pi.indkey[0]
      WHERE pi.indrelid = c.conrelid AND pa.attnum = c.conkey[1]
    );

  SELECT count(*)
  INTO v_unused_nonfk
  FROM pg_stat_user_indexes psi
  JOIN pg_index pi ON pi.indexrelid = psi.indexrelid
  WHERE psi.schemaname = 'public'
    AND psi.idx_scan   = 0
    AND NOT pi.indisprimary
    AND NOT pi.indisunique
    AND NOT pi.indisexclusion
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint fc
      WHERE fc.contype = 'f' AND fc.conrelid = pi.indrelid AND fc.conkey[1] = pi.indkey[0]
    );

  SELECT count(*)
  INTO v_unused_fk
  FROM pg_stat_user_indexes psi
  JOIN pg_index pi ON pi.indexrelid = psi.indexrelid
  WHERE psi.schemaname = 'public'
    AND psi.idx_scan   = 0
    AND NOT pi.indisprimary
    AND NOT pi.indisunique
    AND NOT pi.indisexclusion
    AND EXISTS (
      SELECT 1 FROM pg_constraint fc
      WHERE fc.contype = 'f' AND fc.conrelid = pi.indrelid AND fc.conkey[1] = pi.indkey[0]
    );

  RAISE NOTICE '[067] Validation: unindexed_fk=%, unused_non_fk=%, fk_indexes_no_scan_yet=%',
    v_unindexed_fk, v_unused_nonfk, v_unused_fk;

  IF v_unindexed_fk = 0 THEN
    RAISE NOTICE '[067] unindexed_foreign_keys: CLEARED';
  ELSE
    RAISE WARNING '[067] % FK(s) still unindexed', v_unindexed_fk;
  END IF;

  IF v_unused_nonfk = 0 THEN
    RAISE NOTICE '[067] Non-FK unused_index: CLEARED';
  ELSE
    RAISE WARNING '[067] % non-FK unused index(es) remain', v_unused_nonfk;
  END IF;

  RAISE NOTICE 'Migration 067 complete.';
END;
$$;;
