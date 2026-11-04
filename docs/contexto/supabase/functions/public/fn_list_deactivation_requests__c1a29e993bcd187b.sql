CREATE OR REPLACE FUNCTION public.fn_list_deactivation_requests(p_status text DEFAULT 'pending'::text, p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_limit  int := GREATEST(1, LEAST(COALESCE(p_limit, 50), 5000));
BEGIN
  SELECT jsonb_agg(row)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id',                r.id,
      'product_id',        r.product_id,
      'supplier_reference', r.supplier_reference,
      'product_name',      r.product_name,
      'reason',            r.reason,
      'reason_code',       r.reason_code,
      'requested_by',      r.requested_by_name,
      'requested_at',      r.requested_at,
      'status',            r.status,
      'approved_by',       r.approved_by_name,
      'approved_at',       r.approved_at,
      'rejected_by',       r.rejected_by,
      'rejected_at',       r.rejected_at,
      'rejection_reason',  r.rejection_reason,
      'executed_at',       r.executed_at,
      'notes',             r.notes
    ) AS row
    FROM product_deactivation_requests r
    WHERE (p_status = 'all' OR r.status = p_status)
    ORDER BY r.requested_at DESC
    LIMIT v_limit
  ) sub;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$
