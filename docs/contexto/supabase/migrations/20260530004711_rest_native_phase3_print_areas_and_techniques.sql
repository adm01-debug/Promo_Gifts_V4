-- ============================================================
-- FASE 3: Print areas, técnicas, ramos — acesso público seguro
-- ============================================================

-- 1) VIEW segura para print_area_techniques (oculta unit_cost e notes)
CREATE OR REPLACE VIEW v_print_area_techniques_public AS
SELECT 
  id, product_id, tabela_preco_id, location_code, location_name,
  max_width, max_height, is_curved, shape,
  technique_order, location_order, is_active,
  created_at, updated_at
FROM print_area_techniques;

COMMENT ON VIEW v_print_area_techniques_public IS 
  'View pública de print_area_techniques — oculta unit_cost e notes internos.';

ALTER VIEW v_print_area_techniques_public SET (security_invoker = false);
GRANT SELECT ON v_print_area_techniques_public TO anon;
GRANT SELECT ON v_print_area_techniques_public TO authenticated;

-- 2) tecnicas_gravacao: leitura pública (16 rows, catálogo de técnicas)
CREATE POLICY tecnicas_gravacao_public_read ON tecnicas_gravacao
  FOR SELECT TO anon, authenticated USING (true);

-- 3) tabela_preco_gravacao_oficial_faixa: leitura pública (884 faixas de preço)
CREATE POLICY tabela_preco_gravacao_oficial_faixa_public_read 
  ON tabela_preco_gravacao_oficial_faixa
  FOR SELECT TO anon, authenticated USING (true);

-- 4) ramo_atividade: leitura pública (22 rows, dados de referência)
CREATE POLICY ramo_atividade_public_read ON ramo_atividade
  FOR SELECT TO anon, authenticated USING (true);
