CREATE OR REPLACE FUNCTION public.fn_sync_product_images_on_product_deactivate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Quando produto passa de ativo para inativo: desativar todas as suas imagens
  IF OLD.is_active = true AND NEW.is_active = false THEN
    UPDATE product_images
    SET is_active  = false,
        updated_at = NOW()
    WHERE product_id = NEW.id
      AND is_active  = true;
  END IF;
  RETURN NEW;
END;
$function$
