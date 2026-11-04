CREATE OR REPLACE FUNCTION public.fn_validate_packaging_type_on_compat()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE 
    v_type VARCHAR(20);
    v_name VARCHAR(200);
BEGIN
    -- Buscar tipo do produto referenciado como embalagem
    SELECT product_type, name INTO v_type, v_name
    FROM products 
    WHERE id = NEW.packaging_id;
    
    IF v_type IS NULL THEN
        RAISE EXCEPTION 'packaging_id (%) não encontrado em products', NEW.packaging_id;
    END IF;
    
    IF v_type != 'packaging' THEN
        RAISE EXCEPTION 'O produto "%" tem product_type=%, deve ser "packaging"', v_name, v_type;
    END IF;
    
    RETURN NEW;
END;
$function$
