CREATE OR REPLACE FUNCTION public.fn_auto_set_same_supplier()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_product_supplier_id UUID;
    v_packaging_supplier_id UUID;
BEGIN
    -- Buscar supplier_id do produto
    SELECT supplier_id INTO v_product_supplier_id
    FROM products WHERE id = NEW.product_id;
    
    -- Buscar supplier_id da embalagem
    SELECT supplier_id INTO v_packaging_supplier_id
    FROM products WHERE id = NEW.packaging_id;
    
    -- Definir is_same_supplier automaticamente
    -- Só é TRUE se ambos têm supplier_id e são iguais
    NEW.is_same_supplier := (
        v_product_supplier_id IS NOT NULL 
        AND v_packaging_supplier_id IS NOT NULL 
        AND v_product_supplier_id = v_packaging_supplier_id
    );
    
    RETURN NEW;
END;
$function$
