CREATE OR REPLACE FUNCTION public.fn_trigger_variant_automation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_product_id UUID;
    v_is_feminine BOOLEAN;
BEGIN
    v_product_id := NEW.product_id;
    
    -- 1. Verificar e vincular cor feminina
    IF NEW.color_name IS NOT NULL THEN
        v_is_feminine := fn_auto_link_feminino(v_product_id);
    END IF;
    
    -- 2. Tentar calcular preço (se já tiver custo)
    PERFORM fn_calculate_sale_price(v_product_id);
    
    RETURN NEW;
END;
$function$
