CREATE OR REPLACE FUNCTION public.update_preferred_suppliers(p_variant_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(updated_count integer, variants_processed integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_updated INTEGER := 0;
    v_processed INTEGER := 0;
BEGIN
    -- PASSO 1: Remove is_preferred de todos os registros relevantes
    UPDATE variant_supplier_sources
    SET is_preferred = FALSE
    WHERE (p_variant_id IS NULL OR variant_id = p_variant_id)
    AND is_preferred = TRUE;
    
    -- PASSO 2: Marca o de maior estoque como preferido para cada variante
    WITH best_per_variant AS (
        SELECT DISTINCT ON (variant_id)
            id,
            variant_id
        FROM variant_supplier_sources
        WHERE (p_variant_id IS NULL OR variant_id = p_variant_id)
        AND is_active = TRUE
        AND COALESCE(removed_from_api, FALSE) = FALSE
        ORDER BY 
            variant_id,
            COALESCE(quantity, 0) DESC,
            priority ASC,
            COALESCE(cost_price, 999999) ASC
    )
    UPDATE variant_supplier_sources vss
    SET is_preferred = TRUE
    FROM best_per_variant bpv
    WHERE vss.id = bpv.id;
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    -- Contar variantes processadas
    SELECT COUNT(DISTINCT variant_id)::INTEGER INTO v_processed
    FROM variant_supplier_sources
    WHERE (p_variant_id IS NULL OR variant_id = p_variant_id)
    AND is_active = TRUE
    AND COALESCE(removed_from_api, FALSE) = FALSE;
    
    RETURN QUERY SELECT v_updated, v_processed;
END;
$function$
