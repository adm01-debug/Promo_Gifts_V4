-- Migration 072: Fix cron job + fn_get_all_leaf_categories after MV moved to internal

DO $$
DECLARE
  v_job_id bigint;
  v_schedule text;
BEGIN
  SELECT jobid, schedule
  INTO v_job_id, v_schedule
  FROM cron.job
  WHERE jobname = 'refresh-mv-product-leaf-category';

  IF NOT FOUND THEN
    PERFORM cron.schedule(
      'refresh-mv-product-leaf-category',
      '37 */4 * * *',
      $cmd$SELECT public.fn_cron_safe_run(0::bigint, 'REFRESH MATERIALIZED VIEW CONCURRENTLY internal.mv_product_leaf_category;', 55000, 'mv-leaf-category');$cmd$
    );
    RAISE NOTICE '[072] Created new cron job for internal.mv_product_leaf_category';
    RETURN;
  END IF;

  PERFORM cron.unschedule(v_job_id);

  PERFORM cron.schedule(
    'refresh-mv-product-leaf-category',
    v_schedule,
    $cmd$SELECT public.fn_cron_safe_run(0::bigint, 'REFRESH MATERIALIZED VIEW CONCURRENTLY internal.mv_product_leaf_category;', 55000, 'mv-leaf-category');$cmd$
  );

  RAISE NOTICE '[072] Retargeted cron job refresh-mv-product-leaf-category → internal.mv_product_leaf_category (schedule: %)', v_schedule;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_all_leaf_categories()
RETURNS TABLE(
  product_id            uuid,
  leaf_category_id      uuid,
  leaf_category_name    text,
  leaf_category_level   integer,
  leaf_category_parent_id uuid,
  leaf_category_slug    text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'internal'
AS $$
  SELECT
    product_id,
    leaf_category_id,
    leaf_category_name,
    leaf_category_level,
    leaf_category_parent_id,
    leaf_category_slug
  FROM internal.mv_product_leaf_category;
$$;

DO $$
DECLARE
  v_cron_cmd  text;
  v_fn_src    text;
BEGIN
  SELECT command INTO v_cron_cmd
  FROM cron.job
  WHERE jobname = 'refresh-mv-product-leaf-category';

  IF v_cron_cmd LIKE '%internal.mv_product_leaf_category%' THEN
    RAISE NOTICE '[072] ✓ cron job references internal.mv_product_leaf_category';
  ELSE
    RAISE WARNING '[072] ✗ cron job command unexpected: %', v_cron_cmd;
  END IF;

  SELECT pg_get_functiondef(oid) INTO v_fn_src
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace AND proname = 'fn_get_all_leaf_categories';

  IF v_fn_src LIKE '%internal.mv_product_leaf_category%' THEN
    RAISE NOTICE '[072] ✓ fn_get_all_leaf_categories reads internal.mv_product_leaf_category';
  ELSE
    RAISE WARNING '[072] ✗ fn_get_all_leaf_categories body unexpected';
  END IF;

  RAISE NOTICE 'Migration 072 complete.';
END;
$$;;
