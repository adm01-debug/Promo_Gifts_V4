-- Rollback: 20261118223000_fn_supplier_risk_breakdown.sql
-- Remove a RPC de breakdown de risco por fornecedor. Nenhum dado e alterado: a funcao so LE
-- public.mv_stock_rupture_alert, nao cria tabela, indice, grant em outro objeto nem job de cron.
--
-- Efeito no negocio antes de reverter: em /estoque (RupturePanelEma) o selo de "% em risco" ao lado do
-- nome do fornecedor volta a sumir, porque useSupplierRiskBreakdown passa a receber PGRST202 e o
-- componente descarta o error — o painel continua funcionando, so perde o selo, que e exatamente o
-- estado anterior a esta migration. Nenhuma outra tela consome esta funcao.
--
-- Idempotente: DROP ... IF EXISTS, e a assinatura (boolean) e a unica criada pela migration.
-- O DROP leva junto o COMMENT e os GRANT/REVOKE da propria funcao.

DROP FUNCTION IF EXISTS public.fn_supplier_risk_breakdown(boolean);
