-- Migration 065: Drop unused indexes (performance — unused_index)
-- Phase 1: Drop unused non-constraint indexes in public schema

DO $$
DECLARE
  r      RECORD;
  v_ok   int := 0;
  v_skip int := 0;
BEGIN
  FOR r IN
    SELECT
      psi.indexrelname  AS index_name,
      psi.relname       AS table_name,
      psi.idx_scan
    FROM pg_stat_user_indexes psi
    JOIN pg_index          pi  ON pi.indexrelid  = psi.indexrelid
    JOIN pg_class          ic  ON ic.oid          = psi.indexrelid
    JOIN pg_namespace      n   ON n.oid           = ic.relnamespace
    WHERE psi.schemaname = 'public'
      AND psi.idx_scan   = 0
      AND NOT pi.indisprimary
      AND NOT pi.indisunique
      AND NOT pi.indisexclusion
    ORDER BY psi.relname, psi.indexrelname
  LOOP
    BEGIN
      EXECUTE format('DROP INDEX IF EXISTS public.%I', r.index_name);
      v_ok := v_ok + 1;
      RAISE NOTICE '[065] Dropped index: public.% (table=%, scans=%)',
        r.index_name, r.table_name, r.idx_scan;
    EXCEPTION WHEN OTHERS THEN
      v_skip := v_skip + 1;
      RAISE WARNING '[065] Could not drop public.%: %', r.index_name, SQLERRM;
    END;
  END LOOP;

  IF v_ok = 0 AND v_skip = 0 THEN
    RAISE NOTICE '[065] Phase 1: No unused non-constraint indexes found — already clean';
  ELSE
    RAISE NOTICE '[065] Phase 1: dropped=%, failed=%', v_ok, v_skip;
  END IF;
END;
$$;

-- Phase 2: Same sweep for analytics schema (if exists)

DO $$
DECLARE
  r      RECORD;
  v_ok   int := 0;
  v_skip int := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'analytics') THEN
    RAISE NOTICE '[065] Phase 2: analytics schema does not exist — skipping';
    RETURN;
  END IF;

  FOR r IN
    SELECT
      psi.indexrelname  AS index_name,
      psi.relname       AS table_name,
      psi.idx_scan
    FROM pg_stat_user_indexes psi
    JOIN pg_index          pi  ON pi.indexrelid  = psi.indexrelid
    JOIN pg_class          ic  ON ic.oid          = psi.indexrelid
    JOIN pg_namespace      n   ON n.oid           = ic.relnamespace
    WHERE psi.schemaname = 'analytics'
      AND psi.idx_scan   = 0
      AND NOT pi.indisprimary
      AND NOT pi.indisunique
      AND NOT pi.indisexclusion
    ORDER BY psi.relname, psi.indexrelname
  LOOP
    BEGIN
      EXECUTE format('DROP INDEX IF EXISTS analytics.%I', r.index_name);
      v_ok := v_ok + 1;
      RAISE NOTICE '[065] Dropped index: analytics.% (table=%)', r.index_name, r.table_name;
    EXCEPTION WHEN OTHERS THEN
      v_skip := v_skip + 1;
      RAISE WARNING '[065] Could not drop analytics.%: %', r.index_name, SQLERRM;
    END;
  END LOOP;

  IF v_ok = 0 AND v_skip = 0 THEN
    RAISE NOTICE '[065] Phase 2: No unused analytics indexes found — already clean';
  ELSE
    RAISE NOTICE '[065] Phase 2: dropped=%, failed=%', v_ok, v_skip;
  END IF;
END;
$$;

-- Phase 3: Validate

DO $$
DECLARE
  v_remaining_public    int;
  v_remaining_analytics int;
  r                     RECORD;
BEGIN
  SELECT count(*) INTO v_remaining_public
  FROM pg_stat_user_indexes psi
  JOIN pg_index pi ON pi.indexrelid = psi.indexrelid
  WHERE psi.schemaname = 'public'
    AND psi.idx_scan   = 0
    AND NOT pi.indisprimary
    AND NOT pi.indisunique
    AND NOT pi.indisexclusion;

  SELECT count(*) INTO v_remaining_analytics
  FROM pg_stat_user_indexes psi
  JOIN pg_index pi ON pi.indexrelid = psi.indexrelid
  WHERE psi.schemaname = 'analytics'
    AND psi.idx_scan   = 0
    AND NOT pi.indisprimary
    AND NOT pi.indisunique
    AND NOT pi.indisexclusion;

  RAISE NOTICE '[065] Validation: remaining unused public=%, analytics=%',
    v_remaining_public, v_remaining_analytics;

  IF v_remaining_public = 0 THEN
    RAISE NOTICE '[065] public schema: unused_index CLEARED';
  ELSE
    RAISE WARNING '[065] % unused index(es) remain in public (check warnings above)', v_remaining_public;
    FOR r IN
      SELECT psi.indexrelname, psi.relname
      FROM pg_stat_user_indexes psi
      JOIN pg_index pi ON pi.indexrelid = psi.indexrelid
      WHERE psi.schemaname = 'public'
        AND psi.idx_scan   = 0
        AND NOT pi.indisprimary
        AND NOT pi.indisunique
        AND NOT pi.indisexclusion
      ORDER BY psi.relname, psi.indexrelname
    LOOP
      RAISE WARNING '[065]   still present: public.% (table=%)', r.indexrelname, r.relname;
    END LOOP;
  END IF;

  RAISE NOTICE 'Migration 065 complete — unused_index should clear on next advisor run.';
END;
$$;;
