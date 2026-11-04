CREATE OR REPLACE FUNCTION public.insert_supplier_product_raw(p_supplier_id uuid, p_supplier_reference text, p_raw_data jsonb, p_import_batch_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_id           UUID;
    v_supplier_sku TEXT;
BEGIN
    -- Auto-extrair supplier_sku: raw_data.'Sku' > raw_data.'sku' > supplier_reference
    v_supplier_sku := COALESCE(
        NULLIF(p_raw_data->>'Sku', ''),
        NULLIF(p_raw_data->>'sku', ''),
        NULLIF(p_supplier_reference, '')
    );

    INSERT INTO supplier_products_raw (
        id, supplier_id, supplier_reference, supplier_sku, raw_data, import_batch_id,
        imported_at, created_at, updated_at)
    VALUES (
        gen_random_uuid(), p_supplier_id, p_supplier_reference, v_supplier_sku,
        p_raw_data, p_import_batch_id, NOW(), NOW(), NOW())
    ON CONFLICT (supplier_id, supplier_reference) DO UPDATE SET
        raw_data        = EXCLUDED.raw_data,
        supplier_sku    = EXCLUDED.supplier_sku,
        import_batch_id = EXCLUDED.import_batch_id,
        imported_at     = NOW(),
        status          = CASE
                            WHEN supplier_products_raw.content_hash IS DISTINCT FROM EXCLUDED.content_hash
                            THEN 'pending'::supplier_raw_status
                            ELSE supplier_products_raw.status
                          END,
        updated_at      = NOW()
    RETURNING id INTO v_id;
    RETURN v_id;
END $function$
