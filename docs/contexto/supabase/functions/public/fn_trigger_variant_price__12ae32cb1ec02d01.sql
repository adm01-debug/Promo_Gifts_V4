CREATE OR REPLACE FUNCTION public.fn_trigger_variant_price()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_product_id UUID;
    v_has_cost BOOLEAN;
    v_sale_price NUMERIC;
BEGIN
    -- Pegar o product_id da variante
    v_product_id := NEW.product_id;
    
    -- Verificar se existe custo em variant_supplier_sources
    -- (pode não existir ainda no momento do INSERT da variante)
    SELECT EXISTS(
        SELECT 1 
        FROM variant_supplier_sources 
        WHERE variant_id = NEW.id 
          AND cost_price IS NOT NULL 
          AND cost_price > 0
    ) INTO v_has_cost;
    
    -- Se já tem custo, calcular preço do produto pai
    IF v_has_cost THEN
        v_sale_price := fn_calculate_sale_price(v_product_id);
        
        IF v_sale_price IS NOT NULL THEN
            RAISE NOTICE 'Preço calculado para produto %: R$ %', v_product_id, v_sale_price;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$
