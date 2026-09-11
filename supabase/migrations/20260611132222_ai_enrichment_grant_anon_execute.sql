
-- Grants para as funções de AI Enrichment
-- SECURITY DEFINER garante que rodam com privilégios do owner (postgres)
-- Mesmo chamadas via anon key são seguras
GRANT EXECUTE ON FUNCTION public.fn_dequeue_ai_enrichment(INTEGER, TEXT, TEXT)     TO anon, service_role;
GRANT EXECUTE ON FUNCTION public.fn_save_ai_enrichment_results(UUID,UUID,TEXT,TEXT,JSONB,TEXT,BOOLEAN,TEXT) TO anon, service_role;
GRANT EXECUTE ON FUNCTION public.fn_enqueue_ai_enrichment(TEXT, UUID, INTEGER, INTEGER) TO anon, service_role;

-- Também garantir acesso à view de monitoramento
GRANT SELECT ON public.vw_ai_enrichment_status TO anon, service_role;
;
