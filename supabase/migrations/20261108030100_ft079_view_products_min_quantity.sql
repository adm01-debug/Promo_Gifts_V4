-- Rollback: supabase/rollbacks/20261108030100_rollback.sql
-- FT-079: Versionar view vw_products_min_quantity
-- Objeto JÁ EXISTE em produção (confirmado via pg_get_viewdef 2026-11-08).
-- Aplicação idempotente via CREATE OR REPLACE — risco zero, sem mudança de estrutura.
-- Front: versioning-only. Validação de min_quantity no Kit Builder será item FT-079-FRONT.

CREATE OR REPLACE VIEW public.vw_products_min_quantity AS
 SELECT p.id,
    p.sku,
    p.name,
    p.category_id,
    c.name AS category_name,
    c.min_order_quantity AS category_min,
    p.min_order_quantity AS product_override,
    COALESCE(p.min_order_quantity, c.min_order_quantity, 1) AS effective_min_quantity,
        CASE
            WHEN p.min_order_quantity IS NOT NULL THEN 'product_override'::text
            WHEN c.min_order_quantity IS NOT NULL THEN 'category_default'::text
            ELSE 'system_default'::text
        END AS min_quantity_source,
    p.sale_price,
    p.is_active
   FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
  WHERE p.is_active = true;
