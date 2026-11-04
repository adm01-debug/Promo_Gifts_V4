CREATE OR REPLACE FUNCTION public.fn_trigger_supplier_source_price()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_product_id UUID;
    v_sale_price NUMERIC;
BEGIN
    -- Só processa se o custo foi definido/alterado
    IF NEW.cost_price IS NOT NULL AND NEW.cost_price > 0 THEN
        -- Buscar product_id através da variante
        SELECT pv.product_id INTO v_product_id
        FROM product_variants pv
        WHERE pv.id = NEW.variant_id;
        
        IF v_product_id IS NOT NULL THEN
            -- Calcular preço do produto
            v_sale_price := fn_calculate_sale_price(v_product_id);
            
            IF v_sale_price IS NOT NULL THEN
                RAISE NOTICE 'Preço atualizado para produto %: R$ %', v_product_id, v_sale_price;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$
