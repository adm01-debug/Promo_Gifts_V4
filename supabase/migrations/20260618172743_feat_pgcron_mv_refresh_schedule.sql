
-- MELHORIA 5 (2026-06-18): pg_cron para REFRESH automático das MVs
-- Simulação: REFRESH CONCURRENTLY requer índice UNIQUE → ambas têm (confirmado)
-- Não há lock exclusivo durante CONCURRENTLY → safe para produção contínua

-- Remover jobs antigos se existirem (idempotente)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN (
  'refresh-mv-product-leaf-category',
  'refresh-analytics-mv-product-intelligence'
);

-- Job 1: REFRESH mv_product_leaf_category → 2× por dia (03:00 e 15:00 UTC)
SELECT cron.schedule(
  'refresh-mv-product-leaf-category',
  '0 3,15 * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_product_leaf_category$$
);

-- Job 2: REFRESH analytics.mv_product_intelligence → 1× por dia às 02:30 UTC
-- (precisa ser antes do leaf_category pois o intelligence usa mv_stock_velocity)
SELECT cron.schedule(
  'refresh-analytics-mv-product-intelligence',
  '30 2 * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_product_intelligence$$
);

-- Job 3: REFRESH category_ancestors quando houver mudanças (1× por dia às 01:00 UTC)
-- Recria a closure table para novas categorias adicionadas
SELECT cron.schedule(
  'refresh-category-ancestors',
  '0 1 * * *',
  $$
  TRUNCATE public.category_ancestors;
  INSERT INTO public.category_ancestors (descendant_id, ancestor_id, depth)
  WITH RECURSIVE closure(descendant_id, ancestor_id, depth) AS (
    SELECT c.id, c.parent_id, 1::smallint
    FROM categories c WHERE c.parent_id IS NOT NULL
    UNION ALL
    SELECT cl.descendant_id, c.parent_id, (cl.depth + 1)::smallint
    FROM closure cl JOIN categories c ON c.id = cl.ancestor_id
    WHERE c.parent_id IS NOT NULL AND cl.depth < 10
  )
  SELECT descendant_id, ancestor_id, depth FROM closure;
  $$
);
;
