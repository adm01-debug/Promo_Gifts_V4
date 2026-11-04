DO $$
DECLARE
  tbl RECORD;
  pol_exists BOOLEAN;
BEGIN
  FOR tbl IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' AND NOT rowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.tablename);
    SELECT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=tbl.tablename AND policyname='auth_read_' || tbl.tablename) INTO pol_exists;
    IF NOT pol_exists THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', 'auth_read_' || tbl.tablename, tbl.tablename);
    END IF;
  END LOOP;
END $$;
