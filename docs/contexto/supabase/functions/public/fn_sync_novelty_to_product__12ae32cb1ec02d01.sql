CREATE OR REPLACE FUNCTION public.fn_sync_novelty_to_product()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Quando is_active muda em product_novelties, atualizar products.is_new
    
    IF TG_OP = 'UPDATE' THEN
        -- Se is_active mudou de TRUE para FALSE
        IF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
            UPDATE products 
            SET is_new = FALSE 
            WHERE id = NEW.product_id;
        END IF;
        
        -- Se is_active mudou de FALSE para TRUE (reativar)
        IF OLD.is_active = FALSE AND NEW.is_active = TRUE THEN
            UPDATE products 
            SET is_new = TRUE 
            WHERE id = NEW.product_id;
        END IF;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        -- Se deletar o registro de novidade, produto deixa de ser novo
        UPDATE products 
        SET is_new = FALSE 
        WHERE id = OLD.product_id;
    END IF;
    
    IF TG_OP = 'INSERT' THEN
        -- Se inserir novo registro de novidade, produto vira novo
        UPDATE products 
        SET is_new = TRUE 
        WHERE id = NEW.product_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$
