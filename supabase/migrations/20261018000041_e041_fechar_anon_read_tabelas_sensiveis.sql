-- E041: Fechar leitura anon em tabelas fiscais/sensíveis
-- Remove acesso de role 'anon' substituindo policy {anon,authenticated} por {authenticated}
-- Tabelas: product_ai_content, product_fiscal, product_seo, product_supply, system_kill_switches
-- Rollback: recriar policies anon com DROP/CREATE de volta para TO public ou TO anon,authenticated

-- product_ai_content
DROP POLICY IF EXISTS "product_ai_anon_select" ON public.product_ai_content;
CREATE POLICY "product_ai_content_authenticated_select"
  ON public.product_ai_content FOR SELECT TO authenticated USING (true);

-- product_fiscal
DROP POLICY IF EXISTS "product_fiscal_anon_select" ON public.product_fiscal;
CREATE POLICY "product_fiscal_authenticated_select"
  ON public.product_fiscal FOR SELECT TO authenticated USING (true);

-- product_seo
DROP POLICY IF EXISTS "product_seo_anon_select" ON public.product_seo;
CREATE POLICY "product_seo_authenticated_select"
  ON public.product_seo FOR SELECT TO authenticated USING (true);

-- product_supply
DROP POLICY IF EXISTS "product_supply_anon_select" ON public.product_supply;
CREATE POLICY "product_supply_authenticated_select"
  ON public.product_supply FOR SELECT TO authenticated USING (true);

-- system_kill_switches
DROP POLICY IF EXISTS "kill_switches_read_all" ON public.system_kill_switches;
CREATE POLICY "system_kill_switches_authenticated_select"
  ON public.system_kill_switches FOR SELECT TO authenticated USING (true);

