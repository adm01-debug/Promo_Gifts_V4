CREATE OR REPLACE FUNCTION public.trg_update_is_thermal()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_product_id UUID;
BEGIN
    -- Determinar product_id baseado na operação
    IF TG_OP = 'DELETE' THEN
        v_product_id := OLD.product_id;
    ELSE
        v_product_id := NEW.product_id;
    END IF;
    
    -- Atualiza is_thermal no produto
    UPDATE products 
    SET is_thermal = fn_is_thermal_product(v_product_id),
        updated_at = NOW()
    WHERE id = v_product_id;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$function$
