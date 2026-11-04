-- Fix INFO: supplier_products_raw has RLS enabled but no policies
CREATE POLICY spr_all_service ON public.supplier_products_raw
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY spr_select_auth ON public.supplier_products_raw
  FOR SELECT TO authenticated USING (true);
