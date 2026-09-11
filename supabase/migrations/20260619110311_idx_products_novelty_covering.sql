DROP INDEX IF EXISTS idx_products_new_active_sort;

CREATE INDEX idx_products_new_active_sort
  ON products (novelty_detected_at DESC, id ASC)
  INCLUDE (novelty_expires_at, sale_price, stock_quantity, is_stockout, primary_image_url, category_id, supplier_id)
  WHERE is_new = true;

COMMENT ON INDEX idx_products_new_active_sort IS
  'Índice cobrindo para queries de novidades ativas. '
  'Predicate: is_new=true. Include: colunas lidas por useNoveltiesWithDetails. '
  'Evita heap fetch para filtro novelty_expires_at > NOW() e filtros de qualidade.';;
