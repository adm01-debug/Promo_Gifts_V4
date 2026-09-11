
-- Marcar 96 rows Só Marcas pendentes como 'skipped'
-- Critério: status=pending, imported_at < now()-1h, product_id já linkado
-- Batch não está mais running → rows são orfanadas seguras para skip
SET LOCAL app.write_source = 'admin';

UPDATE public.supplier_products_raw
SET status = 'skipped'
WHERE supplier_id = (SELECT id FROM suppliers WHERE name='Só Marcas')
  AND status = 'pending'
  AND imported_at < now() - interval '1 hour'
  AND product_id IS NOT NULL;  -- só rows com produto já linkado (seguro)
;
