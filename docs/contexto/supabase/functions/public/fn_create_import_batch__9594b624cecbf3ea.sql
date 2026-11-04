CREATE OR REPLACE FUNCTION public.fn_create_import_batch(p_supplier_id uuid, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_batch_id UUID;
BEGIN
    INSERT INTO supplier_import_batches (
        supplier_id, notes, status, started_at, created_at,
        products_imported, products_updated, products_errors,
        variants_imported, variants_updated, variants_errors
    ) VALUES (
        p_supplier_id, p_notes, 'running', NOW(), NOW(),
        0, 0, 0, 0, 0, 0
    )
    RETURNING id INTO v_batch_id;
    
    RETURN v_batch_id;
END;
$function$
