-- Rollback de 20261118172500_security_invoker_views_p06_parcial.sql.
-- Devolve as 5 views ao comportamento anterior (security_invoker=false, isto é, a view roda
-- com os privilégios do dono e ignora a RLS das tabelas de base).
-- ATENÇÃO: isto REABRE o desvio de segurança A-V01. Aplicar só se a mudança quebrar leitura
-- em produção.

ALTER VIEW public.v_kit_component_media_public RESET (security_invoker);
ALTER VIEW public.v_product_compositions_public RESET (security_invoker);
ALTER VIEW public.v_product_tags_public RESET (security_invoker);
ALTER VIEW public.v_suppliers_public RESET (security_invoker);
ALTER VIEW public.v_tabela_preco_gravacao_oficial_public RESET (security_invoker);
