CREATE OR REPLACE FUNCTION public.create_quote_with_discount_approval_transactional(_quote jsonb, _items jsonb, _seller_notes text DEFAULT NULL::text)
 RETURNS quotes
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _saved public.quotes;
BEGIN
  _saved := public.create_quote_transactional(_quote, _items);
  PERFORM public.request_discount_approval_transactional(_saved.id, _seller_notes);
  SELECT * INTO STRICT _saved FROM public.quotes WHERE id = _saved.id;
  RETURN _saved;
END;
$function$
