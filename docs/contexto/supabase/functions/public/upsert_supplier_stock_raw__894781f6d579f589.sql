CREATE OR REPLACE FUNCTION public.upsert_supplier_stock_raw(p_supplier_id uuid, p_supplier_reference text, p_stock_data jsonb, p_import_batch_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_id uuid; v_hash text;
BEGIN
  v_hash := encode(digest(p_stock_data::text,'sha256'),'hex');
  INSERT INTO supplier_products_raw
    (supplier_id, supplier_reference, supplier_sku, raw_data,
     stock_data, stock_hash, stock_synced_at, status, import_batch_id)
  VALUES
    (p_supplier_id, p_supplier_reference, p_supplier_reference, '{}'::jsonb,
     p_stock_data, v_hash, now(), 'skipped'::supplier_raw_status, p_import_batch_id)
  ON CONFLICT (supplier_id, supplier_reference) DO UPDATE SET
     stock_data      = EXCLUDED.stock_data,
     stock_hash      = v_hash,
     stock_synced_at = now(),
     import_batch_id = COALESCE(EXCLUDED.import_batch_id, supplier_products_raw.import_batch_id),
     stock_status    = CASE WHEN supplier_products_raw.stock_hash IS DISTINCT FROM v_hash
                            THEN 'pending'::supplier_raw_status ELSE supplier_products_raw.stock_status END,
     updated_at      = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END $function$
