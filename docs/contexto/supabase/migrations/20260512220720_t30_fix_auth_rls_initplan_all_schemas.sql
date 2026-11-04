-- T30: Fix all remaining auth_rls_initplan violations across all schemas
-- Replaces alias form ( SELECT auth.uid() AS uid) and bare auth.uid()
-- with canonical (SELECT auth.uid()) — evaluated once per query, not per row.
DO $$
DECLARE
  rec  RECORD;
  nq   TEXT;
  nc   TEXT;
  stmt TEXT;
  cnt  INT := 0;
BEGIN
  FOR rec IN
    SELECT schemaname, tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE (
        (qual IS NOT NULL
          AND qual ILIKE '%auth.uid()%'
          AND qual NOT ILIKE '%(SELECT auth.uid())%')
      OR
        (with_check IS NOT NULL
          AND with_check ILIKE '%auth.uid()%'
          AND with_check NOT ILIKE '%(SELECT auth.uid())%')
    )
    AND schemaname NOT IN ('pg_catalog','information_schema')
    ORDER BY schemaname, tablename, policyname
  LOOP
    -- Fix USING clause
    IF rec.qual IS NOT NULL
       AND rec.qual ILIKE '%auth.uid()%'
       AND rec.qual NOT ILIKE '%(SELECT auth.uid())%'
    THEN
      nq := rec.qual;
      nq := replace(nq, '(SELECT auth.uid())',         '__AUID__');
      nq := replace(nq, '( SELECT auth.uid() AS uid)', '__AUID__');
      nq := replace(nq, 'auth.uid()',                  '(SELECT auth.uid())');
      nq := replace(nq, '__AUID__',                    '(SELECT auth.uid())');
    ELSE
      nq := NULL;
    END IF;

    -- Fix WITH CHECK clause
    IF rec.with_check IS NOT NULL
       AND rec.with_check ILIKE '%auth.uid()%'
       AND rec.with_check NOT ILIKE '%(SELECT auth.uid())%'
    THEN
      nc := rec.with_check;
      nc := replace(nc, '(SELECT auth.uid())',         '__AUID__');
      nc := replace(nc, '( SELECT auth.uid() AS uid)', '__AUID__');
      nc := replace(nc, 'auth.uid()',                  '(SELECT auth.uid())');
      nc := replace(nc, '__AUID__',                    '(SELECT auth.uid())');
    ELSE
      nc := NULL;
    END IF;

    -- Build ALTER POLICY statement
    stmt := format('ALTER POLICY %I ON %I.%I', rec.policyname, rec.schemaname, rec.tablename);
    IF nq IS NOT NULL THEN
      stmt := stmt || ' USING (' || nq || ')';
    END IF;
    IF nc IS NOT NULL THEN
      stmt := stmt || ' WITH CHECK (' || nc || ')';
    END IF;

    EXECUTE stmt;
    cnt := cnt + 1;
  END LOOP;

  RAISE NOTICE 'T30: Fixed % auth_rls_initplan violations', cnt;
END $$;
