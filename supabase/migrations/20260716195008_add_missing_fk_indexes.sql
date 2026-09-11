-- Migration 034: Add indexes for 6 unindexed foreign keys

-- 1) category_colors.color_group_id
CREATE INDEX IF NOT EXISTS idx_category_colors_color_group_id
  ON public.category_colors (color_group_id);

-- 2) favorite_items.product_id
CREATE INDEX IF NOT EXISTS idx_favorite_items_product_id
  ON public.favorite_items (product_id);

-- 3) product_notebook_features.feature_id
CREATE INDEX IF NOT EXISTS idx_product_notebook_features_feature_id
  ON public.product_notebook_features (feature_id);

-- 4) quotes.organization_id
CREATE INDEX IF NOT EXISTS idx_quotes_organization_id
  ON public.quotes (organization_id);

-- 5) stock_daily_summary.supplier_id
CREATE INDEX IF NOT EXISTS idx_stock_daily_summary_supplier_id
  ON public.stock_daily_summary (supplier_id);

-- 6) variation_values.variation_type_id
CREATE INDEX IF NOT EXISTS idx_variation_values_variation_type_id
  ON public.variation_values (variation_type_id);

-- ─── Validation ───────────────────────────────────────────────────────────────
DO $$
DECLARE
  expected_indexes text[] := ARRAY[
    'idx_category_colors_color_group_id',
    'idx_favorite_items_product_id',
    'idx_product_notebook_features_feature_id',
    'idx_quotes_organization_id',
    'idx_stock_daily_summary_supplier_id',
    'idx_variation_values_variation_type_id'
  ];
  idx text;
  missing text[] := ARRAY[]::text[];
  exists_flag boolean;
BEGIN
  FOREACH idx IN ARRAY expected_indexes LOOP
    SELECT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = idx
    ) INTO exists_flag;
    IF NOT exists_flag THEN
      missing := missing || idx;
    END IF;
  END LOOP;

  IF array_length(missing, 1) > 0 THEN
    RAISE WARNING 'Missing indexes after migration: %', array_to_string(missing, ', ');
  ELSE
    RAISE NOTICE '✓ All 6 FK indexes created successfully';
  END IF;

  RAISE NOTICE 'Migration 034 complete.';
END;
$$;;
