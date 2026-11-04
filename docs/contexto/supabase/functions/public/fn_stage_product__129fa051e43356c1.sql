CREATE OR REPLACE FUNCTION public.fn_stage_product(p_batch_id uuid, p_supplier_id uuid, p_supplier_reference text, p_raw_data jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_staging_id UUID;
BEGIN
  SELECT id INTO v_staging_id
    FROM supplier_products_raw
   WHERE import_batch_id = p_batch_id AND supplier_reference = p_supplier_reference;

  IF v_staging_id IS NOT NULL THEN
    UPDATE supplier_products_raw
       SET raw_data = p_raw_data, updated_at = NOW()
     WHERE id = v_staging_id;
  ELSE
    INSERT INTO supplier_products_raw (
      import_batch_id, supplier_id, supplier_reference, raw_data,
      imported_at, created_at, updated_at)
    VALUES (
      p_batch_id, p_supplier_id, p_supplier_reference, p_raw_data,
      NOW(), NOW(), NOW())
    RETURNING id INTO v_staging_id;
  END IF;

  RETURN v_staging_id;
END $function$
