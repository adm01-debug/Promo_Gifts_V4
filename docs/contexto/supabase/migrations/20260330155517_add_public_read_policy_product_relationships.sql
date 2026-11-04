-- Policy pública de leitura em product_relationships
-- Padrão idêntico a: products, product_variants, suppliers, categories
-- Dados não-sensíveis: apenas UUIDs de produtos + tipo de relacionamento
-- Escrita continua protegida por user_belongs_to_org (INSERT/UPDATE/DELETE mantidos)
CREATE POLICY product_relationships_public_read
  ON product_relationships
  FOR SELECT
  USING (true);
