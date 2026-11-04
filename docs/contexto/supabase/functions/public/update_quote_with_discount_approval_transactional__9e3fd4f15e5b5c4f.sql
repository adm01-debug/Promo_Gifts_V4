CREATE OR REPLACE FUNCTION public.update_quote_with_discount_approval_transactional(_quote_id uuid, _quote_patch jsonb, _items jsonb, _expected_version integer DEFAULT NULL::integer, _seller_notes text DEFAULT NULL::text)
 RETURNS quotes
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _saved public.quotes;
BEGIN
  _saved := public.update_quote_transactional(
    _quote_id, _quote_patch, _items, _expected_version
  );
  PERFORM public.request_discount_approval_transactional(_saved.id, _seller_notes);
  SELECT * INTO STRICT _saved FROM public.quotes WHERE id = _saved.id;
  RETURN _saved;
END;
$function$
