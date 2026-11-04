CREATE OR REPLACE FUNCTION public.fn_cleanup_ai_queue_on_product_deactivate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Se produto foi desativado ou deletado, remover da fila pending/processing/error
  -- 'processing' incluído: worker vai tentar salvar em produto inativo (waste),
  --   mas fn_save não verifica is_active — melhor cancelar proativamente
  IF (NEW.is_active = false OR NEW.is_deleted = true)
     AND (OLD.is_active = true AND OLD.is_deleted = false) THEN
    DELETE FROM ai_enrichment_queue
    WHERE product_id = NEW.id
      AND status IN ('pending', 'processing', 'error');
  END IF;
  RETURN NEW;
END;
$function$
