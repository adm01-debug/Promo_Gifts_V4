-- Rollback de E041: restaura acesso anon às tabelas sensíveis removidas
-- Desfaz: remove policies authenticated-only; recria com TO anon, authenticated
DROP POLICY IF EXISTS "product_ai_content_authenticated_select" ON public.product_ai_content;
CREATE POLICY "product_ai_anon_select"
  ON public.product_ai_content FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "product_fiscal_authenticated_select" ON public.product_fiscal;
CREATE POLICY "product_fiscal_anon_select"
  ON public.product_fiscal FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "product_seo_authenticated_select" ON public.product_seo;
CREATE POLICY "product_seo_anon_select"
  ON public.product_seo FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "product_supply_authenticated_select" ON public.product_supply;
CREATE POLICY "product_supply_anon_select"
  ON public.product_supply FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "system_kill_switches_authenticated_select" ON public.system_kill_switches;
CREATE POLICY "kill_switches_read_all"
  ON public.system_kill_switches FOR SELECT TO anon, authenticated USING (true);
