-- Migration 052: Dynamic index creation for unindexed foreign-key columns
--
-- Findings addressed: unindexed_foreign_keys (performance lint)

-- ═══════════════════════════════════════════════════════════════════════════════
-- Phase 1: Create missing FK indexes for public schema
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  r              RECORD;
  v_index_name   text;
  v_col_list     text;
  v_ok           int := 0;
  v_already      int := 0;
  v_fail         int := 0;
BEGIN
  FOR r IN
    WITH fk_cols AS (
      SELECT
        c.conname                                  AS constraint_name,
        tc.relname                                 AS table_name,
        array_agg(a.attname ORDER BY col_ord.ord)  AS col_names,
        array_length(c.conkey, 1)                  AS col_count
      FROM pg_constraint c
      JOIN pg_class tc  ON tc.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = tc.relnamespace
      JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS col_ord(attnum, ord) ON true
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = col_ord.attnum
      WHERE n.nspname = 'public'
        AND c.contype = 'f'
        AND tc.relkind = 'r'
      GROUP BY c.conname, tc.relname, c.conrelid, c.conkey, array_length(c.conkey, 1)
    ),
    unindexed AS (
      SELECT fk.constraint_name, fk.table_name, fk.col_names, fk.col_count
      FROM fk_cols fk
      WHERE NOT EXISTS (
        SELECT 1
        FROM pg_index i
        JOIN pg_class ic ON ic.oid = i.indexrelid
        JOIN pg_class tc2 ON tc2.oid = i.indrelid
        JOIN pg_namespace n2 ON n2.oid = tc2.relnamespace
        WHERE n2.nspname = 'public'
          AND tc2.relname = fk.table_name
          AND (
            SELECT array_agg(a2.attname ORDER BY kord.ord)
            FROM LATERAL unnest(i.indkey) WITH ORDINALITY AS kord(attnum, ord)
            JOIN pg_attribute a2 ON a2.attrelid = i.indrelid
              AND a2.attnum = kord.attnum
              AND kord.attnum > 0
            WHERE kord.ord <= fk.col_count
          ) = fk.col_names
      )
    )
    SELECT
      u.table_name,
      u.col_names,
      u.col_count,
      u.constraint_name,
      left(
        'idx_' || u.table_name || '_' || array_to_string(u.col_names, '_'),
        63
      ) AS index_name,
      array_to_string(
        array(SELECT quote_ident(c) FROM unnest(u.col_names) AS c),
        ', '
      ) AS col_list_quoted
    FROM unindexed u
    ORDER BY u.table_name, u.col_names
  LOOP
    BEGIN
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON public.%I (%s)',
        r.index_name, r.table_name, r.col_list_quoted
      );
      v_ok := v_ok + 1;
      RAISE NOTICE '✓ [052] Created index % on %.(%s) — FK: %',
        r.index_name, r.table_name, r.col_list_quoted, r.constraint_name;
    EXCEPTION WHEN OTHERS THEN
      v_fail := v_fail + 1;
      RAISE WARNING '[052] ✗ Could not create index % on %.(%s): %',
        r.index_name, r.table_name, r.col_list_quoted, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '[052] FK index sweep: created=%, failed=%', v_ok, v_fail;

  IF v_fail > 0 THEN
    RAISE WARNING '[052] % index creation(s) failed — check warnings above', v_fail;
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Phase 2: Validate
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_unindexed int;
  r           RECORD;
BEGIN
  SELECT count(*) INTO v_unindexed
  FROM (
    WITH fk_cols AS (
      SELECT
        c.conname                                  AS constraint_name,
        tc.relname                                 AS table_name,
        array_agg(a.attname ORDER BY col_ord.ord)  AS col_names,
        array_length(c.conkey, 1)                  AS col_count,
        c.conrelid
      FROM pg_constraint c
      JOIN pg_class tc  ON tc.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = tc.relnamespace
      JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS col_ord(attnum, ord) ON true
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = col_ord.attnum
      WHERE n.nspname = 'public'
        AND c.contype = 'f'
        AND tc.relkind = 'r'
      GROUP BY c.conname, tc.relname, c.conrelid, c.conkey, array_length(c.conkey, 1)
    )
    SELECT fk.table_name, fk.col_names, fk.constraint_name
    FROM fk_cols fk
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_index i
      JOIN pg_class tc2 ON tc2.oid = i.indrelid
      JOIN pg_namespace n2 ON n2.oid = tc2.relnamespace
      WHERE n2.nspname = 'public'
        AND tc2.relname = fk.table_name
        AND (
          SELECT array_agg(a2.attname ORDER BY kord.ord)
          FROM LATERAL unnest(i.indkey) WITH ORDINALITY AS kord(attnum, ord)
          JOIN pg_attribute a2 ON a2.attrelid = i.indrelid
            AND a2.attnum = kord.attnum
            AND kord.attnum > 0
          WHERE kord.ord <= fk.col_count
        ) = fk.col_names
    )
  ) sub;

  IF v_unindexed = 0 THEN
    RAISE NOTICE '✓ [052] All FK columns in public schema are indexed — unindexed_foreign_keys cleared';
  ELSE
    RAISE WARNING '[052] % FK column group(s) still unindexed — investigate', v_unindexed;

    FOR r IN
      WITH fk_cols AS (
        SELECT
          c.conname                                  AS constraint_name,
          tc.relname                                 AS table_name,
          array_agg(a.attname ORDER BY col_ord.ord)  AS col_names,
          array_length(c.conkey, 1)                  AS col_count
        FROM pg_constraint c
        JOIN pg_class tc  ON tc.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = tc.relnamespace
        JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS col_ord(attnum, ord) ON true
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = col_ord.attnum
        WHERE n.nspname = 'public'
          AND c.contype = 'f'
          AND tc.relkind = 'r'
        GROUP BY c.conname, tc.relname, c.conrelid, c.conkey, array_length(c.conkey, 1)
      )
      SELECT fk.table_name, fk.col_names, fk.constraint_name
      FROM fk_cols fk
      WHERE NOT EXISTS (
        SELECT 1
        FROM pg_index i
        JOIN pg_class tc2 ON tc2.oid = i.indrelid
        JOIN pg_namespace n2 ON n2.oid = tc2.relnamespace
        WHERE n2.nspname = 'public'
          AND tc2.relname = fk.table_name
          AND (
            SELECT array_agg(a2.attname ORDER BY kord.ord)
            FROM LATERAL unnest(i.indkey) WITH ORDINALITY AS kord(attnum, ord)
            JOIN pg_attribute a2 ON a2.attrelid = i.indrelid
              AND a2.attnum = kord.attnum
              AND kord.attnum > 0
            WHERE kord.ord <= fk.col_count
          ) = fk.col_names
      )
      ORDER BY fk.table_name
    LOOP
      RAISE WARNING '[052] Still unindexed: %.% FK: %',
        r.table_name, array_to_string(r.col_names, ','), r.constraint_name;
    END LOOP;
  END IF;

  RAISE NOTICE 'Migration 052 complete — unindexed_foreign_keys should clear on next advisor run.';
END;
$$;;
