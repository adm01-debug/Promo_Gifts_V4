CREATE OR REPLACE FUNCTION public.get_supplier_reliability_history(_supplier_id uuid, _limit integer DEFAULT 200)
 RETURNS TABLE(id uuid, source_id uuid, variant_id uuid, slot smallint, promised_date date, promised_quantity integer, resolution text, actual_date date, actual_quantity integer, delay_days integer, fulfillment_ratio numeric, resolved_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id, source_id, variant_id, slot,
    promised_date, promised_quantity, resolution,
    actual_date, actual_quantity, delay_days, fulfillment_ratio,
    resolved_at, created_at
  FROM public.supplier_replenishment_events
  WHERE supplier_id = _supplier_id
    AND resolution IN ('fulfilled','expired')
    AND promised_date >= (current_date - 365)
  ORDER BY promised_date DESC
  LIMIT _limit;
$function$
