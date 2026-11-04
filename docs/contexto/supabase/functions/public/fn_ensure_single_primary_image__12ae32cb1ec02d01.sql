CREATE OR REPLACE FUNCTION public.fn_ensure_single_primary_image()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.is_primary = true THEN
        -- Desmarcar outras imagens primary do mesmo produto
        UPDATE product_images 
        SET is_primary = false, updated_at = NOW()
        WHERE product_id = NEW.product_id 
          AND id != NEW.id 
          AND is_primary = true;
    END IF;
    RETURN NEW;
END;
$function$
