-- Rollback: 20261108221501_rollback.sql
-- Cria view pública de quantidade mínima efetiva por produto (FT-079)
-- A lógica: product.min_order_quantity > category.min_order_quantity > 1

CREATE OR REPLACE VIEW public.vw_products_min_quantity AS
SELECT
  p.id,
  p.sku,
  p.name,
  p.category_id,
  c.name                                                       AS category_name,
  c.min_order_quantity                                         AS category_min,
  p.min_order_quantity                                         AS product_override,
  COALESCE(p.min_order_quantity, c.min_order_quantity, 1)      AS effective_min_quantity,
  CASE
    WHEN p.min_order_quantity IS NOT NULL THEN 'product_override'
    WHEN c.min_order_quantity IS NOT NULL THEN 'category_default'
    ELSE 'system_default'
  END                                                          AS min_quantity_source,
  p.sale_price,
  p.is_active
FROM  products   p
LEFT  JOIN categories c ON p.category_id = c.id
WHERE p.is_active = true;

GRANT SELECT ON public.vw_products_min_quantity TO authenticated;
