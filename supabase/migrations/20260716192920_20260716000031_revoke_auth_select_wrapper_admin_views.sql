-- Migration 031: Revoke authenticated SELECT from admin wrapper views missed in 029
DO $$
DECLARE
  obj text;
  missed_admin_views text[] := ARRAY[
    'mv_material_group_stats',
    'mv_media_health'
  ];
BEGIN
  FOREACH obj IN ARRAY missed_admin_views LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = obj
        AND c.relkind IN ('v', 'm')
    ) THEN
      EXECUTE format('REVOKE SELECT ON public.%I FROM authenticated', obj);
      RAISE NOTICE '✓ REVOKE SELECT ON public.% FROM authenticated (relkind=v/m)', obj;
    ELSE
      RAISE NOTICE '- public.% not found (view/mv) — skipping', obj;
    END IF;
  END LOOP;

  RAISE NOTICE 'Done: authenticated SELECT revoked from missed admin wrapper views.';
END;
$$;

DO $$
DECLARE
  obj text;
  still_exposed text[] := ARRAY[]::text[];
  sample text[] := ARRAY[
    'mv_material_group_stats',
    'mv_media_health'
  ];
  has_select boolean;
BEGIN
  FOREACH obj IN ARRAY sample LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND table_name = obj
        AND grantee = 'authenticated'
        AND privilege_type = 'SELECT'
    ) INTO has_select;
    IF has_select THEN
      still_exposed := still_exposed || obj;
    END IF;
  END LOOP;

  IF array_length(still_exposed, 1) > 0 THEN
    RAISE WARNING 'authenticated SELECT still present on: %', array_to_string(still_exposed, ', ');
  ELSE
    RAISE NOTICE '✓ Validation OK: mv_material_group_stats and mv_media_health no longer expose SELECT to authenticated';
  END IF;

  RAISE NOTICE 'Migration 031 complete.';
END;
$$;;
