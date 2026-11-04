CREATE OR REPLACE FUNCTION public.compute_quote_snapshot_hash(_quote_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  _hash_input text;
  _quote_data text;
  _items_data text;
  _personalizations_data text;
BEGIN
  SELECT 
    COALESCE(client_id::text, '') || '|' ||
    COALESCE(client_name, '') || '|' ||
    COALESCE(subtotal::text, '0') || '|' ||
    COALESCE(discount_percent::text, '0') || '|' ||
    COALESCE(discount_amount::text, '0') || '|' ||
    COALESCE(negotiation_markup_percent::text, '0') || '|' ||
    COALESCE(total::text, '0')
  INTO _quote_data
  FROM public.quotes
  WHERE id = _quote_id;

  -- FIX QBP-02: usa product_id + sort_order como chave estável (sem qi.id volátil)
  SELECT COALESCE(string_agg(
    COALESCE(qi.product_id::text, '') || ':' ||
    COALESCE(qi.product_sku, '') || ':' ||
    COALESCE(qi.quantity::text, '0') || ':' ||
    COALESCE(qi.unit_price::text, '0') || ':' ||
    COALESCE(qi.subtotal::text, '0'),
    '|' ORDER BY qi.sort_order, qi.product_id
  ), '') INTO _items_data
  FROM public.quote_items qi
  WHERE qi.quote_id = _quote_id;

  -- FIX QBP-02: personalizations sem qip.id
  SELECT COALESCE(string_agg(
    COALESCE(qip.technique_id::text, '') || ':' ||
    COALESCE(qip.colors_count::text, '0') || ':' ||
    COALESCE(qip.positions_count::text, '0') || ':' ||
    COALESCE(qip.total_cost::text, '0'),
    '|' ORDER BY qi.sort_order, qip.technique_id
  ), '') INTO _personalizations_data
  FROM public.quote_item_personalizations qip
  JOIN public.quote_items qi ON qi.id = qip.quote_item_id
  WHERE qi.quote_id = _quote_id;

  _hash_input := COALESCE(_quote_data, '') || '||' || 
                 COALESCE(_items_data, '') || '||' || 
                 COALESCE(_personalizations_data, '');

  RETURN encode(extensions.digest(_hash_input, 'sha1'), 'hex');
END;
$function$
