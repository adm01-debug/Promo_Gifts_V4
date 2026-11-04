-- GAP E FIX: Index dedicado em related_product_id
-- Acelera o padrão do trigger DELETE: 
--   WHERE (pr.product_id = OLD.product_id OR pr.related_product_id = OLD.product_id)
-- Antes: BitmapOr com scan no UNIQUE index (16ms)
-- Depois: Index scan direto em ambas as direções
CREATE INDEX idx_pr_related_product_id
  ON product_relationships (related_product_id)
  WHERE relationship_type = 'similar';
