
-- M9: VACUUM ANALYZE via migration (fora de transação)
-- Nota: apply_migration executa em contexto que permite VACUUM

ANALYZE public.mv_product_leaf_category;
ANALYZE public.category_ancestors;
ANALYZE public.product_category_assignments;
ANALYZE public.products;
ANALYZE analytics.mv_product_intelligence;
ANALYZE public.mv_product_intelligence;
;
