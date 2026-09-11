
UPDATE public.supplier_products_raw spr
SET images_status = 'processed'
WHERE spr.status = 'processed'
  AND spr.images_status = 'pending'
  AND spr.product_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.product_images pi
    WHERE pi.product_id = spr.product_id
  );
;
