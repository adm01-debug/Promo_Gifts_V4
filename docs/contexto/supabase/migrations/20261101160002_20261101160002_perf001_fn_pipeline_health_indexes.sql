CREATE INDEX IF NOT EXISTS idx_spr_status_pending
  ON public.supplier_products_raw (supplier_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_spr_status_failed_quarantined
  ON public.supplier_products_raw (supplier_id)
  WHERE status IN ('failed', 'quarantined');

CREATE INDEX IF NOT EXISTS idx_spr_images_status_pending
  ON public.supplier_products_raw (id)
  WHERE images_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_spr_stock_status_pending
  ON public.supplier_products_raw (id)
  WHERE stock_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_spr_site_status_failed
  ON public.supplier_products_raw (id)
  WHERE site_status = 'failed';

CREATE INDEX IF NOT EXISTS idx_spr_site_status_pending
  ON public.supplier_products_raw (id)
  WHERE site_status = 'pending';
