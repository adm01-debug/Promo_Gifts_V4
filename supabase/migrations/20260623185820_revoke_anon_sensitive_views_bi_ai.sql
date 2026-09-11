
-- ============================================================
-- MELHORIA 2/7: REVOKE anon em views com dados sensíveis
-- bi_quotes_summary: agrega dados comerciais (cotações/vendas)
-- ai_insights_cache: insights gerados por IA com dados internos
-- RISCO: qualquer bot/crawler sem auth acessa esses dados
-- ============================================================

REVOKE SELECT ON public.bi_quotes_summary FROM anon;
REVOKE SELECT ON public.ai_insights_cache FROM anon;

NOTIFY pgrst, 'reload schema';
;
