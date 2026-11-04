CREATE OR REPLACE FUNCTION public.fn_reject_product_deactivation(p_request_id uuid, p_rejection_reason text DEFAULT 'Não aprovado'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NOT NULL AND NOT public.is_admin_or_above(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Acesso negado: requer admin+');
  END IF;

  UPDATE product_deactivation_requests SET
    status          = 'rejected',
    rejected_by     = v_uid,
    rejected_at     = now(),
    rejection_reason = p_rejection_reason,
    updated_at      = now()
  WHERE id = p_request_id AND status = 'pending'
  RETURNING id INTO p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'nao_encontrado_ou_nao_pendente');
  END IF;

  RETURN jsonb_build_object('ok', true, 'request_id', p_request_id, 'status', 'rejected');
END;
$function$
