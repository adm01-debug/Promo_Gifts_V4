-- Melhoria 1/4 (reparo durável) — re-backfill dos falsos-pendentes (re-land SM).
-- Linhas já vinculadas ao Gold (product_id) e processadas antes (processed_at)
-- presas em 'pending' por re-enqueue espúrio. O re-land guard (já aplicado)
-- impede recorrência no momento da ingestão.
UPDATE public.supplier_products_raw
   SET status = 'processed'
 WHERE status = 'pending'
   AND product_id IS NOT NULL
   AND processed_at IS NOT NULL;;
