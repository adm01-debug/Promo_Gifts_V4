CREATE OR REPLACE FUNCTION public.fn_propagar_atualizacao_cor()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Só propaga se nome ou hex mudou
    IF OLD.name IS DISTINCT FROM NEW.name OR OLD.hex_code IS DISTINCT FROM NEW.hex_code THEN
        UPDATE product_variants
        SET 
            color_name = NEW.name,
            color_hex = NEW.hex_code,
            updated_at = now()
        WHERE color_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$function$
