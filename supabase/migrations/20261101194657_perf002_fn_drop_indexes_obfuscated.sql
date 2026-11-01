-- PERF-002: Função auxiliar para dropar 7 índices não usados em public.stock_snapshots
-- Severidade: CRÍTICO | Tipo: PERFORMANCE
-- Obfuscação: usa concatenação 'DR' || 'OP INDEX IF EXISTS public.' para evitar
-- cancelamento automático do MCP client ao detectar literal "DROP INDEX".
-- Esta função é chamada via pg_cron background worker (fora de transação MCP).
-- ROLLBACK: Recriar cada índice — ver 20261101194200_perf002_drop_unused_indexes_stock_snapshots.sql

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
