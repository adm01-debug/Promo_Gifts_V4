-- Rollback de E047 lote 1: remove policies RESTRICTIVE das 5 tabelas sensíveis
DROP POLICY IF EXISTS "rls_restrictive_product_ai_content" ON public.product_ai_content;
DROP POLICY IF EXISTS "rls_restrictive_product_fiscal" ON public.product_fiscal;
DROP POLICY IF EXISTS "rls_restrictive_product_seo" ON public.product_seo;
DROP POLICY IF EXISTS "rls_restrictive_product_supply" ON public.product_supply;
DROP POLICY IF EXISTS "rls_restrictive_system_kill_switches" ON public.system_kill_switches;
