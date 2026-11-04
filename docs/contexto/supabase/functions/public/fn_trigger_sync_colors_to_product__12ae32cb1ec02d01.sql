CREATE OR REPLACE FUNCTION public.fn_trigger_sync_colors_to_product()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_product_id UUID;
BEGIN
    -- Determinar qual product_id foi afetado
    IF TG_OP = 'DELETE' THEN
        v_product_id := OLD.product_id;
    ELSE
        v_product_id := NEW.product_id;
    END IF;
    
    -- Sincronizar cores do produto
    IF v_product_id IS NOT NULL THEN
        PERFORM fn_sync_product_colors_from_variants(v_product_id);
    END IF;
    
    -- Para UPDATE que muda de produto (raro mas possível)
    IF TG_OP = 'UPDATE' AND OLD.product_id != NEW.product_id THEN
        PERFORM fn_sync_product_colors_from_variants(OLD.product_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$
