-- ============================================================
-- FASE 2a: VIEW segura para suppliers (oculta dados sensíveis)
-- ============================================================
CREATE OR REPLACE VIEW v_suppliers_public AS
SELECT 
  id,
  name,
  code,
  trading_name,
  logo_url,
  website,
  active,
  is_product_supplier,
  is_engraving_supplier,
  state_uf
FROM suppliers;

COMMENT ON VIEW v_suppliers_public IS 'View pública de suppliers — oculta api_credentials, markup%, cnpj, notes e outros dados sensíveis. Usada pelo REST nativo no frontend.';

-- RLS na VIEW: permite leitura pública
ALTER VIEW v_suppliers_public SET (security_invoker = true);

-- ============================================================
-- FASE 2c: RLS policies para tabelas faltantes
-- ============================================================

-- color_variations: leitura pública (80 rows, dados de UI: hex, nome, slug)
CREATE POLICY color_variations_public_read ON color_variations
  FOR SELECT TO anon, authenticated USING (true);

-- product_materials: leitura pública (9645 rows, apenas FKs product_id + material_id)
CREATE POLICY product_materials_public_read ON product_materials
  FOR SELECT TO anon, authenticated USING (true);

-- suppliers: garantir que a VIEW funciona via anon 
-- (a VIEW usa security_invoker, então precisa que o role tenha acesso à tabela base)
-- A policy existente suppliers_authenticated_read já cobre authenticated.
-- Precisamos de uma policy pra anon LIMITADA à VIEW (a VIEW já filtra colunas).
-- Porém, RLS não distingue acesso via VIEW vs direto. 
-- Solução: NÃO dar acesso anon direto à tabela suppliers.
-- Em vez disso, criamos a VIEW com SECURITY DEFINER para que rode como owner.
