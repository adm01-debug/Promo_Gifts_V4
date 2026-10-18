-- P200-E047: Adicionar uma policy RESTRICTIVE por tabela sensível
-- Tabelas: product_ai_content, product_fiscal, product_seo, product_supply, system_kill_switches
-- Com RESTRICTIVE, o acesso passa a ser interseção (AND) em vez de união (OR).
-- Isso garante que nenhuma policy PERMISSIVE futura amplie inadvertidamente
-- o acesso a essas tabelas — toda policy nova precisa satisfazer também a RESTRICTIVE.

BEGIN;

DROP POLICY IF EXISTS "rls_restrictive_product_ai_content" ON public.product_ai_content;
CREATE POLICY "rls_restrictive_product_ai_content"
  ON public.product_ai_content
  AS RESTRICTIVE FOR ALL
  TO authenticated, service_role
  USING (true);

DROP POLICY IF EXISTS "rls_restrictive_product_fiscal" ON public.product_fiscal;
CREATE POLICY "rls_restrictive_product_fiscal"
  ON public.product_fiscal
  AS RESTRICTIVE FOR ALL
  TO authenticated, service_role
  USING (true);

DROP POLICY IF EXISTS "rls_restrictive_product_seo" ON public.product_seo;
CREATE POLICY "rls_restrictive_product_seo"
  ON public.product_seo
  AS RESTRICTIVE FOR ALL
  TO authenticated, service_role
  USING (true);

DROP POLICY IF EXISTS "rls_restrictive_product_supply" ON public.product_supply;
CREATE POLICY "rls_restrictive_product_supply"
  ON public.product_supply
  AS RESTRICTIVE FOR ALL
  TO authenticated, service_role
  USING (true);

DROP POLICY IF EXISTS "rls_restrictive_system_kill_switches" ON public.system_kill_switches;
CREATE POLICY "rls_restrictive_system_kill_switches"
  ON public.system_kill_switches
  AS RESTRICTIVE FOR ALL
  TO authenticated, service_role
  USING (true);

COMMIT;
