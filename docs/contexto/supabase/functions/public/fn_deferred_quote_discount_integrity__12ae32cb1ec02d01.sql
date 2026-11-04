CREATE OR REPLACE FUNCTION public.fn_deferred_quote_discount_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _old_quote_id uuid;
  _new_quote_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'quotes' THEN
    PERFORM public.assert_quote_discount_integrity(COALESCE(NEW.id, OLD.id));
    RETURN NULL;
  END IF;

  IF TG_TABLE_NAME = 'quote_items' THEN
    IF TG_OP <> 'INSERT' THEN _old_quote_id := OLD.quote_id; END IF;
    IF TG_OP <> 'DELETE' THEN _new_quote_id := NEW.quote_id; END IF;
  ELSE
    IF TG_OP <> 'INSERT' THEN
      SELECT qi.quote_id INTO _old_quote_id
      FROM public.quote_items qi WHERE qi.id = OLD.quote_item_id;
    END IF;
    IF TG_OP <> 'DELETE' THEN
      SELECT qi.quote_id INTO _new_quote_id
      FROM public.quote_items qi WHERE qi.id = NEW.quote_item_id;
    END IF;
  END IF;

  IF _old_quote_id IS NOT NULL THEN
    PERFORM public.assert_quote_discount_integrity(_old_quote_id);
  END IF;
  IF _new_quote_id IS NOT NULL AND _new_quote_id IS DISTINCT FROM _old_quote_id THEN
    PERFORM public.assert_quote_discount_integrity(_new_quote_id);
  END IF;
  RETURN NULL;
END;
$function$
