CREATE OR REPLACE FUNCTION public.fn_finish_import_batch(p_batch_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_products_total INT;
    v_products_processed INT;
    v_products_errors INT;
    v_variants_total INT;
    v_variants_processed INT;
    v_variants_errors INT;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'processed'::supplier_raw_status), COUNT(*) FILTER (WHERE process_errors IS NOT NULL)
    INTO v_products_total, v_products_processed, v_products_errors
    FROM supplier_products_raw WHERE import_batch_id = p_batch_id;
    
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'processed'::supplier_raw_status), COUNT(*) FILTER (WHERE process_errors IS NOT NULL)
    INTO v_variants_total, v_variants_processed, v_variants_errors
    FROM supplier_variants_raw WHERE import_batch_id = p_batch_id;
    
    UPDATE supplier_import_batches SET 
        status = CASE WHEN v_products_errors > 0 OR v_variants_errors > 0 THEN 'completed_with_errors' ELSE 'completed' END,
        finished_at = NOW(),
        products_imported = v_products_processed - v_products_errors,
        products_errors = v_products_errors,
        variants_imported = v_variants_processed - v_variants_errors,
        variants_errors = v_variants_errors
    WHERE id = p_batch_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'batch_id', p_batch_id,
        'products', jsonb_build_object('total', v_products_total, 'processed', v_products_processed, 'errors', v_products_errors),
        'variants', jsonb_build_object('total', v_variants_total, 'processed', v_variants_processed, 'errors', v_variants_errors)
    );
END;
$function$
