CREATE OR REPLACE FUNCTION public.fn_qip_propagate_to_quote_items()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _quote_item_id uuid;
  _new_personalization_cost numeric(12,2);
BEGIN
  _quote_item_id := COALESCE(NEW.quote_item_id, OLD.quote_item_id);
  
  SELECT COALESCE(SUM(total_cost), 0) INTO _new_personalization_cost
  FROM public.quote_item_personalizations
  WHERE quote_item_id = _quote_item_id;
  
  UPDATE public.quote_items 
  SET personalization_cost = _new_personalization_cost,
      has_personalization = (_new_personalization_cost > 0),
      updated_at = now()
  WHERE id = _quote_item_id
    AND personalization_cost IS DISTINCT FROM _new_personalization_cost;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$
