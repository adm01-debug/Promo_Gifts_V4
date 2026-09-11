-- Migration: Revoke anon access from backup tables and analytics schema

-- ─── Part A: Backup / archive / QA tables ────────────────────────────────────
DO $$
DECLARE
  tbl text;
  backup_tables text[] := ARRAY[
    '_archive_product_ai_20260626',
    '_archive_product_seo_20260626',
    '_archive_supplier_price_tiers_20260626',
    '_bkp_kcvs_pre_normalize_20260624',
    '_bkp_kit_color_from_name_20260624',
    '_bkp_kit_packing_type_20260624',
    '_bkp_kit_pkg_material_20260624',
    '_qa_pct_results',
    'backup_produto_ramo_atividade_20260625'
  ];
BEGIN
  FOREACH tbl IN ARRAY backup_tables LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = tbl
    ) THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', tbl);
      EXECUTE format('REVOKE ALL ON public.%I FROM authenticated', tbl);
      RAISE NOTICE 'REVOKE ALL on public.% (anon + authenticated)', tbl;
    ELSE
      RAISE NOTICE 'table public.% not found — skipping', tbl;
    END IF;
  END LOOP;
END;
$$;

-- ─── Part B: analytics schema — revoke anon schema-level access ───────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.schemata
    WHERE schema_name = 'analytics'
  ) THEN
    REVOKE USAGE ON SCHEMA analytics FROM anon;
    RAISE NOTICE 'REVOKE USAGE ON SCHEMA analytics FROM anon';
  ELSE
    RAISE NOTICE 'schema analytics not found — skipping';
  END IF;
END;
$$;

-- ─── Validate ─────────────────────────────────────────────────────────────────
DO $$
DECLARE
  has_anon_usage boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.role_usage_grants
    WHERE object_schema = 'analytics'
      AND object_name = 'analytics'
      AND grantee = 'anon'
      AND privilege_type = 'USAGE'
  ) INTO has_anon_usage;

  IF has_anon_usage THEN
    RAISE WARNING 'anon still has USAGE on analytics schema — check if schema exists';
  ELSE
    RAISE NOTICE 'anon no longer has USAGE on analytics schema (or schema absent)';
  END IF;
END;
$$;;
