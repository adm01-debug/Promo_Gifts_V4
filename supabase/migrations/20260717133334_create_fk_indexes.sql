-- Migration 066: Create missing FK indexes (performance — unindexed_foreign_keys)

-- Phase 1: Create missing FK indexes in public schema

DO $$
DECLARE
  r         RECORD;
  v_idx     text;
  v_ok      int := 0;
  v_skip    int := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT
      n.nspname                        AS schema_name,
      t.relname                        AS table_name,
      a.attname                        AS col_name
    FROM pg_constraint c
    JOIN pg_class     t  ON t.oid = c.conrelid
    JOIN pg_namespace n  ON n.oid = t.relnamespace
    JOIN pg_attribute a  ON a.attrelid = c.conrelid
                        AND a.attnum   = c.conkey[1]
    WHERE c.contype = 'f'
      AND n.nspname = 'public'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_index     pi
        JOIN pg_attribute pa ON pa.attrelid = pi.indrelid
                            AND pa.attnum   = pi.indkey[0]
        WHERE pi.indrelid = c.conrelid
          AND pa.attnum   = c.conkey[1]
      )
    ORDER BY t.relname, a.attname
  LOOP
    v_idx := left(format('idx_%s_%s', r.table_name, r.col_name), 63);

    BEGIN
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)',
        v_idx, r.table_name, r.col_name
      );
      v_ok := v_ok + 1;
      RAISE NOTICE '[066] Created index % ON public.%(%)',
        v_idx, r.table_name, r.col_name;
    EXCEPTION WHEN OTHERS THEN
      v_skip := v_skip + 1;
      RAISE WARNING '[066] Could not create index % ON public.%(%): %',
        v_idx, r.table_name, r.col_name, SQLERRM;
    END;
  END LOOP;

  IF v_ok = 0 AND v_skip = 0 THEN
    RAISE NOTICE '[066] Phase 1: No unindexed FK columns found — already clean';
  ELSE
    RAISE NOTICE '[066] Phase 1: created=%, failed=%', v_ok, v_skip;
  END IF;
END;
$$;

-- Phase 2: Validate

DO $$
DECLARE
  v_remaining int;
  r           RECORD;
BEGIN
  SELECT count(DISTINCT (c.conrelid, c.conkey[1]))
  INTO v_remaining
  FROM pg_constraint c
  JOIN pg_class     t  ON t.oid = c.conrelid
  JOIN pg_namespace n  ON n.oid = t.relnamespace
  WHERE c.contype = 'f'
    AND n.nspname = 'public'
    AND NOT EXISTS (
      SELECT 1
      FROM pg_index     pi
      JOIN pg_attribute pa ON pa.attrelid = pi.indrelid
                          AND pa.attnum   = pi.indkey[0]
      WHERE pi.indrelid = c.conrelid
        AND pa.attnum   = c.conkey[1]
    );

  IF v_remaining = 0 THEN
    RAISE NOTICE '[066] All public FK columns indexed — unindexed_foreign_keys CLEARED';
  ELSE
    RAISE WARNING '[066] % FK column(s) still unindexed', v_remaining;
    FOR r IN
      SELECT DISTINCT t.relname AS table_name, a.attname AS col_name
      FROM pg_constraint c
      JOIN pg_class     t  ON t.oid = c.conrelid
      JOIN pg_namespace n  ON n.oid = t.relnamespace
      JOIN pg_attribute a  ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
      WHERE c.contype = 'f'
        AND n.nspname = 'public'
        AND NOT EXISTS (
          SELECT 1
          FROM pg_index     pi
          JOIN pg_attribute pa ON pa.attrelid = pi.indrelid AND pa.attnum = pi.indkey[0]
          WHERE pi.indrelid = c.conrelid AND pa.attnum = c.conkey[1]
        )
      ORDER BY t.relname, a.attname
    LOOP
      RAISE WARNING '[066]   still unindexed: public.%(%)', r.table_name, r.col_name;
    END LOOP;
  END IF;

  RAISE NOTICE 'Migration 066 complete.';
END;
$$;;
