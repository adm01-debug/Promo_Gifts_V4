CREATE OR REPLACE FUNCTION public.fn_apply_crm_callback(p_quote_id uuid, p_event_type text, p_occurred_at timestamp with time zone, p_approved_by text DEFAULT NULL::text, p_rejection_reason text DEFAULT NULL::text, p_order_id uuid DEFAULT NULL::uuid, p_order_number text DEFAULT NULL::text)
 RETURNS TABLE(affected integer, applied boolean, detail text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _rows           INTEGER;
  _current_status TEXT;
BEGIN
  -- fix_version=2026-07-10-fn-apply-state-validation ANTI-REGRESSÃO
  -- Adiciona validação de transição de estado para evitar sequências inválidas
  -- (ex: rejected→converted, expired→approved, converted→rejected, etc.)

  CASE p_event_type

    WHEN 'sent_to_client' THEN
      -- sent_to_client não muda status, só atualiza datas — sem restrição de estado
      UPDATE public.quotes
      SET last_sent_at = p_occurred_at,
          sent_at      = COALESCE(sent_at, p_occurred_at),
          updated_at   = NOW()
      WHERE id = p_quote_id;

    WHEN 'approved' THEN
      -- Só quotes em 'draft' podem ser aprovadas pelo cliente
      SELECT status INTO _current_status FROM public.quotes WHERE id = p_quote_id;
      IF _current_status IS NULL THEN
        RETURN QUERY SELECT 0, FALSE, 'quote_not_found'; RETURN;
      END IF;
      IF _current_status NOT IN ('draft') THEN
        RETURN QUERY SELECT 0, FALSE, 'invalid_transition:' || _current_status || '->approved'; RETURN;
      END IF;
      UPDATE public.quotes
      SET status                  = 'approved',
          approved_at             = p_occurred_at,
          client_response         = 'approved',
          client_response_at      = p_occurred_at,
          approved_by_client_name = COALESCE(p_approved_by, approved_by_client_name),
          updated_at              = NOW()
      WHERE id = p_quote_id;

    WHEN 'rejected' THEN
      -- Só quotes em 'draft' ou 'approved' podem ser rejeitadas
      SELECT status INTO _current_status FROM public.quotes WHERE id = p_quote_id;
      IF _current_status IS NULL THEN
        RETURN QUERY SELECT 0, FALSE, 'quote_not_found'; RETURN;
      END IF;
      IF _current_status NOT IN ('draft', 'approved') THEN
        RETURN QUERY SELECT 0, FALSE, 'invalid_transition:' || _current_status || '->rejected'; RETURN;
      END IF;
      UPDATE public.quotes
      SET status             = 'rejected',
          client_response    = 'rejected',
          client_response_at = p_occurred_at,
          client_feedback    = COALESCE(p_rejection_reason, client_feedback),
          updated_at         = NOW()
      WHERE id = p_quote_id;

    WHEN 'order_created' THEN
      -- Só quotes em 'approved' podem ser convertidas em pedido
      SELECT status INTO _current_status FROM public.quotes WHERE id = p_quote_id;
      IF _current_status IS NULL THEN
        RETURN QUERY SELECT 0, FALSE, 'quote_not_found'; RETURN;
      END IF;
      IF _current_status NOT IN ('approved') THEN
        RETURN QUERY SELECT 0, FALSE, 'invalid_transition:' || _current_status || '->converted'; RETURN;
      END IF;
      UPDATE public.quotes
      SET status                = 'converted',
          converted_at          = p_occurred_at,
          converted_to_order_id = COALESCE(p_order_id, converted_to_order_id),
          conversion_notes      = CASE
                                    WHEN p_order_number IS NOT NULL
                                    THEN 'Pedido criado no CRM: ' || p_order_number
                                    ELSE conversion_notes
                                  END,
          updated_at            = NOW()
      WHERE id = p_quote_id;

    WHEN 'expired' THEN
      -- Quotes 'converted' não podem expirar (negócio já foi fechado)
      SELECT status INTO _current_status FROM public.quotes WHERE id = p_quote_id;
      IF _current_status IS NULL THEN
        RETURN QUERY SELECT 0, FALSE, 'quote_not_found'; RETURN;
      END IF;
      IF _current_status IN ('converted') THEN
        RETURN QUERY SELECT 0, FALSE, 'invalid_transition:converted->expired'; RETURN;
      END IF;
      UPDATE public.quotes
      SET status     = 'expired',
          updated_at = NOW()
      WHERE id = p_quote_id;

    ELSE
      RETURN QUERY SELECT 0, FALSE, 'unknown_event_type: ' || COALESCE(p_event_type, 'NULL');
      RETURN;
  END CASE;

  GET DIAGNOSTICS _rows = ROW_COUNT;

  IF _rows = 0 THEN
    RETURN QUERY SELECT 0, FALSE, 'quote_not_found';
  ELSE
    RETURN QUERY SELECT _rows, TRUE, p_event_type || '_applied';
  END IF;
END;
$function$
