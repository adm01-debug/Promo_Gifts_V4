-- Migration 032: Revoke anon SELECT from tables/views where anon has zero legitimate access
DO $$
DECLARE
  obj text;
  admin_views text[] := ARRAY[
    'vw_packaging_health',
    'vw_packaging_suppliers',
    'vw_thermal_products'
  ];
  zero_row_tables text[] := ARRAY[
    'kit_component_padronizacao',
    'kit_component_variant_skus',
    'kit_variants'
  ];
BEGIN
  FOREACH obj IN ARRAY admin_views LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = obj
        AND c.relkind IN ('v', 'm')
    ) THEN
      EXECUTE format('REVOKE SELECT ON public.%I FROM anon', obj);
      RAISE NOTICE '✓ [admin-view] REVOKE SELECT ON public.% FROM anon', obj;
    ELSE
      RAISE NOTICE '- public.% not found — skipping', obj;
    END IF;
  END LOOP;

  FOREACH obj IN ARRAY zero_row_tables LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = obj
        AND c.relkind IN ('r', 'p')
    ) THEN
      EXECUTE format('REVOKE SELECT ON public.%I FROM anon', obj);
      RAISE NOTICE '✓ [zero-row-rls] REVOKE SELECT ON public.% FROM anon', obj;
    ELSE
      RAISE NOTICE '- public.% not found — skipping', obj;
    END IF;
  END LOOP;

  RAISE NOTICE 'Done: anon SELECT revoked from admin views + zero-row-RLS tables.';
END;
$$;

DO $$
DECLARE
  obj text;
  still_exposed text[] := ARRAY[]::text[];
  sample text[] := ARRAY[
    'vw_packaging_health', 'vw_packaging_suppliers', 'vw_thermal_products',
    'kit_component_padronizacao', 'kit_component_variant_skus', 'kit_variants'
  ];
  has_select boolean;
BEGIN
  FOREACH obj IN ARRAY sample LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND table_name = obj
        AND grantee = 'anon'
        AND privilege_type = 'SELECT'
    ) INTO has_select;
    IF has_select THEN
      still_exposed := still_exposed || obj;
    END IF;
  END LOOP;

  IF array_length(still_exposed, 1) > 0 THEN
    RAISE WARNING 'anon SELECT still present on: %', array_to_string(still_exposed, ', ');
  ELSE
    RAISE NOTICE '✓ Validation OK: all 6 targets no longer expose SELECT to anon';
  END IF;

  RAISE NOTICE 'Migration 032 complete.';
END;
$$;;
