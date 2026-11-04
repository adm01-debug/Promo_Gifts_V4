-- ============================================================
-- PONTE FRONTEND: Views que redirecionam para as tabelas reais
-- 
-- Frontend (Lovable/hook useSimilarProducts) espera:
--   product_groups + product_group_members
-- 
-- BD real usa:
--   product_similarity_groups + product_similarity_group_members
-- 
-- Solução: Views transparentes (read-only via Supabase client)
-- ============================================================

-- View 1: product_groups → product_similarity_groups
CREATE OR REPLACE VIEW product_groups AS
SELECT 
  id,
  name,
  category_id,
  material_family,
  capacity_band,
  capacity_min,
  capacity_max,
  match_criteria,
  match_source,
  is_active,
  notes,
  created_at,
  updated_at
FROM product_similarity_groups;

-- View 2: product_group_members → product_similarity_group_members
CREATE OR REPLACE VIEW product_group_members AS
SELECT
  id,
  group_id,
  product_id,
  supplier_id,
  is_reference_product,
  similarity_score,
  match_source,
  notes,
  created_at
FROM product_similarity_group_members;

-- Grants: anon e authenticated podem SELECT nas views
GRANT SELECT ON product_groups TO anon, authenticated;
GRANT SELECT ON product_group_members TO anon, authenticated;
