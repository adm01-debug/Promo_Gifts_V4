-- ============================================================
-- Correção de 3 tabelas com lockout dormante
-- RLS ativo + 0 policies = bloqueio total para todos os roles
-- Criando public_read (dados de catálogo não-sensíveis)
-- ============================================================

-- 1. product_faqs (6 registros — perguntas/respostas públicas do e-commerce)
CREATE POLICY product_faqs_public_read
  ON product_faqs
  FOR SELECT
  USING (is_active = true);

-- 2. product_packaging_compatibility (71 registros — compatibilidade embalagem)
CREATE POLICY product_packaging_compatibility_public_read
  ON product_packaging_compatibility
  FOR SELECT
  USING (true);

-- 3. product_included_packagings (0 registros — prevenção de lockout futuro)
CREATE POLICY product_included_packagings_public_read
  ON product_included_packagings
  FOR SELECT
  USING (true);
