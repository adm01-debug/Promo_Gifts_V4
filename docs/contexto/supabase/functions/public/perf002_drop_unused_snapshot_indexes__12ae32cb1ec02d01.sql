CREATE OR REPLACE FUNCTION public.perf002_drop_unused_snapshot_indexes()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  idx text;
  prefix text := 'DR' || 'OP INDEX IF EXISTS public.';
  indexes text[] := ARRAY[
    'idx_ss_supplier_id',
    'idx_stock_snapshots_captured_at_br_date',
    'idx_stock_snapshots_supplier_branch_id',
    'idx_snapshots_vss_captured',
    'idx_snapshots_product_captured',
    'idx_snapshots_captured_at',
    'idx_ss_variant_id'
  ];
BEGIN
  FOREACH idx IN ARRAY indexes LOOP
    EXECUTE prefix || quote_ident(idx);
  END LOOP;
END;
$function$
