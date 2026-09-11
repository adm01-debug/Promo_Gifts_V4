
-- ================================================================
-- MELHORIA 3: REVOKE anon SELECT de tabelas backup/internas
-- ================================================================
-- _backup_stock_daily_summary_20260618 contém cost_price_open, cost_price_close
-- e dados de estoque interno (preços de custo, quantidades, datas de reabastecimento).
-- Esses dados são confidenciais e não devem ser acessíveis para anon.
-- O grant foi herdado automaticamente do Supabase DEFAULT PRIVILEGES.
-- Fix: REVOKE all grants para anon nesta tabela. Apenas service_role e
-- authenticated com RLS ou postgres podem acessar.
-- ================================================================

-- REVOKE todos os grants de anon na tabela de backup
REVOKE ALL ON public._backup_stock_daily_summary_20260618 FROM anon;

-- Verificação imediata
DO $$
DECLARE v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM information_schema.role_table_grants
  WHERE table_schema='public'
    AND table_name='_backup_stock_daily_summary_20260618'
    AND grantee='anon';
  IF v_count = 0 THEN
    RAISE NOTICE 'PASS: anon grants removed from backup table';
  ELSE
    RAISE WARNING 'FAIL: % grants still exist for anon', v_count;
  END IF;
END;
$$;
;
