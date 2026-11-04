CREATE OR REPLACE FUNCTION public.fn_stage_variant(p_batch_id uuid, p_supplier_id uuid, p_supplier_reference text, p_supplier_sku text, p_raw_data jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_staging_id UUID;
    v_hash TEXT;
BEGIN
    v_hash := md5(p_raw_data::TEXT);
    
    SELECT id INTO v_staging_id
    FROM supplier_variants_raw
    WHERE import_batch_id = p_batch_id AND supplier_sku = p_supplier_sku;
    
    IF v_staging_id IS NOT NULL THEN
        UPDATE supplier_variants_raw
        SET raw_data = p_raw_data, raw_hash = v_hash, updated_at = NOW()
        WHERE id = v_staging_id;
    ELSE
        INSERT INTO supplier_variants_raw (
            import_batch_id, supplier_id, supplier_reference, supplier_sku,
            raw_data, raw_hash, imported_at, processed, created_at, updated_at
        ) VALUES (
            p_batch_id, p_supplier_id, p_supplier_reference, p_supplier_sku,
            p_raw_data, v_hash, NOW(), FALSE, NOW(), NOW()
        )
        RETURNING id INTO v_staging_id;
    END IF;
    
    RETURN v_staging_id;
END;
$function$
