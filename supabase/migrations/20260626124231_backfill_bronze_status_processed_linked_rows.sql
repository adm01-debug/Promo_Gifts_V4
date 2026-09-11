-- Melhoria 1/4 — Backfill único: linhas Bronze já vinculadas ao Gold e
-- processadas anteriormente, porém presas em status='pending' devido aos
-- pipelines XBZ/Só Marcas. Dry-run confirmou: 0 inserts no histórico, 0
-- churn no Silver, 12.201 linhas afetadas, restando 98 pendentes legítimos.
UPDATE public.supplier_products_raw
   SET status = 'processed'
 WHERE status = 'pending'
   AND product_id IS NOT NULL
   AND processed_at IS NOT NULL;;
