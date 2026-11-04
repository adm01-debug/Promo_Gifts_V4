CREATE OR REPLACE FUNCTION public.trigger_gerar_nome_variante()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_spot_supplier_id UUID := 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0';
    v_produto_nome TEXT;
    v_produto_supplier_id UUID;
BEGIN
    IF NEW.name IS NULL OR NEW.name = '' THEN
        SELECT name, supplier_id INTO v_produto_nome, v_produto_supplier_id
        FROM products WHERE id = NEW.product_id;
        
        IF v_produto_supplier_id = v_spot_supplier_id THEN
            IF NEW.color_name IS NOT NULL AND NEW.color_name != '' THEN
                NEW.name := v_produto_nome || ' - ' || NEW.color_name;
            ELSE
                NEW.name := v_produto_nome;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$
