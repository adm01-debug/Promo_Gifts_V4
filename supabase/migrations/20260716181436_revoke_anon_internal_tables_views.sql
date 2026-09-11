DO $$
DECLARE
  obj text;

  log_tables text[] := ARRAY[
    'eco_backfill_log_20260625',
    'eco_date_reconcile_log_20260626',
    'material_reconcile_log_20260626',
    'cnpj_backfill_audit'
  ];

  queue_tables text[] := ARRAY[
    'asia_image_import_queue',
    'mockup_generation_jobs',
    'optimization_queue_runs'
  ];

  staging_tables text[] := ARRAY[
    'ingestion_run_log',
    'kit_component_enrichment_raw',
    'kit_component_ficha_staging',
    'kit_ficha_session_log',
    'supplier_import_batches',
    'supplier_products_raw_history_p2026_06',
    'supplier_products_raw_history_p2026_07',
    'supplier_products_raw_history_p2026_08',
    'supplier_products_raw_history_p2026_09',
    'supplier_products_raw_history_p2026_10',
    'supplier_customization_options_raw'
  ];

  pipeline_tables text[] := ARRAY[
    'pipeline_health_log',
    'pipeline_run_log',
    'qa_image_coverage_log',
    'schema_signature_drift_log',
    'spot_health_log',
    'ops_grant_audit'
  ];

  config_tables text[] := ARRAY[
    'category_copywriting_config',
    'eco_material_config',
    'feminine_color_config',
    'packaging_compatibility_config',
    'mockup_prompt_configs'
  ];

  admin_tables text[] := ARRAY[
    'markup_configurations',
    'system_changelog',
    'system_documentation',
    'dashboard_insights_cache',
    'conversation_delivery_status',
    'role_migration_batches',
    'role_migration_items'
  ];

  monitoring_views text[] := ARRAY[
    'v_audit_paradoxos_gravacao',
    'v_blurhash_coverage',
    'v_blurhash_summary',
    'v_color_coverage_monitor',
    'v_connection_health',
    'v_crm_callback_health',
    'v_db_health_check',
    'v_dimensions_source_divergence',
    'v_enrichment_stats',
    'v_gravacao_cobertura',
    'v_image_quality_stats',
    'v_kit_completeness_by_supplier',
    'v_kit_component_completeness',
    'v_kit_component_identity_health',
    'v_kit_enrichment_dashboard',
    'v_kit_ficha_pipeline_health',
    'v_kit_pipeline_health',
    'v_media_statistics'
  ];

BEGIN
  FOREACH obj IN ARRAY (
    log_tables || queue_tables || staging_tables ||
    pipeline_tables || config_tables || admin_tables ||
    monitoring_views
  ) LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = obj
        AND c.relkind IN ('r', 'v', 'm', 'p')
    ) THEN
      EXECUTE format('REVOKE SELECT ON public.%I FROM anon', obj);
      RAISE NOTICE 'REVOKE SELECT ON public.% FROM anon', obj;
    ELSE
      RAISE NOTICE 'public.% not found -- skipping', obj;
    END IF;
  END LOOP;

  RAISE NOTICE 'Done: anon SELECT revoked from internal tables and admin views.';
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'catalog_analytics'
  ) THEN
    REVOKE SELECT ON public.catalog_analytics FROM anon;
    RAISE NOTICE 'REVOKE SELECT ON public.catalog_analytics FROM anon (INSERT retained)';
  ELSE
    RAISE NOTICE 'public.catalog_analytics not found -- skipping';
  END IF;
END;
$$;

DO $$
DECLARE
  obj text;
  still_exposed text[] := ARRAY[]::text[];
  sample text[] := ARRAY[
    'eco_backfill_log_20260625',
    'asia_image_import_queue',
    'pipeline_run_log',
    'markup_configurations',
    'v_db_health_check',
    'v_kit_pipeline_health'
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
    RAISE NOTICE 'Validation OK: sample objects no longer expose SELECT to anon';
  END IF;
END;
$$;;
