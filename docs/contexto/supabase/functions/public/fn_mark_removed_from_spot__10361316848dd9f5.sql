CREATE OR REPLACE FUNCTION public.fn_mark_removed_from_spot(p_current_skus text[])
 RETURNS TABLE(marked_as_removed integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_marked INTEGER;
    v_supplier_id UUID;
BEGIN
    -- Buscar supplier_id da SPOT
    SELECT id INTO v_supplier_id
    FROM suppliers 
    WHERE code = 'STRICKER' OR code = 'SPOT' 
    LIMIT 1;
    
    -- Marcar como removidos os SKUs que não estão mais na API
    UPDATE variant_supplier_sources
    SET 
        removed_from_api = true,
        removed_at = NOW(),
        sync_status = 'removed',
        updated_at = NOW()
    WHERE supplier_id = v_supplier_id
      AND supplier_sku != ALL(p_current_skus)
      AND removed_from_api = false;
    
    GET DIAGNOSTICS v_marked = ROW_COUNT;
    
    RETURN QUERY SELECT v_marked;
END;
$function$
