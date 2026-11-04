CREATE OR REPLACE FUNCTION public.fn_sync_variant_to_product()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_product_id UUID;
    v_total_qty INTEGER;
    v_is_stockout BOOLEAN;
BEGIN
    -- Buscar product_id da variant
    v_product_id := NEW.product_id;
    
    -- Pular se product_id é NULL
    IF v_product_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Agregar estoque de todas as variantes do produto
    SELECT 
        COALESCE(SUM(stock_quantity), 0),
        COALESCE(SUM(stock_quantity), 0) = 0
    INTO v_total_qty, v_is_stockout
    FROM product_variants
    WHERE product_id = v_product_id
      AND is_active = true;
    
    -- Atualizar products
    UPDATE products
    SET 
        stock_quantity = v_total_qty,
        is_stockout = v_is_stockout,
        last_stock_update_at = NOW(),
        updated_at = NOW()
    WHERE id = v_product_id;
    
    RETURN NEW;
END;
$function$
