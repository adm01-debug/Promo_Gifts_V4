-- ============================================================
-- Policies públicas de leitura para tabelas de catálogo
-- Padrão idêntico a: products, product_variants, suppliers, categories
-- Dados não-sensíveis: apenas UUIDs, nomes, classificações de catálogo
-- Escrita continua protegida pelas policies org existentes
-- ============================================================

-- 1. product_tags (23.449 registros — liga produto → tag)
CREATE POLICY product_tags_public_read
  ON product_tags
  FOR SELECT
  USING (true);

-- 2. tags (tabela-pai — nomes das tags: "Premium", "Sustentável", etc.)
CREATE POLICY tags_public_read
  ON tags
  FOR SELECT
  USING (true);

-- 3. product_category_assignments (20.647 registros — liga produto → categoria)
CREATE POLICY product_category_assignments_public_read
  ON product_category_assignments
  FOR SELECT
  USING (true);

-- 4. product_kit_components (3.424 registros — composição de kits)
CREATE POLICY product_kit_components_public_read
  ON product_kit_components
  FOR SELECT
  USING (true);
