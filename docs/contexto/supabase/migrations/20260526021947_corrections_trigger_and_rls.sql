DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid WHERE t.tgname = 'trg_log_price_change' AND c.relname = 'product_variants') THEN
    ALTER TABLE product_variants ENABLE TRIGGER trg_log_price_change;
  ELSE
    RAISE NOTICE 'trg_log_price_change não encontrado — ignorado';
  END IF;
END $$;
ALTER TABLE _asia_api_staging ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '_asia_api_staging' AND policyname = '_asia_staging_service_only') THEN
    CREATE POLICY "_asia_staging_service_only" ON _asia_api_staging AS RESTRICTIVE FOR ALL TO authenticated USING (false);
  END IF;
END $$;
