CREATE OR REPLACE FUNCTION public.fn_sync_vss_to_variant()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_variant_id UUID;
    v_total_qty INTEGER;
    v_total_reserved INTEGER;
BEGIN
    -- Determinar variant_id afetado
    IF TG_OP = 'DELETE' THEN
        v_variant_id := OLD.variant_id;
    ELSE
        v_variant_id := NEW.variant_id;
    END IF;
    
    -- Pular se variant_id é NULL
    IF v_variant_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Agregar estoque de todos os fornecedores ATIVOS para esta variante
    SELECT 
        COALESCE(SUM(quantity), 0),
        COALESCE(SUM(reserved_quantity), 0)
    INTO v_total_qty, v_total_reserved
    FROM variant_supplier_sources
    WHERE variant_id = v_variant_id
      AND is_active = true;
    
    -- Atualizar product_variants
    UPDATE product_variants
    SET 
        stock_quantity = v_total_qty,
        updated_at = NOW()
    WHERE id = v_variant_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$
