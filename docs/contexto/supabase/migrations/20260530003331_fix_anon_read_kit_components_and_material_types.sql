-- FIX: product_kit_components — policy existente chama user_is_org_member()
-- que anon não tem EXECUTE. Adicionar policy pública de leitura resolve
-- via short-circuit OR (mesmo padrão que color_variations).
CREATE POLICY product_kit_components_public_read ON product_kit_components
  FOR SELECT TO anon, authenticated USING (true);

-- FIX: material_types — policy existente filtra por organization_id via auth.uid()
-- Para anon, auth.uid() = NULL → 0 rows. Adicionar leitura pública.
CREATE POLICY material_types_public_read ON material_types
  FOR SELECT TO anon, authenticated USING (true);
