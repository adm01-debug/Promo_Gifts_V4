CREATE OR REPLACE FUNCTION public.fn_sync_pat_on_product_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Só age quando is_active muda
  IF NEW.is_active = OLD.is_active THEN
    RETURN NEW;
  END IF;

  IF NEW.is_active = false THEN
    -- Produto desativado: desativar todas as PATs
    UPDATE public.print_area_techniques
    SET is_active = false, updated_at = now()
    WHERE product_id = NEW.id AND is_active = true;
  END IF;
  -- Nota: NÃO reativamos PATs ao reativar produto —
  -- reativação é intencional e manual (controle de qualidade)

  RETURN NEW;
END;
$function$
