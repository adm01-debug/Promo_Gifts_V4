-- Rollback: 20261115130100_fn_market_intelligence_macro.sql
-- Remove a RPC agregada da inteligencia de mercado macro. Nenhum dado e alterado.
-- Antes deste rollback, reverta o front (useMarketIntelligenceMacro volta a ler stock_daily_summary
-- via dbInvoke); sem isso o grafico entra em estado de erro (RPC inexistente, PGRST202).

DROP FUNCTION IF EXISTS public.fn_market_intelligence_macro(integer, uuid);
