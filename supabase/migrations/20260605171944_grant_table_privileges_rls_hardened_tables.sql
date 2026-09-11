
-- GRANTs de nivel de tabela para tabelas endurecidas (idempotente).
-- Apenas ADITIVO: nada e revogado.
GRANT ALL ON TABLE public.mcp_sessions TO service_role;
GRANT SELECT ON TABLE public.produtos_padronizacao TO authenticated;
GRANT ALL    ON TABLE public.produtos_padronizacao TO service_role;
GRANT SELECT ON TABLE public.product_physical TO authenticated;
GRANT ALL    ON TABLE public.product_physical TO service_role;
GRANT SELECT ON TABLE public.supplier_price_tiers TO authenticated;
GRANT ALL    ON TABLE public.supplier_price_tiers TO service_role;
;
