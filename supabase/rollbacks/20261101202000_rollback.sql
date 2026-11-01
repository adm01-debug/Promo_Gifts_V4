-- Rollback de 20261101202000_drop_revoke_agent_created_functions.sql
-- Recria perf002_drop_unused_snapshot_indexes e restaura EXECUTE grant em cleanup_expired_auth_sessions

-- (1) Recria perf002_drop_unused_snapshot_indexes (corpo de 20261101194657_perf002_fn_drop_indexes_obfuscated.sql)
-- ATENÇÃO: os 7 índices já foram dropados — recriar a função sem recriar os índices é inócuo
-- (a função executaria EXECUTE num objeto inexistente, o que IF EXISTS ignora).
CREATE OR REPLACE FUNCTION public.perf002_drop_unused_snapshot_indexes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- (2) Restaura EXECUTE grant em cleanup_expired_auth_sessions para authenticated
GRANT EXECUTE ON FUNCTION public.cleanup_expired_auth_sessions() TO authenticated;
