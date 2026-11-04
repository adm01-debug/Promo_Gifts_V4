CREATE OR REPLACE FUNCTION public.fn_deferred_dar_quote_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _old_quote_id uuid;
  _new_quote_id uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN _old_quote_id := OLD.quote_id; END IF;
  IF TG_OP <> 'DELETE' THEN _new_quote_id := NEW.quote_id; END IF;

  IF _old_quote_id IS NOT NULL THEN
    PERFORM public.assert_quote_discount_integrity(_old_quote_id);
  END IF;
  IF _new_quote_id IS NOT NULL AND _new_quote_id IS DISTINCT FROM _old_quote_id THEN
    PERFORM public.assert_quote_discount_integrity(_new_quote_id);
  END IF;
  RETURN NULL;
END;
$function$
