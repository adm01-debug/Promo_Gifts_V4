-- Rollback: 20261027195959_supplier_stricker_rls_deny_all.sql
-- Remove somente a policy deny_all criada pela migration e desabilita RLS
-- nas tabelas Stricker que ela protege.

DO $rollback$
DECLARE
  _table text;
  _tables constant text[] := ARRAY[
    'canceled_products',
    'category_mappings',
    'colors',
    'stg_colors',
    'customization_options',
    'customization_tables',
    'stg_customizations',
    'stg_images',
    'optionals',
    'stg_product_types',
    'product_types',
    'products',
    'stg_optionals',
    'stg_products',
    'stg_stock',
    'stocks',
    'sync_log'
  ];
BEGIN
  FOREACH _table IN ARRAY _tables LOOP
    IF to_regclass(format('%I.%I', 'supplier_stricker', _table)) IS NOT NULL THEN
      EXECUTE format(
        'DROP POLICY IF EXISTS deny_all ON supplier_stricker.%I',
        _table
      );
      EXECUTE format(
        'ALTER TABLE supplier_stricker.%I DISABLE ROW LEVEL SECURITY',
        _table
      );
    END IF;
  END LOOP;
END;
$rollback$;
